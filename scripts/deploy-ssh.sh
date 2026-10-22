#!/usr/bin/env bash
# Called by Actions. SSH identity and registry credentials stay out of artifacts.
# Values expanded on the client are validated before SSH invocation.
# shellcheck disable=SC2029
set -Eeuo pipefail
umask 077
bundle=${1:?Pass the deployment bundle directory}
: "${DEPLOY_HOST:?Set the DEPLOY_HOST repository variable}"
: "${DEPLOY_USER:?Set the DEPLOY_USER repository variable}"
: "${DEPLOY_SSH_KEY:?Set the DEPLOY_SSH_KEY environment secret}"
: "${DEPLOY_KNOWN_HOSTS:?Set the DEPLOY_KNOWN_HOSTS environment secret}"
: "${GHCR_USER:?Missing registry username}"
: "${GHCR_TOKEN:?Missing registry token}"
: "${REVISION:?Missing Git revision}"
: "${DEPLOYMENT_ID:?Missing workflow run ID and attempt}"
DEPLOY_PORT=${DEPLOY_PORT:-22}
# These values become remote shell arguments; accept only simple host/user/SHA values.
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]
[[ "$DEPLOY_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]]
[[ "$DEPLOY_PORT" =~ ^[0-9]{1,5}$ ]] && (( DEPLOY_PORT >= 1 && DEPLOY_PORT <= 65535 ))
[[ "$REVISION" =~ ^[a-f0-9]{40}$ ]]
[[ "$DEPLOYMENT_ID" =~ ^[0-9]+-[0-9]+$ ]]
release_id="$REVISION-$DEPLOYMENT_ID"
[[ "$GHCR_USER" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*$ ]]

scratch=$(mktemp -d)
remote="$DEPLOY_USER@$DEPLOY_HOST"
ssh_options=(-i "$scratch/key" -p "$DEPLOY_PORT" -o BatchMode=yes -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$scratch/known_hosts" -o ConnectTimeout=15)
printf '%s\n' "$DEPLOY_SSH_KEY" > "$scratch/key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$scratch/known_hosts"
# Best effort cleanup also runs if transfer, registry login, or deployment fails.
cleanup() {
  ssh "${ssh_options[@]}" "$remote" \
    "rm -rf -- \"\$HOME/biometrics-authentication/.registry-$release_id\"; rm -f -- \"\$HOME/biometrics-release-$release_id.tar.gz\"" </dev/null || true
  rm -rf -- "$scratch"
}
trap cleanup EXIT

tar -czf "$scratch/release.tar.gz" -C "$bundle" compose.yml release.env deploy.sh
scp -q -P "$DEPLOY_PORT" -i "$scratch/key" -o BatchMode=yes -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$scratch/known_hosts" \
  "$scratch/release.tar.gz" "$remote:biometrics-release-$release_id.tar.gz"

# Use an isolated registry config, then delete it. Do not overwrite host credentials.
printf '%s\n' "$GHCR_TOKEN" | ssh "${ssh_options[@]}" "$remote" \
  "umask 077; mkdir -p \"\$HOME/biometrics-authentication/.registry-$release_id\" && docker --config \"\$HOME/biometrics-authentication/.registry-$release_id\" login ghcr.io --username '$GHCR_USER' --password-stdin"
ssh "${ssh_options[@]}" "$remote" bash -s -- "$release_id" <<'REMOTE'
set -Eeuo pipefail
umask 077
release_id=$1
root="$HOME/biometrics-authentication"
release="$root/releases/$release_id"
# Docker CLI config only; Compose also discovers system-installed CLI plugins.
export DOCKER_CONFIG="$root/.registry-$release_id"
[[ ! -e "$release" ]] || { echo "Release directory already exists." >&2; exit 1; }
mkdir -p "$release"
tar -xzf "$HOME/biometrics-release-$release_id.tar.gz" -C "$release"
DEPLOY_ROOT="$root" bash "$release/deploy.sh" "$release"
REMOTE

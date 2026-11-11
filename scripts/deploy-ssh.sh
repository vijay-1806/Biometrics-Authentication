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
registry_username=${DEPLOY_DOCKERHUB_USERNAME:-}
registry_token=${DEPLOY_DOCKERHUB_TOKEN:-}
if [[ -n "$registry_username" || -n "$registry_token" ]]; then
  if [[ ! "$registry_username" =~ ^[a-z0-9]+$ || -z "$registry_token" ]]; then
    echo "Set both DEPLOY_DOCKERHUB_USERNAME and DEPLOY_DOCKERHUB_TOKEN for private images." >&2
    exit 1
  fi
fi

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

# Public Docker Hub images need no login. Use an isolated config for private pulls.
registry_login=false
if [[ -n "$registry_username" ]]; then
  printf '%s\n' "$registry_token" | ssh "${ssh_options[@]}" "$remote" \
    "umask 077; mkdir -p \"\$HOME/biometrics-authentication/.registry-$release_id\" && docker --config \"\$HOME/biometrics-authentication/.registry-$release_id\" login --username '$registry_username' --password-stdin"
  registry_login=true
fi
ssh "${ssh_options[@]}" "$remote" bash -s -- "$release_id" "$registry_login" <<'REMOTE'
set -Eeuo pipefail
umask 077
release_id=$1
root="$HOME/biometrics-authentication"
release="$root/releases/$release_id"
if [[ "$2" == true ]]; then
  export DOCKER_CONFIG="$root/.registry-$release_id"
fi
[[ ! -e "$release" ]] || { echo "Release directory already exists." >&2; exit 1; }
mkdir -p "$release"
tar -xzf "$HOME/biometrics-release-$release_id.tar.gz" -C "$release"
DEPLOY_ROOT="$root" bash "$release/deploy.sh" "$release"
REMOTE

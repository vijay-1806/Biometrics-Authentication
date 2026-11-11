#!/usr/bin/env bash
# Run from an extracted deployment bundle. Never removes persistent volumes.
set -Eeuo pipefail
umask 077

release=$(cd -- "${1:-.}" && pwd -P)
root=${DEPLOY_ROOT:-"$HOME/biometrics-authentication"}
mkdir -p "$root"
root=$(cd -- "$root" && pwd -P)
[[ -f "$release/compose.yml" && -f "$release/release.env" ]] || {
  echo 'Missing deployment bundle files.' >&2; exit 1;
}
command -v docker >/dev/null
command -v flock >/dev/null
exec 9> "$root/deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }

# Keep instance settings outside versioned releases so updates preserve them.
if [[ ! -f "$root/config.env" ]]; then
  printf 'APP_PORT=8080\nML_PORT=8000\nJWT_SECRET=\n' > "$root/config.env"
fi
compose() {
  local bundle=$1
  shift
  docker compose --project-name biometrics-authentication \
    --env-file "$bundle/release.env" --env-file "$root/config.env" \
    -f "$bundle/compose.yml" "$@"
}

previous=''
if [[ -L "$root/current" ]]; then
  previous=$(readlink -f -- "$root/current")
  [[ -f "$previous/compose.yml" && -f "$previous/release.env" ]] || {
    echo 'Current release points to an invalid bundle; refusing deployment.' >&2; exit 1;
  }
fi
compose "$release" config --quiet
# Pull everything before changing the running containers.
compose "$release" pull

healthy() {
  compose "$release" up --no-build --detach --wait --wait-timeout 240 &&
    compose "$release" exec -T frontend wget -q -O /dev/null http://127.0.0.1:8080/api/health &&
    compose "$release" exec -T frontend wget -q -O /dev/null http://127.0.0.1:8080/bio-api/v1/system/health
}

if ! healthy; then
  echo 'Deployment failed. Capturing status and restoring the previous release.' >&2
  compose "$release" ps --all >&2 || true
  compose "$release" logs --tail 80 --no-color >&2 || true
  if [[ -n "$previous" ]]; then
    if compose "$previous" up --no-build --detach --wait --wait-timeout 240; then
      echo 'Previous release restored. The deployment is still marked failed.' >&2
    else
      echo 'ROLLBACK FAILED: inspect the server immediately.' >&2
    fi
  else
    compose "$release" stop frontend backend ml || true
    echo 'First deployment failed; data volumes have been retained.' >&2
  fi
  exit 1
fi

if [[ -n "$previous" && "$previous" != "$release" ]]; then
  ln -sfn -- "$previous" "$root/previous"
fi
ln -s -- "$release" "$root/.current-$$"
mv -Tf -- "$root/.current-$$" "$root/current"
printf 'Successfully deployed %s\n' "$(basename -- "$release")"

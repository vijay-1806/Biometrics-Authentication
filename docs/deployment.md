# Containers and continuous delivery

## One-command local startup

Run `docker compose up` from the repository root. Compose builds the current source, starts MongoDB 7, restores saved LMS records once, and installs the three trained student ML profiles. See the [README demo accounts](../README.md#saved-demo-accounts-and-models) for working logins. Use `docker compose up -d --wait` for background operation.

`DEMO_SEED=true` is enabled for the local Compose stack. The backend uses a database marker to import missing saved records once. It keeps existing accounts, changed passwords, and course edits. A saved email with a different account ID stops bootstrap rather than disconnecting courses and ML profiles. The ML bootstrap copies only missing student profiles/models and leaves existing trained models, console accounts, API keys, and encryption keys in place. Restarting preserves the saved data.

The default database uses `mongo7-data`; the previous MongoDB 8 volume `mongo-data` is retained and never opened with MongoDB 7. MongoDB 7 avoids the MongoDB 8 startup failure on Linux kernels 6.19–7.0.13. The production manifest still uses MongoDB 8 and requires a compatible host kernel.

### Explicit restoration

Automatic bootstrap normally removes the need for a manual import. To explicitly restore the archived student ML files and missing LMS records again, while the stack is running:

```bash
sudo python3 scripts/restore-saved-demo.py
```

This command backs up ML files it replaces under `ml-data/restore-backup-<timestamp>`. Existing MongoDB records remain in place. It verifies model loading, restarts ML to clear its cache, and waits for healthy services. Use `python3 scripts/restore-saved-demo.py --check` to validate inputs without changing data.

## Local source build

Run `docker compose up` from the repository root. Docker Compose v2.20+ is required. No environment file is required.

The frontend builds with Node.js 22 and runs with unprivileged Nginx on port 8080. The API runs as the Node image's unprivileged user. BioAuth runs as UID 10001 with Python 3.11 and one Uvicorn worker. MongoDB is available only inside the Compose network.

Nginx forwards `/api/` and `/socket.io/` to the API; `/bio-api/` (with the prefix removed) and `/sdk.js` go to BioAuth. All LMS browser traffic uses the app's origin, including WebSocket upgrades. The separate BioAuth console uses its own origin on localhost:8000.

## Persistent state

| Volume | Contents |
| --- | --- |
| `mongo7-data` (local) / `mongo-data` (production) | LMS users, courses, assessments, results, and activity |
| `ml-data` | Enrollment, tenants, sessions, API keys, audit data, and the encryption master key |
| `ml-models` | Trained models |
| `backend-runtime` | Automatically generated JWT signing secret |

`docker compose down` preserves this state. `docker compose down --volumes` deletes it. Back up all four volumes together, including `ml-data/.master_key`; losing the key can make encrypted values unreadable.

The build context excludes environment files, console account exports, encrypted keys, session files, and unrelated ML records. Images include the LMS demo exports and exactly three student profile/model pairs. Local Compose explicitly enables their bootstrap; the production manifest leaves `DEMO_SEED` disabled.

## GitHub Actions pipeline

The workflow runs on pushes and pull requests targeting `main` and `release/v1.2`. Publishing and deployment run only for successful `main` pushes. It has five ordered stages:

1. **Compile:** install locked frontend dependencies; compile the React production bundle and Python bytecode; syntax-check Node source and deployment scripts; validate Compose; run six tests of deployment success, pull failure, unhealthy rollout, route-health failure, first-install failure, and deployment locking.
2. **Build:** build the frontend, Node API, and Python images in parallel for `linux/amd64`. Export each as a workflow artifact.
3. **Test:** load those exact images and start the full stack with `--no-build`. Run the authentication/WebSocket/biometric smoke test, 11 existing SaaS and tenant tests, and container-recreation persistence checks. On failure, upload diagnostics.
4. **Publish:** after all tests pass, load the same artifacts and push them to GHCR. No image is rebuilt. Publish `sha-<full-commit-sha>` and moving `1.2` tags. Create a release bundle containing `compose.yml`, `release.env` with digest-pinned images, and `deploy.sh`.
5. **Deploy:** when explicitly enabled, transfer the release bundle to the server over SSH, authenticate to GHCR using the workflow token, pull images before changing the application, update Compose, check container and proxied API health, and record the active release. Failed rollouts restore the previously successful release and still fail the workflow.

PR runs stop after testing. Publishing requires `packages: write`; deployment uses `packages: read`. The default token permission is `contents: read`. Actions are pinned to commit SHAs. Image artifacts expire after two days, release bundles after 30 days, and frontend bundles/failed-test diagnostics after seven days.

The workflow can be manually dispatched when present on the default branch. Pushes to `release/v1.2` run without changing the default branch. The standalone production manifest has no build directives.

### First-run repository settings

Enable Actions and allow package writes if repository/organization policy restricts them. If GHCR package names already exist, grant this repository's Actions access. Packages may remain private for automatic deployment; the workflow token authenticates the pull. For anonymous manual pulls, set all three package visibilities to public.

Optionally require the compile, container build, and integration jobs as branch checks.

## Configure the deployment server

The implementation targets a Linux amd64 SSH server, such as an EC2 instance or VPS. No host is selected automatically and no cloud resources are provisioned.

Use a MongoDB-supported host kernel. MongoDB 8 currently refuses Linux kernels 6.19 through 7.0.13; Ubuntu 22.04 with its supported older kernel is one suitable target. CI pins `ubuntu-22.04` after the first `ubuntu-latest` run hit this startup guard. See [MongoDB 8 release notes](https://www.mongodb.com/docs/manual/release-notes/8.0/) for current kernel compatibility.

Install Docker Engine, the system Docker Compose plugin (v2.20+), Bash, tar, and `flock` (usually provided by `util-linux`). Give a dedicated deployment user Docker access. Authorize the public half of a deployment SSH key for that user. Ensure GitHub-hosted runners can reach its SSH port. The script uses `~/biometrics-authentication` as its fixed application directory.

Create a GitHub environment named `production`. Add these **environment secrets**:

| Secret | Value |
| --- | --- |
| `DEPLOY_SSH_KEY` | Private key for the deployment user, without a passphrase, in OpenSSH format |
| `DEPLOY_KNOWN_HOSTS` | Verified OpenSSH known-hosts entries for the server; custom ports use `[host]:port` |

Verify the server's key fingerprint through your trusted server console before saving known-hosts entries. The workflow enforces `StrictHostKeyChecking=yes` and does not learn or trust keys automatically.

Add these **repository variables** under Settings → Secrets and variables → Actions → Variables:

| Variable | Value |
| --- | --- |
| `DEPLOY_ENABLED` | `true` to enable deployment; absent/false skips deployment |
| `DEPLOY_HOST` | Server IPv4 address or DNS hostname |
| `DEPLOY_USER` | SSH username, for example `ubuntu` |
| `DEPLOY_PORT` | Optional SSH port; default `22` |
| `DEPLOY_URL` | Optional public HTTPS base URL; enables post-deployment HTTP checks and the environment URL |

Keep `DEPLOY_ENABLED` off until the other values are configured. The server's Docker login uses a temporary workflow token in an isolated config directory; cleanup removes it and leaves existing server credentials alone. No long-lived registry secret is needed.

Trigger deployment with the next push to `main`. The production environment records deployment status in GitHub. Optional environment protection rules can restrict deployment branches or require reviewers, but the workflow does not require approval by itself.

### Server directories and instance settings

```text
~/biometrics-authentication/
  config.env                   Persistent port/JWT configuration, mode 0600
  deploy.lock                  Prevents concurrent deployment scripts
  releases/<commit-sha>-<run-id>-<attempt>/       compose.yml, release.env, deploy.sh
  current -> releases/...      Active successful release
  previous -> releases/...     Previous successful release
```

The first run creates `config.env` with `APP_PORT=8080`, `ML_PORT=8000`, and an empty `JWT_SECRET` (the API generates a persistent key). To customize those values, create/edit that file on the server before deployment. Do not put image references in this file; the release's digest references come from the pipeline.

The fixed Compose project name `biometrics-authentication` keeps the same named volumes across release directories. Neither deployment nor rollback removes volumes. Releases are retained to support rollback; delete older unused bundles only after deciding your retention policy.

### Health checks and rollback

Deployment first pulls every required image. A pull failure leaves the running release untouched. Rollout uses Compose `--wait`, then calls both the LMS and ML readiness routes through Nginx inside the frontend container. If rollout or these route checks fail, the script captures service diagnostics and restarts the previous Compose bundle. On a failed first deployment, it stops application containers while retaining data. If rollback itself fails, the script reports that failure and exits unsuccessfully.

If configured, `DEPLOY_URL` adds public HTTP checks after the remote deployment. A failure here fails the workflow; it does not undo a locally healthy rollout, since a domain/TLS/proxy failure may be external to the containers.

The deployment is a single-server rolling replacement with brief interruptions possible, not a zero-downtime deployment. Rollback restores application images; it does not undo database writes or future schema migrations. Back up persistent state before releases that migrate it.

To restore the previous bundle manually on the server:

```bash
DEPLOY_ROOT="$HOME/biometrics-authentication" bash "$HOME/biometrics-authentication/previous/deploy.sh" "$HOME/biometrics-authentication/previous"
```

For private images, authenticate to GHCR before a manual rollback if the image layers are not already cached.

## Manual published-image deployment

A clone can still use the registry overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.registry.yml up -d --no-build --pull always --wait
```

Set `IMAGE_TAG=sha-<full-commit-sha>` in `.env` to select a revision for all three services. Private packages require `docker login ghcr.io`; public packages support anonymous pulls. This convenience command is separate from the automatic deployment bundle, which pins images by digest.

## Before public hosting

The local demo Compose ports listen on all host interfaces so devices on the same LAN can connect on ports 8080 and 8000. Set `HOST_BIND=127.0.0.1` for local-only access. Private LAN addresses require the same network and permitted firewall/device-to-device traffic.

The production manifest continues to listen on localhost. Place a TLS reverse proxy in front of a public deployment, configure access to the separate BioAuth console deliberately, and restrict administrative routes.

The application currently bootstraps demonstration BioAuth accounts and an integration key. Replace these before external use; changing only the Node JWT secret does not change them. Configure the Node server's `BEHAVIOR_API_KEY` and rebuild the frontend with its matching `VITE_BIO_API_KEY` when replacing the LMS integration key. Review the service's origin and API-key authorization policies as part of deployment.

The coding runner uses Node's `vm` module; it is not a hardened isolation boundary for hostile code. The ML service uses local JSON files and process-local locks/cache, so this deployment is a single-instance demonstration stack. A multi-worker or multi-replica deployment needs shared transactional storage and coordinated rate limiting.

See [security](security.md) and [limitations](limitations.md) for the project's existing boundaries.

## References

- [Docker Compose dependency readiness](https://docs.docker.com/compose/how-tos/startup-order/)
- [GitHub Actions: publishing container images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GHCR authentication and package visibility](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

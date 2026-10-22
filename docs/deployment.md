# Containers and continuous delivery

## Local source build

Run `docker compose up --build -d --wait` from the repository root. Docker Compose v2.20+ is required. No environment file is required.

The frontend builds with Node.js 22 and runs with unprivileged Nginx on port 8080. The API runs as the Node image's unprivileged user. BioAuth runs as UID 10001 with Python 3.11 and one Uvicorn worker. MongoDB is available only inside the Compose network.

Nginx forwards `/api/` and `/socket.io/` to the API; `/bio-api/` (with the prefix removed) and `/sdk.js` go to BioAuth. All LMS browser traffic uses the app's origin, including WebSocket upgrades. The separate BioAuth console uses its own origin on localhost:8000.

## Persistent state

| Volume | Contents |
| --- | --- |
| `mongo-data` | LMS users, courses, assessments, results, and activity |
| `ml-data` | Enrollment, tenants, sessions, API keys, audit data, and the encryption master key |
| `ml-models` | Trained models |
| `backend-runtime` | Automatically generated JWT signing secret |

`docker compose down` preserves this state. `docker compose down --volumes` deletes it. Back up all four volumes together, including `ml-data/.master_key`; losing the key can make encrypted values unreadable.

The build context excludes local environment files, dataset/model directories, and database exports. Images contain application code and dependencies, not the repository's saved user records.

## GitHub Actions

The single CI/CD workflow triggers on pushes and pull requests for `release/v1.2`. Its verification job builds and starts a fresh stack, runs HTTP and authenticated WebSocket checks, runs the existing SaaS customer/tenant tests, recreates the application containers, and verifies saved accounts and enrollment data.

All three publish jobs depend on successful verification. They use the workflow's automatically issued token with `packages: write`, and publish only on the release branch, never on pull requests. The default workflow permission is `contents: read`.

The images are tagged with the moving `1.2` tag and `sha-<full-git-sha>`. Each publish rebuilds from that same verified commit. OCI labels identify the repository and revision. The publishing architecture is `linux/amd64`.

The workflow can be manually dispatched when present on the default branch; pushing to `release/v1.2` runs it without moving this work to another branch.

### First-run repository settings

1. Enable GitHub Actions if disabled at the repository or organization level.
2. Allow the workflow to write packages if organization policy restricts it.
3. After the first successful publish, open each package under the owner's Packages page and set visibility to public for unauthenticated use. Public repository visibility does not automatically make a new GHCR package public.
4. If an image name already exists, ensure it is linked to this repository and grants this repository's Actions access.
5. Optionally make the verification job a required status check in a branch rule.

No manually supplied secrets are needed for CI and GHCR delivery.

## Deploying published images

Use the registry overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.registry.yml up -d --no-build --pull always --wait
```

Set `IMAGE_TAG=sha-<full-commit-sha>` in `.env` to select a revision for all three application services. Use the same command for an update. To roll back, select an earlier successful revision and rerun the command. MongoDB and the application volumes are retained. Data/schema compatibility must be assessed before rolling back across future database migrations.

Registry delivery does not automatically update a server. No SSH credentials, server address, cloud provider, or public domain has been configured.

## Before public hosting

The provided Compose ports listen on localhost. Place a TLS reverse proxy in front of the application, configure access to the separate BioAuth console deliberately, and restrict administrative routes.

The application currently bootstraps demonstration BioAuth accounts and an integration key. Replace these before external use; changing only the Node JWT secret does not change them. Configure the Node server's `BEHAVIOR_API_KEY` and rebuild the frontend with its matching `VITE_BIO_API_KEY` when replacing the LMS integration key. Review the service's origin and API-key authorization policies as part of deployment.

The coding runner uses Node's `vm` module; it is not a hardened isolation boundary for hostile code. The ML service uses local JSON files and process-local locks/cache, so this deployment is a single-instance demonstration stack. A multi-worker or multi-replica deployment needs shared transactional storage and coordinated rate limiting.

See [security](security.md) and [limitations](limitations.md) for the project's existing boundaries.

## References

- [Docker Compose dependency readiness](https://docs.docker.com/compose/how-tos/startup-order/)
- [GitHub Actions: publishing container images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GHCR authentication and package visibility](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

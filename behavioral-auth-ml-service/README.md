# Behavioral Identity API

A multi-tenant API and developer console for behavioral biometric enrollment,
continuous verification, and risk monitoring. Each customer works inside a
project (workspace), manages scoped API credentials, and reviews usage and
security events from the console.

## Run locally

```bash
cd behavioral-auth-ml-service/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open <http://localhost:8000> for the developer console. Create an account,
create or select a project, then use **API Library** to explore the available
capabilities and **Credentials** to create a key. API requests must use a
registered credential in the `X-API-Key` header. Keys are project-scoped and
can be granted `enroll`, `verify`, and `retrain` capabilities. The key is shown
once when created; store it securely on your server.

Interactive API documentation is available at <http://localhost:8000/docs>.
The JavaScript SDK and runnable example are available at `/sdk.js` and `/demo`.

## Main console areas

- **APIs & Services** — project activity, API status, and setup checklist.
- **API Library** — enrollment, verification, and risk capability overview.
- **Credentials** — create, inspect, reveal, revoke, and remove project keys.
- **Metrics** — traffic, enrollment, verification, and risk trends.
- **Enrollments / Verifications / Risk events** — inspect user profiles and
  decisions, with grouped alerts to reduce repeated notifications.
- **Quotas & limits** — review plan limits, key capacity, and request rate.
- **Project settings** — manage project members, allowed origins, and webhook.

Platform administrators have a separate administrative area. Public account
registration always creates a customer account; administrator privileges are
reserved for provisioned accounts.

## Behavioral identity lifecycle

1. Create a project credential with the minimum scopes needed by the service
   integration.
2. Call `POST /enroll` with a stable `user_id` and captured keyboard events.
   Profiles progress from collecting to provisional to full as samples accrue.
3. Call `POST /verify` with fresh events. The response includes trust score,
   confidence, risk level, and recommended action.
4. Review outcomes in **Verifications** and **Risk events**. Trusted traffic
   feeds adaptive retraining; `POST /users/{user_id}/retrain` can promote a
   refreshed model when enough trusted sessions are available.

Send credentials in the header, for example:

```http
X-API-Key: bio_live_YOUR_PROJECT_KEY
```

Never put production keys in browser code or URLs. Configure allowed origins
for browser-based SDK use, and rotate a key by creating its replacement,
updating the integration, then revoking the old credential.

## Model behavior and limits

- Profiles use a collecting, provisional, and full lifecycle; early profiles
  return cautious outcomes while data is limited.
- Verification uses recent scores to smooth individual noisy samples.
- Risk events remain available in the project timeline; repeated alerts for
  the same user and action are grouped during the cooldown window.
- Local development uses JSON-backed storage. Move to a shared durable store
  before running multiple service instances or handling production workloads.
- Thresholds and drift controls are starting values and should be calibrated
  against genuine and impostor traffic for the deployment.

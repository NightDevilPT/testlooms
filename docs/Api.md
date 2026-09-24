# TestLoom — API Reference & Middleware Architecture

This document is the authoritative list of every API endpoint in TestLoom, which ones require **idempotency protection**, and how **middleware** (rate limiting, auth, request logging) is applied across `app/api/`.

**Related documentation:**

- [`Architecture.md`](./Architecture.md) — system architecture & execution engine behavior
- [`DbSchema.md`](./DbSchema.md) — database schema
- [`../AGENTS.md`](../AGENTS.md) — repository rules (response envelope, service layer pattern)

---

## 1. Conventions

- All endpoints are prefixed `/api/`.
- All responses use the standard envelope defined in `AGENTS.md` §3.2 (`success`, `statusCode`, `data`, `pagination`, `meta`).
- Auth: Bearer access token in `Authorization: Bearer <token>` header, unless marked **Public**.
- Role column values: `ADMIN`, `QA_ENGINEER`, `VIEWER` — "Any" means all three authenticated roles can call it; "Public" means no auth required.
- **Idempotent?** column: `Yes (natural)` = safe by nature (e.g. `GET`, or `PATCH` that sets absolute state), `Yes (key)` = requires an `Idempotency-Key` request header, `No` = intentionally not idempotent (each call should produce a new effect), `N/A` = not applicable (real-time channel).

---

## 2. Full API Catalog

### 2.1 Authentication & Sessions

| Method | Path                    | Auth                   | Role | Idempotent?   | Status     | Notes                                                                                                                                                   |
| :----- | :---------------------- | :--------------------- | :--- | :------------ | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/auth/signup`      | Public                 | —    | Yes (key)     | ✅ Done     | **Primary.** Registers new user (`firstName`, `lastName`, `email`, `password`). Stores session in DB; issues `access_token` HTTP-only cookie.          |
| POST   | `/api/auth/login`       | Public                 | —    | Yes (natural) | ✅ Done     | **Primary.** Authenticates user (`email` + `password`). Stores session in DB; issues `access_token` HTTP-only cookie.                                  |
| POST   | `/api/auth/logout`      | Required               | Any  | Yes (natural) | ✅ Done     | **Primary.** Revokes session record in DB & clears `access_token` HTTP-only cookie.                                                                     |
| POST   | `/api/auth/logout-all`  | Required               | Any  | Yes (natural) | ✅ Done     | **Primary.** Revokes all active session records for user & clears cookies.                                                                              |
| GET    | `/api/auth/me`          | Required               | Any  | Yes (natural) | ✅ Done     | **Primary.** Returns profile of currently authenticated user (`id`, `email`, `firstName`, `lastName`, `status`).                                       |
| POST   | `/api/auth/request-otp` | Public                 | —    | No            | ⏳ Reserved | *(Future / Reserved)* Generates 6-digit OTP code for passwordless login.                                                                                |
| POST   | `/api/auth/verify-otp`  | Public                 | —    | Yes (natural) | ⏳ Reserved | *(Future / Reserved)* Verifies OTP code from `otp_verifications`.                                                                                       |
| POST   | `/api/auth/resend-otp`  | Public                 | —    | No            | ⏳ Reserved | *(Future / Reserved)* Cooldown-gated OTP re-issuance.                                                                                                   |

#### 2.1.1 Authentication & OTP Detailed Specifications

##### 1. `POST /api/auth/signup` (Password-Based Registration)
- **Headers**: `Content-Type: application/json`, `Idempotency-Key` (Optional)
- **Request Payload**:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Validation Rules**:
  - `firstName`: string, 1–50 characters.
  - `lastName`: string, 1–50 characters.
  - `email`: valid lowercased email string.
  - `password`: string, 8–100 characters, requiring at least 1 uppercase, 1 lowercase, 1 digit.
- **Execution Flow**:
  - Hashes password using `bcrypt` (salt rounds = 12).
  - Inserts `User` record into database (`status: ACTIVE`, `isEmailVerified: false`).
  - Generates Access Token JWT (12m expiration) and Refresh Token JWT (15d expiration).
  - Stores both `accessToken` and `refreshToken` JWT strings in `refresh_tokens` session table in DB.
  - Sets ONLY the `access_token` in HTTP-only, SameSite=Lax, Secure cookie (no refresh token in cookie).
- **Success Response (`HTTP 201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "user": {
        "id": "u_12345678-abcd-1234-abcd-123456789abc",
        "email": "john.doe@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "isEmailVerified": false,
        "status": "ACTIVE"
      }
    },
    "pagination": null,
    "meta": {
      "responseTimeMs": 42,
      "startedAt": "2026-09-22T21:45:00.000Z",
      "endedAt": "2026-09-22T21:45:00.042Z"
    }
  }
  ```

##### 2. `POST /api/auth/login` (Password-Based Login)
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
  ```json
  {
    "email": "john.doe@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Execution Flow**:
  - Verifies user exists and checks password hash.
  - Generates Access Token (12m) and Refresh Token (15d).
  - Stores both `accessToken` and `refreshToken` JWT strings in `refresh_tokens` DB table.
  - Sets ONLY `access_token` as HTTP-only cookie.
- **Success Response (`HTTP 200 OK`)**: Returns user profile & sets `access_token` cookie.

##### 3. `POST /api/auth/request-otp` (OTP Code Generation)
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
  ```json
  {
    "email": "john.doe@example.com",
    "purpose": "LOGIN"
  }
  ```
- **Execution Flow**:
  - Generates 6-digit numeric OTP code.
  - Hashes OTP and saves to `otp_verifications` table (`expiresAt = now + 5m`).
  - Dispatches OTP email. Rate-limited to max 5 req/hr.
- **Success Response (`HTTP 200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "message": "OTP verification code sent to email successfully.",
      "expiresInSeconds": 300
    },
    "pagination": null,
    "meta": { ... }
  }
  ```

##### 4. `POST /api/auth/verify-otp` (OTP Verification & Login)
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
  ```json
  {
    "email": "john.doe@example.com",
    "otpCode": "849201",
    "purpose": "LOGIN"
  }
  ```
- **Execution Flow**:
  - Validates active unexpired `otp_verifications` record.
  - On match, sets `verifiedAt = now`, marks `User.isEmailVerified = true`.
  - Generates Access Token & Refresh Token, stores tokens in `refresh_tokens` DB table.
  - Sets ONLY `access_token` HTTP-only cookie.
- **Success Response (`HTTP 200 OK`)**: Returns user profile & sets `access_token` cookie.

##### 5. `POST /api/auth/refresh` (In-Place Session Token Rotation)
- **Headers / Source**: Reads `access_token` from HTTP-only cookie or Authorization header.
- **Execution Flow**:
  - Uses the incoming `access_token` to locate the active user session record in `refresh_tokens` DB table (`WHERE accessToken = access_token`).
  - Validates whether the associated `refreshToken` in DB is valid, unexpired (`expiresAt > now`), and not revoked (`revokedAt IS NULL`).
  - **If Refresh Token is INVALID or Expired**: Returns `HTTP 401 Unauthorized` (`code: "UNAUTHORIZED_SESSION_EXPIRED"`), requiring re-login.
  - **If Refresh Token is VALID**:
    - Generates a **new** Access Token and a **new** Refresh Token.
    - **Updates the current user's existing DB session row in-place** with the new `accessToken`, new `refreshToken`, `accessTokenExpiresAt`, and `expiresAt` (does NOT insert a new row).
    - Sets the newly generated `access_token` in the HTTP-only cookie.
- **Success Response (`HTTP 200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "refreshed": true,
      "message": "Session token rotated successfully."
    },
    "pagination": null,
    "meta": { ... }
  }
  ```

##### 6. `POST /api/auth/logout` & `POST /api/auth/logout-all`
- Clears `access_token` HTTP-only cookie and sets `isRevoked = true` on session records in database.

##### 7. `GET /api/auth/me`
- Returns profile of currently authenticated user (`id`, `email`, `firstName`, `lastName`, `isEmailVerified`, `status`).

### 2.2 User Profile

| Method | Path                   | Auth     | Role | Idempotent?   | Status     | Notes                                                                             |
| :----- | :--------------------- | :------- | :--- | :------------ | :--------- | :-------------------------------------------------------------------------------- |
| PATCH  | `/api/users/me`        | Required | Any  | Yes (natural) | ⏳ Pending | Sets absolute field values.                                                       |
| POST   | `/api/users/me/avatar` | Required | Any  | Yes (key)     | ⏳ Pending | File upload — retry-safe upload requires a key to avoid duplicate storage writes. |
| DELETE | `/api/users/me`        | Required | Any  | Yes (natural) | ⏳ Pending | Soft-delete; repeating is a no-op.                                                |

### 2.3 Organizations & Membership

| Method | Path                                       | Auth     | Role         | Idempotent?   | Notes                                                                                                                                              |
| :----- | :----------------------------------------- | :------- | :----------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/organizations`                       | Required | Any          | Yes (key)     | Must not create duplicate orgs on retry.                                                                                                           |
| GET    | `/api/organizations`                       | Required | Any          | Yes (natural) |                                                                                                                                                    |
| GET    | `/api/organizations/:id`                   | Required | Any (member) | Yes (natural) |                                                                                                                                                    |
| PATCH  | `/api/organizations/:id`                   | Required | Admin        | Yes (natural) |                                                                                                                                                    |
| DELETE | `/api/organizations/:id`                   | Required | Admin        | Yes (natural) |                                                                                                                                                    |
| POST   | `/api/organizations/:id/invite`            | Required | Admin        | Yes (key)     | **Must** be idempotent — a retried invite request must not send two invite emails or create duplicate pending members for the same `invitedEmail`. |
| GET    | `/api/organizations/:id/invites`           | Required | Admin        | Yes (natural) |                                                                                                                                                    |
| DELETE | `/api/organizations/:id/invites/:inviteId` | Required | Admin        | Yes (natural) |                                                                                                                                                    |
| POST   | `/api/invites/:token/accept`               | Required | Any          | Yes (natural) | Token is single-use by design; accepting twice is a no-op after the first success.                                                                 |
| POST   | `/api/invites/:token/decline`              | Required | Any          | Yes (natural) |                                                                                                                                                    |
| GET    | `/api/organizations/:id/members`           | Required | Any (member) | Yes (natural) | Paginated.                                                                                                                                         |
| PATCH  | `/api/organizations/:id/members/:memberId` | Required | Admin        | Yes (natural) |                                                                                                                                                    |
| DELETE | `/api/organizations/:id/members/:memberId` | Required | Admin        | Yes (natural) |                                                                                                                                                    |
| POST   | `/api/organizations/:id/leave`             | Required | Any (member) | Yes (natural) |                                                                                                                                                    |

### 2.4 Projects

| Method | Path                | Auth     | Role         | Idempotent?   | Notes                                         |
| :----- | :------------------ | :------- | :----------- | :------------ | :-------------------------------------------- |
| POST   | `/api/projects`     | Required | Admin        | Yes (key)     | Prevents duplicate project creation on retry. |
| GET    | `/api/projects`     | Required | Any          | Yes (natural) | Paginated.                                    |
| GET    | `/api/projects/:id` | Required | Any (member) | Yes (natural) |                                               |
| PATCH  | `/api/projects/:id` | Required | Admin        | Yes (natural) |                                               |
| DELETE | `/api/projects/:id` | Required | Admin        | Yes (natural) |                                               |

### 2.5 Environment Profiles

| Method | Path                             | Auth     | Role         | Idempotent?   | Notes |
| :----- | :------------------------------- | :------- | :----------- | :------------ | :---- |
| POST   | `/api/projects/:id/environments` | Required | Admin        | Yes (key)     |       |
| GET    | `/api/projects/:id/environments` | Required | Any (member) | Yes (natural) |       |
| GET    | `/api/environments/:id`          | Required | Any (member) | Yes (natural) |       |
| PATCH  | `/api/environments/:id`          | Required | Admin        | Yes (natural) |       |
| DELETE | `/api/environments/:id`          | Required | Admin        | Yes (natural) |       |

### 2.6 Integration Packages & Webhooks

| Method | Path                             | Auth            | Role         | Idempotent?         | Notes                                                                                                                                                                                 |
| :----- | :------------------------------- | :-------------- | :----------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/projects/:id/integrations` | Required        | Admin        | Yes (key)           |                                                                                                                                                                                       |
| GET    | `/api/projects/:id/integrations` | Required        | Any (member) | Yes (natural)       |                                                                                                                                                                                       |
| PATCH  | `/api/integrations/:id`          | Required        | Admin        | Yes (natural)       |                                                                                                                                                                                       |
| DELETE | `/api/integrations/:id`          | Required        | Admin        | Yes (natural)       |                                                                                                                                                                                       |
| POST   | `/api/webhooks/github`           | Public (signed) | —            | Yes (key, external) | **Must** dedupe on GitHub's delivery ID (`X-GitHub-Delivery` header) — GitHub retries webhook deliveries on timeout, which would otherwise trigger duplicate workflow runs. See §3.3. |
| POST   | `/api/webhooks/slack`            | Public (signed) | —            | Yes (key, external) | Same pattern — dedupe on Slack's retry headers.                                                                                                                                       |

### 2.7 Test Scenarios & Steps

| Method | Path                               | Auth     | Role         | Idempotent?   | Notes                                                                                                                                                             |
| :----- | :--------------------------------- | :------- | :----------- | :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/projects/:id/scenarios`      | Required | QA Engineer+ | Yes (key)     |                                                                                                                                                                   |
| GET    | `/api/projects/:id/scenarios`      | Required | Any (member) | Yes (natural) | Paginated.                                                                                                                                                        |
| GET    | `/api/scenarios/:id`               | Required | Any (member) | Yes (natural) |                                                                                                                                                                   |
| PATCH  | `/api/scenarios/:id`               | Required | QA Engineer+ | Yes (natural) |                                                                                                                                                                   |
| DELETE | `/api/scenarios/:id`               | Required | QA Engineer+ | Yes (natural) |                                                                                                                                                                   |
| POST   | `/api/scenarios/:id/duplicate`     | Required | QA Engineer+ | Yes (key)     | Retry must not create two clones.                                                                                                                                 |
| POST   | `/api/scenarios/:id/steps`         | Required | QA Engineer+ | Yes (key)     | **Important:** the Studio recorder fires this rapidly during live recording — a network hiccup + client retry must not double-record the same click as two steps. |
| GET    | `/api/scenarios/:id/steps`         | Required | Any (member) | Yes (natural) |                                                                                                                                                                   |
| PATCH  | `/api/steps/:id`                   | Required | QA Engineer+ | Yes (natural) |                                                                                                                                                                   |
| DELETE | `/api/steps/:id`                   | Required | QA Engineer+ | Yes (natural) |                                                                                                                                                                   |
| PATCH  | `/api/scenarios/:id/steps/reorder` | Required | QA Engineer+ | Yes (natural) | Sets absolute order array each call.                                                                                                                              |
| POST   | `/api/steps/upload`                | Required | QA Engineer+ | Yes (key)     | File upload — avoid duplicate storage writes on retry.                                                                                                            |

### 2.8 Test Workflows

| Method | Path                                       | Auth     | Role         | Idempotent?   | Notes                                                    |
| :----- | :----------------------------------------- | :------- | :----------- | :------------ | :------------------------------------------------------- |
| POST   | `/api/projects/:id/workflows`              | Required | QA Engineer+ | Yes (key)     |                                                          |
| GET    | `/api/projects/:id/workflows`              | Required | Any (member) | Yes (natural) | Paginated.                                               |
| GET    | `/api/workflows/:id`                       | Required | Any (member) | Yes (natural) |                                                          |
| PATCH  | `/api/workflows/:id`                       | Required | QA Engineer+ | Yes (natural) |                                                          |
| DELETE | `/api/workflows/:id`                       | Required | QA Engineer+ | Yes (natural) |                                                          |
| POST   | `/api/workflows/:id/duplicate`             | Required | QA Engineer+ | Yes (key)     |                                                          |
| POST   | `/api/workflows/:id/scenarios`             | Required | QA Engineer+ | Yes (key)     | Retry must not add the same scenario to the chain twice. |
| PATCH  | `/api/workflows/:id/scenarios/reorder`     | Required | QA Engineer+ | Yes (natural) |                                                          |
| DELETE | `/api/workflows/:id/scenarios/:scenarioId` | Required | QA Engineer+ | Yes (natural) |                                                          |

### 2.9 Studio (Live Recording Session)

| Method | Path                                    | Auth     | Role         | Idempotent?   | Notes                                                                                                                                                                                                                                                                               |
| :----- | :-------------------------------------- | :------- | :----------- | :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/projects/:id/studio/session`      | Required | QA Engineer+ | Yes (key)     | **Critical.** Retry-without-key would launch a second real browser process — expensive and leaks resources.                                                                                                                                                                         |
| DELETE | `/api/studio/session/:sessionId`        | Required | QA Engineer+ | Yes (natural) | Ending an already-ended session is a no-op.                                                                                                                                                                                                                                         |
| GET    | `/api/studio/session/:sessionId`        | Required | QA Engineer+ | Yes (natural) |                                                                                                                                                                                                                                                                                     |
| GET    | `/api/studio/session/:sessionId/stream` | Required | QA Engineer+ | N/A           | **SSE.** Server → client only: streams live browser frames/DOM snapshots and step-recorded confirmations. See §5.2.                                                                                                                                                                 |
| POST   | `/api/studio/session/:sessionId/action` | Required | QA Engineer+ | No            | **Client → server.** One call per user interaction (click, type, scroll) during recording — forwarded to the server-side Playwright page controlling the live session. Intentionally not idempotent: each call is a distinct, deliberate interaction, not a retryable state change. |

### 2.10 Execution (Replay)

| Method | Path                                      | Auth     | Role         | Idempotent?   | Notes                                                                                                                                                                                       |
| :----- | :---------------------------------------- | :------- | :----------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/scenarios/:id/execute`              | Required | Any (member) | Yes (key)     | **Critical.** This is the single most important idempotency case in the system — see §3.1. A double-click or retried request must not launch two real browser runs against the target site. |
| POST   | `/api/workflows/:id/execute`              | Required | Any (member) | Yes (key)     | Same reasoning — extra important here since a workflow run has side effects on the target app (e.g. creates real records) across multiple chained scenarios.                                |
| GET    | `/api/executions/:id`                     | Required | Any (member) | Yes (natural) |                                                                                                                                                                                             |
| GET    | `/api/executions/:id/steps`               | Required | Any (member) | Yes (natural) |                                                                                                                                                                                             |
| GET    | `/api/executions/:id/steps/:stepResultId` | Required | Any (member) | Yes (natural) |                                                                                                                                                                                             |
| GET    | `/api/projects/:id/executions`            | Required | Any (member) | Yes (natural) | Paginated.                                                                                                                                                                                  |
| GET    | `/api/scenarios/:id/executions`           | Required | Any (member) | Yes (natural) | Paginated.                                                                                                                                                                                  |
| GET    | `/api/workflows/:id/executions`           | Required | Any (member) | Yes (natural) | Paginated.                                                                                                                                                                                  |
| POST   | `/api/executions/:id/cancel`              | Required | Any (member) | Yes (natural) | Cancelling an already-cancelled/completed run is a no-op.                                                                                                                                   |
| POST   | `/api/executions/:id/retry`               | Required | Any (member) | Yes (key)     | Retry-of-the-retry-button must not launch two new runs.                                                                                                                                     |
| DELETE | `/api/executions/:id`                     | Required | Admin        | Yes (natural) |                                                                                                                                                                                             |
| POST   | `/api/projects/:id/executions/purge`      | Required | Admin        | Yes (natural) | Re-running with the same cutoff date is a no-op after the first purge.                                                                                                                      |
| GET    | `/api/projects/:id/executions/summary`    | Required | Any (member) | Yes (natural) |                                                                                                                                                                                             |
| GET    | `/api/scenarios/:id/health`               | Required | Any (member) | Yes (natural) |                                                                                                                                                                                             |
| SSE    | `/api/executions/:id/stream`              | Required | Any (member) | N/A           | Real-time channel — see §5.1.                                                                                                                                                               |

### 2.11 Export

| Method | Path                         | Auth     | Role         | Idempotent?   | Notes                                                                                                              |
| :----- | :--------------------------- | :------- | :----------- | :------------ | :----------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/scenarios/:id/export`  | Required | Any (member) | Yes (key)     | Retry should return the already-generated script rather than regenerating and double-billing any LLM/codegen cost. |
| GET    | `/api/scenarios/:id/exports` | Required | Any (member) | Yes (natural) | Paginated.                                                                                                         |
| GET    | `/api/exports/:id`           | Required | Any (member) | Yes (natural) |                                                                                                                    |
| GET    | `/api/exports/:id/download`  | Required | Any (member) | Yes (natural) |                                                                                                                    |

### 2.12 Cross-Cutting

| Method | Path                          | Auth     | Role | Idempotent?   | Notes                             |
| :----- | :---------------------------- | :------- | :--- | :------------ | :-------------------------------- |
| GET    | `/api/health`                 | Public   | —    | Yes (natural) | Liveness/readiness probe.         |
| GET    | `/api/notifications`          | Required | Any  | Yes (natural) | Paginated.                        |
| PATCH  | `/api/notifications/:id/read` | Required | Any  | Yes (natural) | Marking as read twice is a no-op. |

---

## 3. Idempotency Strategy

### 3.1 Why this matters most for `execute`

Triggering a scenario/workflow run has **real side effects on the target application under test** — it can create records, send emails, charge test payments, etc. on `projects.targetBaseUrl`. A duplicate execution isn't just wasted compute — it can corrupt the target app's data or double-fire external effects. This is the highest-priority idempotency case in the whole API.

### 3.2 Implementation Pattern

Add one new table (update `DbSchema.md` and `AGENTS.md` §12 in the same change set that introduces this):

**Table: `idempotency_keys`** — full definition in `docs/DbSchema.md` Layer 7.

| Column               | Type             | Purpose                                                                                                                                                                         |
| :------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                 | `UUID`           | PK                                                                                                                                                                              |
| `key`                | `VARCHAR(255)`   | The client-supplied `Idempotency-Key` header for user requests, or the provider's delivery ID for webhooks                                                                      |
| `source`             | `VARCHAR(20)`    | `USER_REQUEST` or `WEBHOOK` — distinguishes the two dedup flows sharing this table                                                                                              |
| `userId`             | `UUID`, nullable | Set for `USER_REQUEST` rows; `NULL` for `WEBHOOK` rows, since inbound webhooks are unauthenticated                                                                              |
| `endpoint`           | `VARCHAR(255)`   | The **fully resolved** request path (e.g. `POST /api/scenarios/sc100.../execute`), never a route pattern — a pattern would let a reused key collide across different resources  |
| `requestHash`        | `VARCHAR(64)`    | SHA-256 of the request body — if a client reuses a key with a _different_ body, reject with `409 Conflict` (key reuse mismatch) rather than silently returning the old response |
| `responseStatusCode` | `INTEGER`        | Cached response status                                                                                                                                                          |
| `responseBody`       | `JSONB`          | Cached response body, replayed verbatim on duplicate requests                                                                                                                   |
| `status`             | `VARCHAR(20)`    | `IN_PROGRESS` \| `COMPLETED` — see race-condition note below                                                                                                                    |
| `expiresAt`          | `TIMESTAMPTZ`    | Keys expire (e.g. 24h) — no unbounded table growth                                                                                                                              |
| `createdAt`          | `TIMESTAMPTZ`    | Standard                                                                                                                                                                        |

**Required request flow for any `Yes (key)` endpoint:**

1. Client sends the request with an `Idempotency-Key` header containing a client-generated UUID.
2. Server looks up an existing row by `(key, userId, endpoint)`:
    - **Not found** → insert a row with `status: IN_PROGRESS`, then proceed with the real operation. On completion, update the row to `status: COMPLETED` and store `responseStatusCode` + `responseBody`.
    - **Found, `status: COMPLETED`, `requestHash` matches** → return the cached response immediately; do not re-run the operation.
    - **Found, `status: COMPLETED`, `requestHash` does not match** → reject with `409 Conflict` ("Idempotency-Key already used with a different request body").
    - **Found, `status: IN_PROGRESS`** → reject with `409 Conflict` ("Request already in progress"); the client is expected to already be tracking the original in-flight request rather than the server blocking/polling on its behalf.
3. If the header is missing entirely on an endpoint that requires it → reject with `400 Bad Request` ("Idempotency-Key header is required for this endpoint").

This flow is enforced by a single service, `lib/idempotency-service/`, applied consistently across every endpoint marked `Yes (key)` in this catalog — individual routes never reimplement this lookup themselves. The exact structural requirement for how this is wired into route handlers is defined in `AGENTS.md` §3.7.

### 3.3 External Webhooks (a different flavor of idempotency)

Inbound webhooks (`/api/webhooks/github`, `/api/webhooks/slack`) don't get an `Idempotency-Key` header from the client — instead, dedupe using the **provider's own delivery/event ID**:

- GitHub sends `X-GitHub-Delivery` — store processed delivery IDs in `idempotency_keys` with `source: 'WEBHOOK'`, `userId: null`, `key = deliveryId`, `endpoint = 'POST /api/webhooks/github'` — and skip reprocessing if already seen.
- Always verify the webhook signature (`X-Hub-Signature-256` for GitHub, Slack's signing secret) **before** dedupe/processing — reject unsigned/invalid requests at `401` before they ever touch business logic.

---

## 4. Middleware Architecture

Next.js provides exactly one place to intercept requests before they reach any route handler: **`middleware.ts`** at the project root, scoped with a `matcher` config. This is the correct place for cross-cutting concerns like rate limiting, auth pre-checks, and request logging — **not** inside individual `route.ts` files, and **not** a custom `proxy.ts` (Next.js doesn't have a "proxy.ts" convention — `middleware.ts` is the framework's designated interception point).

### 4.1 What belongs in `middleware.ts`

| Concern                                                   | Belongs in middleware?                                                                   | Why                                                                                                                                                                                     |
| :-------------------------------------------------------- | :--------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limiting                                             | ✅ Yes                                                                                   | Must reject before any DB/service work happens                                                                                                                                          |
| Access-token presence check (not full verification)       | ✅ Yes                                                                                   | Cheap early rejection of clearly unauthenticated requests                                                                                                                               |
| CORS headers                                              | ✅ Yes                                                                                   | Applies uniformly across all API routes                                                                                                                                                 |
| Request ID generation (for `meta.responseTimeMs` tracing) | ✅ Yes                                                                                   | Needs to exist before the handler starts timing                                                                                                                                         |
| Full JWT verification + role/permission checks            | ❌ No — belongs in `lib/auth-service/` + `lib/rbac-service/`, called from route handlers | Middleware runs on the Edge runtime by default, which limits access to some Node APIs/DB drivers — keep it lightweight; full auth/DB-backed permission checks stay in the service layer |
| Idempotency key lookup                                    | ❌ No — belongs in the `withIdempotency` route wrapper (§3.2)                            | Needs to read/write to Postgres per-route; keep middleware Edge-lightweight                                                                                                             |
| Business logic / validation                               | ❌ No                                                                                    | Belongs in `lib/<service-name>/`, per `AGENTS.md` §3.1                                                                                                                                  |

### 4.2 Rate Limit Tiers

| Tier                | Applies to                                                    | Limit (example)                                                                                                    |
| :------------------ | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| **Strict**          | `/api/auth/request-otp`, `/api/auth/resend-otp`               | 1 request per 30s per email/IP, max 5 per hour                                                                     |
| **Auth-sensitive**  | `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/signup` | 10 requests per minute per IP                                                                                      |
| **Execution-heavy** | `/api/scenarios/:id/execute`, `/api/workflows/:id/execute`    | 20 requests per minute per user (separate from plan-based limits in the future)                                    |
| **Standard write**  | Most `POST`/`PATCH`/`DELETE` routes                           | 60 requests per minute per user                                                                                    |
| **Read**            | Most `GET` routes                                             | 300 requests per minute per user                                                                                   |
| **Webhooks**        | `/api/webhooks/*`                                             | Rate-limited by source IP allowlist (provider IP ranges) rather than per-user, since there's no authenticated user |

### 4.3 What `middleware.ts` Must Do

- Generate a request ID at the very start of the request, used later for `meta.responseTimeMs` tracing in the response envelope.
- Check the rate-limit tier for the incoming path + method (per §4.2) and reject over-limit requests with `429` before the request reaches any route handler, using the standard response envelope with a `Retry-After` header.
- Reject requests with a structurally missing/malformed `Authorization` header early, as a cheap first pass — this is not the authoritative auth check.
- Attach CORS headers.
- Do none of the above by querying Postgres directly — rate-limit counters live in a fast external store (Redis/Upstash), since `middleware.ts` runs on the Edge runtime.

The full behavioral requirements and boundaries for `middleware.ts` are defined in `AGENTS.md` §3.5 — this section is the reference for _what_ must be enforced; that section is the reference for _how_ it must be structured in code.

### 4.4 Idempotency & Auth as Route-Level Concerns, Not Middleware

Full JWT verification, RBAC/permission checks, and idempotency-key lookups all need Postgres access and business context (which resource, which user, which role) — none of that belongs in Edge middleware. These are implemented as composable checks applied at the route level, inside `lib/auth-service/`, `lib/rbac-service/`, and `lib/idempotency-service/` respectively, and called from within each route handler before its business logic runs.

The required behavior for each of these is specified in `AGENTS.md`:

- Auth & RBAC — §3.4
- Idempotency — §3.7
- RBAC documentation obligation (recording the required role per route in this file) — §3.8

---

## 5. Real-Time Channels

### 5.1 Execution Progress — Server-Sent Events (SSE)

- **Endpoint:** `GET /api/executions/:id/stream`
- **Direction:** server → client only.
- **Why SSE, not WebSocket:** runs over plain HTTP, auto-reconnects natively via the browser's `EventSource`, and needs no special load-balancer/infra configuration. The client never needs to send anything mid-stream — cancellation is a separate `POST /api/executions/:id/cancel` call, not part of the stream.
- **Events emitted:** `step_result` (new `TestExecutionStepResult` row written), `status_change` (`TestExecution.status` transitions), `execution_complete` (final summary).
- **Rate limiting:** SSE connections are long-lived — apply a **connection-count limit per user** (e.g. max 5 concurrent streams) rather than a request-per-minute limit.

### 5.2 Studio Live Recording — SSE + POST Hybrid (no WebSocket)

Since TestLoom runs as a single Next.js application (no separate always-on backend service), this channel intentionally avoids WebSocket — Next.js's serverless deployment targets (e.g. Vercel) do not support WebSocket upgrade connections, and introducing one would force a separate persistent server just for this feature. Instead, the same bidirectional need is met by splitting it into two ordinary HTTP mechanisms:

- **`GET /api/studio/session/:sessionId/stream` (SSE, server → client):** streams live browser frames/DOM snapshots from the server-side Playwright page, plus confirmation events each time an action is successfully recorded as a `TestStep`.
- **`POST /api/studio/session/:sessionId/action` (client → server):** the Studio UI sends one request per user interaction (click, type, scroll) as it happens. The route forwards this to the Playwright page controlling the live session and records the corresponding `test_steps` row.

**Why this is an acceptable trade-off here:** a recording session is driven by a single human clicking through a page at normal human speed — not a high-frequency real-time stream. The extra HTTP round-trip per action (compared to a persistent socket) is imperceptible at that pace, while this approach keeps the entire system deployable as one ordinary Next.js app, consistent with SSE already being used for execution progress (§5.1).

**If a genuinely persistent, low-latency channel becomes necessary later** (e.g. supporting very high-frequency events, or multiple viewers watching one session simultaneously), that would be the point to introduce a dedicated always-on service with WebSocket support — not to add WebSocket into the Next.js app itself.

---

## 6. Summary Checklist for Any New Endpoint

Before adding a new route, confirm:

- [ ] Does it mutate state with a real side effect (create, execute, send email/webhook)? → Requires `Idempotency-Key` (§3).
- [ ] Does it need a role check? → Call `lib/rbac-service/`, never inline the check.
- [ ] Does it return a list? → Must include `pagination` in the response, never omit the key.
- [ ] Is it high-frequency or resource-expensive (execute, studio session, OTP)? → Confirm its rate-limit tier in §4.2.
- [ ] Does it touch business logic beyond parsing + calling a service? → Move that logic into `lib/<service-name>/` per `AGENTS.md` §3.1.
- [ ] Update this file (`API.md`) with the new row in the same change set — this catalog must stay exhaustive, per `AGENTS.md` §12.

# TestLoom — Product Requirement Document (PRD) & Step-by-Step Development Roadmap

This document is the **authoritative product requirement specification and phased development execution roadmap** for TestLoom. It provides a complete, easy-to-understand executive overview of the product domain, core concepts, access models, and execution architecture, followed by a step-by-step phased development roadmap for both backend and frontend implementation.

---

## 1. Executive Product Overview & Domain Architecture

### 1.1 What is TestLoom?
**TestLoom** is an enterprise-grade **No-Code / Low-Code Web Test Automation & Recording Platform**. It allows teams to record real user journeys on live web applications, automatically extract resilient DOM selectors, add visual assertions without writing code, replay test suites with intelligent self-healing, and export clean automation code scripts across multiple popular frameworks (Playwright TypeScript/Python, Cypress, Selenium, Cucumber).

### 1.2 The Problem TestLoom Solves
1. **Time-Consuming Script Writing**: QA engineers spend days writing boilerplate code for login flows, checkout forms, and navigation suites.
2. **Flaky & Fragile Locators**: When frontend UI developers change a button's CSS class or layout, traditional automated test scripts break instantly.
3. **Data Conflicts During Replay**: Re-running recorded tests with hardcoded static inputs (e.g., `john@example.com`) fails because database unique constraints trigger duplicate key errors (`409 Conflict`).
4. **Broken Session Auth across Tests**: Running chained test steps often forces redundant re-authentications because test frameworks reset cookies between scenario boundaries.

### 1.3 How TestLoom Solves This (Core Pillars)
- **Live Studio Canvas & Action Recorder**: Streams live browser viewport frames (JPEG base64 via SSE) into the web browser. Every click, type, select, scroll, and keypress is captured as a structured step.
- **Input Replay Strategy Intelligence**: Differentiates selection controls (radios/checkboxes locked to `DETERMINISTIC_EXACT` state) from textual inputs (emails/numbers dynamically auto-generated with timestamp suffixes).
- **6-Tier Self-Healing Selector Engine**: If a element's primary locator fails during replay, TestLoom cascades through fallback locators (`testId` ➔ `id` ➔ `ariaLabel` ➔ `text` ➔ `cssPath` ➔ `tagName`), executes the step successfully, marks it `HEALED`, and automatically updates the step's `primaryKey` in the database.
- **Shared In-Memory Session Continuity**: Workflows chain multiple scenarios together inside **one shared Playwright browser context**, preserving authentication cookies and headers across scenarios without re-logging in.
- **Multi-Framework Code Transpiler**: Converts recorded visual scenarios into executable Playwright TS, Playwright Python, Cypress JS, Selenium Python, or Cucumber Gherkin scripts.

---

### 1.4 Access Control Model & User Roles (3-Role System)

TestLoom uses a strict **3-Role Access Model** (`ADMIN`, `QA_ENGINEER`, `VIEWER`):

| Role | Target User | Real-World Responsibilities & Permissions |
| :--- | :--- | :--- |
| 👑 **Admin** | Engineering Leads, QA Managers | • Full administrative control over Organization profile.<br>• Invite team members via email tokens & assign/change member roles.<br>• Create, edit, and delete company projects.<br>• Configure Base Target URLs (e.g. `https://staging.example.com`), viewports (`1280x800`), and environment variable profiles. |
| 🧪 **QA Engineer** | Automation Testers, QA Analysts | • Launch Studio Canvas recorder and interact with target web pages.<br>• Capture test scenarios, edit step locators, and adjust replay strategies.<br>• Add visual assertions (`ASSERT_VISIBLE`, `ASSERT_TEXT`, `ASSERT_URL`).<br>• Compose and reorder scenarios inside workflow suites. |
| 👁️ **Viewer / Developer** | Software Developers, Stakeholders | • Read-only access to projects, scenarios, and workflow suites.<br>• Trigger manual test replays & view real-time execution progress logs.<br>• View failure screenshots and self-healing diagnostic reports.<br>• Transpile and export recorded scenarios into automation code scripts. |

---

### 1.5 Detailed Domain Concepts Explained

#### A. Project Ownership (Personal vs. Company Organization)
- **Personal Projects**: Created and owned directly by an individual user (`userId`). Intended for solo developers or standalone testing.
- **Company Projects**: Owned by a multi-tenant Organization (`organizationId`). Shared among team members based on their assigned role.
- **Invariant**: A project is owned by **either** a user **or** an organization — never both, never neither. Enforced at both database schema and API layer.

#### B. Test Scenario vs. Test Workflow
- **Test Scenario (`test_scenarios`)**: A single, modular recorded user journey for a specific relative route (e.g. `Login Scenario` on `/login`, `Search Product Scenario` on `/search`). Scenarios contain sequential steps (`test_steps`).
- **Test Workflow (`test_workflows`)**: A complete end-to-end test suite chaining multiple scenarios in order (e.g. `Login` ➔ `Search Product` ➔ `Add to Cart` ➔ `Checkout`).
- **Prerequisite Scenario Link (`requiredScenarioId`)**: Scenarios can declare a prerequisite dependency so running a standalone scenario automatically runs its required prerequisite scenario first.

#### C. Studio Recorder & SSE Live Viewport Streaming
- When a QA Engineer opens the Studio Canvas, TestLoom launches a server-side Playwright headless browser instance.
- The browser context streams compressed base64 JPEG viewport frames via **Server-Sent Events (SSE)** to the frontend canvas UI at low latency.
- User mouse clicks, typing, and dropdown choices on the canvas are sent via HTTP requests to `/api/workspace/[projectId]/actions`, dispatched directly into the Playwright DOM, and recorded as structured steps.

#### D. Input Replay Strategies
When replaying inputs, TestLoom applies specific strategies based on element type:
1. **Selection Controls (Radios, Checkboxes, Dropdowns)**:
   - Strategy: `DETERMINISTIC_EXACT`
   - Playwright API: `.setChecked(true/false)`, `.check()`, `.selectOption(value)`
   - Purpose: Strict state locking — ensures selection state is explicitly forced, avoiding accidental toggles.
2. **Textual & Data Inputs (Emails, Names, Phone Numbers)**:
   - Strategy: `DYNAMIC_AUTO_GENERATE`
   - Generation Rule: Appends a Unix timestamp prefix/suffix (e.g., `john+1726700000@suretyseven.com`).
   - Purpose: Prevents `409 Conflict` duplicate key database errors during repeated test replays.

#### E. 6-Tier Self-Healing Selector Engine
When replaying a recorded step, TestLoom attempts to find and interact with the DOM element using a 6-tier locator fallback cascade:

```
[1. Try Primary Key (test_steps.primaryKey)]
       │ (If failed or not found)
       ▼
[2. Priority 1: testId] ──► [data-testid="..."]
       │ (If failed)
       ▼
[3. Priority 2: id] ─────► #element-id
       │ (If failed)
       ▼
[4. Priority 3: name / ariaLabel / placeholder]
       │ (If failed)
       ▼
[5. Priority 4: labelText / textContent]
       │ (If failed)
       ▼
[6. Priority 5: cssPath / xpath]
       │ (If failed)
       ▼
[7. Priority 6: tagName + classList]
```

- **If a fallback locator succeeds**: The step status is marked **`HEALED`**, the event is logged with the working locator, and `test_steps.primaryKey` is **automatically updated** in the database so future runs use the healed locator directly.

---

## 2. PHASE 1: Backend Database & Migration Setup

### Task 1.1: Database Connection Configuration
- **Database Engine**: PostgreSQL 16 running via Docker container on port `5435` (`localhost:5435/testloom_db`).
- **Database Client**: Configure connection pool using Prisma / Drizzle / Kysely or PG driver in `lib/db/`.
- **Environment Variables**: `DATABASE_URL=postgresql://testloom_admin:testloom_secure_pass_2026@localhost:5435/testloom_db?schema=public`.

### Task 1.2: Standard Audit & Soft-Delete Fields
Every database table MUST include these 7 mandatory fields:
1. `id` (`UUID`, `PRIMARY KEY`, `DEFAULT gen_random_uuid()`)
2. `createdAt` (`TIMESTAMPTZ`, `NOT NULL`, `DEFAULT NOW()`)
3. `createdBy` (`UUID`, `NULLABLE`, `REFERENCES users(id)`)
4. `updatedAt` (`TIMESTAMPTZ`, `NOT NULL`, `DEFAULT NOW()`)
5. `updatedBy` (`UUID`, `NULLABLE`, `REFERENCES users(id)`)
6. `deletedAt` (`TIMESTAMPTZ`, `NULLABLE`) — Soft delete marker. `NULL` = Active.
7. `deletedBy` (`UUID`, `NULLABLE`, `REFERENCES users(id)`)

### Task 1.3: Table Schema Inventory (13 Tables across 5 Layers)
Matching specifications in [`docs/DbSchema.md`](file:///c:/Users/Pawan/Desktop/FullStackProject/testloom/docs/DbSchema.md):

1. **Layer 1 — Auth**: `users`, `refresh_tokens`.
2. **Layer 2 — Multi-Tenancy**: `organizations`, `organization_members`, `org_invites`.
3. **Layer 3 — Projects & Configs**: `projects`, `environment_profiles`, `integration_packages`.
4. **Layer 4 — Scenarios & Workflows**: `test_scenarios`, `test_steps`, `test_workflows`, `workflow_scenarios`.
5. **Layer 5 — Executions & Audit**: `test_executions`, `execution_logs`, `execution_screenshots`, `idempotency_records`.

### Task 1.4: Migration & Database Seeding Commands
- **Migration Script**: `npm run db:migrate` (applies SQL schema DDL to database).
- **Seed Script**: `npm run db:seed` (creates default admin user `admin@testloom.com`, default organization, and a sample project).

---

## 3. PHASE 2: Core Middleware & Standard API Infrastructure

All backend route handlers under `app/api/` MUST be thin controllers (< 30 lines) delegating business logic to `lib/<service-name>/`.

### Task 2.1: Standard API Response Envelope
Every API response must be wrapped using `ApiResponseService`:

```json
// Success Response (Single Resource)
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "pagination": null,
  "meta": {
    "responseTimeMs": 14,
    "startedAt": "2026-09-20T09:00:00.000Z",
    "endedAt": "2026-09-20T09:00:00.014Z"
  }
}

// Success Response (Paginated Collection)
{
  "success": true,
  "statusCode": 200,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  },
  "meta": { ... }
}

// Failure Response
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "pagination": null,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Target Base URL must be a valid HTTPS URL."
  },
  "meta": { ... }
}
```

### Task 2.2: Authentication Middleware (`lib/auth-service/`)
- Extracts JWT Bearer token from `Authorization` header or HTTP-only cookie.
- Resolves current `userId`, active session ID, and user profile.

### Task 2.3: Role-Based Access Control (RBAC) Guard (`lib/rbac-service/`)
- Evaluates user role (`ADMIN`, `QA_ENGINEER`, `VIEWER`) against target resource organization/project.
- Rejects unauthorized actions with `403 FORBIDDEN`.

### Task 2.4: Idempotency Middleware (`Idempotency-Key`)
- Reads optional `Idempotency-Key` request header for state-mutating requests (`POST`, `PUT`, `DELETE`).
- Checks `idempotency_records` table: if a completed record exists for the key within 24 hours, returns cached response immediately; if pending, returns `409 CONFLICT`.

### Task 2.5: Rate Limiting Middleware
- Enforces sliding window rate limits on sensitive endpoints:
  - Auth Login/Register: 10 requests / minute per IP.
  - Test Execution Trigger: 30 requests / minute per project.
  - Standard Data APIs: 120 requests / minute per user.

---

## 4. PHASE 3: Backend API Service Layer & Endpoint Matrix

Below is the complete API Endpoint Matrix detailing HTTP Method, Route, Purpose, Zod Schema, RBAC Role, Idempotency, and Rate Limiting requirements.

### 4.1 Authentication & Profile APIs (`lib/auth-service/`)

| Method | Endpoint | Purpose | Zod Schema | Auth | RBAC Role | Idempotency | Rate Limit |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `POST` | `/api/auth/register` | Register new user account | `registerUserSchema` | ❌ None | None | Optional | 10 req/min |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | `loginUserSchema` | ❌ None | None | Optional | 10 req/min |
| `POST` | `/api/auth/refresh` | Rotate refresh token for access token | `refreshTokenSchema` | ❌ None | None | Optional | 20 req/min |
| `POST` | `/api/auth/logout` | Revoke current refresh token session | `logoutSchema` | ✅ Auth | Any | Optional | 30 req/min |
| `GET` | `/api/auth/me` | Fetch active user profile & orgs | None | ✅ Auth | Any | No | 60 req/min |

### 4.2 Organizations & Team Invites APIs (`lib/organizations-service/`)

| Method | Endpoint | Purpose | Zod Schema | Auth | RBAC Role | Idempotency | Rate Limit |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `GET` | `/api/organizations` | List organizations user belongs to | None | ✅ Auth | Any | No | 60 req/min |
| `POST` | `/api/organizations` | Create new company organization | `createOrgSchema` | ✅ Auth | Any | Required | 20 req/min |
| `GET` | `/api/organizations/[id]` | Get organization details | None | ✅ Auth | Viewer+ | No | 60 req/min |
| `PUT` | `/api/organizations/[id]` | Update organization profile | `updateOrgSchema` | ✅ Auth | Admin | Required | 20 req/min |
| `GET` | `/api/organizations/[id]/members` | List organization team members | None | ✅ Auth | Viewer+ | No | 60 req/min |
| `POST` | `/api/organizations/[id]/invites` | Invite new member via email token | `inviteMemberSchema` | ✅ Auth | Admin | Required | 20 req/min |
| `PATCH` | `/api/organizations/[id]/members/[memberId]` | Change member role (`ADMIN`, `QA_ENGINEER`, `VIEWER`) | `updateMemberRoleSchema` | ✅ Auth | Admin | Required | 30 req/min |
| `DELETE` | `/api/organizations/[id]/members/[memberId]` | Remove member from organization | None | ✅ Auth | Admin | Required | 30 req/min |

### 4.3 Projects & Environment Profiles APIs (`lib/projects-service/`)

| Method | Endpoint | Purpose | Zod Schema | Auth | RBAC Role | Idempotency | Rate Limit |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `GET` | `/api/projects` | List projects (Personal or Org scope) | `listProjectsQuerySchema` | ✅ Auth | Viewer+ | No | 60 req/min |
| `POST` | `/api/projects` | Create new project | `createProjectSchema` | ✅ Auth | Admin | Required | 30 req/min |
| `GET` | `/api/projects/[id]` | Get project configuration | None | ✅ Auth | Viewer+ | No | 60 req/min |
| `PUT` | `/api/projects/[id]` | Update project config (Base URL, viewport) | `updateProjectSchema` | ✅ Auth | Admin | Required | 30 req/min |
| `DELETE` | `/api/projects/[id]` | Soft-delete project | None | ✅ Auth | Admin | Required | 20 req/min |
| `GET` | `/api/projects/[id]/env-profiles` | List environment profiles | None | ✅ Auth | Viewer+ | No | 60 req/min |
| `POST` | `/api/projects/[id]/env-profiles` | Create environment profile (vars) | `createEnvProfileSchema` | ✅ Auth | Admin | Required | 30 req/min |

### 4.4 Test Scenarios & Recorder Step APIs (`lib/scenarios-service/`)

| Method | Endpoint | Purpose | Zod Schema | Auth | RBAC Role | Idempotency | Rate Limit |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `GET` | `/api/scenarios` | List scenarios by project | `listScenariosQuerySchema` | ✅ Auth | Viewer+ | No | 60 req/min |
| `POST` | `/api/scenarios` | Create scenario metadata | `createScenarioSchema` | ✅ Auth | QA Engineer+ | Required | 30 req/min |
| `GET` | `/api/scenarios/[id]` | Get scenario with steps list | None | ✅ Auth | Viewer+ | No | 60 req/min |
| `PUT` | `/api/scenarios/[id]` | Update scenario title, route, status | `updateScenarioSchema` | ✅ Auth | QA Engineer+ | Required | 30 req/min |
| `DELETE` | `/api/scenarios/[id]` | Soft-delete scenario | None | ✅ Auth | QA Engineer+ | Required | 20 req/min |
| `POST` | `/api/scenarios/[id]/steps` | Append recorded step to scenario | `createStepSchema` | ✅ Auth | QA Engineer+ | Required | 60 req/min |
| `PUT` | `/api/scenarios/[id]/steps/[stepId]` | Edit step primary key, strategy, assertion | `updateStepSchema` | ✅ Auth | QA Engineer+ | Required | 60 req/min |
| `DELETE` | `/api/scenarios/[id]/steps/[stepId]` | Delete single step | None | ✅ Auth | QA Engineer+ | Required | 30 req/min |

### 4.5 Test Workflows & Ordering APIs (`lib/workflows-service/`)

| Method | Endpoint | Purpose | Zod Schema | Auth | RBAC Role | Idempotency | Rate Limit |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `GET` | `/api/workflows` | List workflows by project | `listWorkflowsQuerySchema` | ✅ Auth | Viewer+ | No | 60 req/min |
| `POST` | `/api/workflows` | Create new workflow suite | `createWorkflowSchema` | ✅ Auth | QA Engineer+ | Required | 30 req/min |
| `GET` | `/api/workflows/[id]` | Get workflow details with ordered scenarios | None | ✅ Auth | Viewer+ | No | 60 req/min |
| `PUT` | `/api/workflows/[id]` | Update workflow title & description | `updateWorkflowSchema` | ✅ Auth | QA Engineer+ | Required | 30 req/min |
| `PUT` | `/api/workflows/[id]/reorder` | Reorder scenarios in workflow suite | `reorderScenariosSchema` | ✅ Auth | QA Engineer+ | Required | 30 req/min |
| `DELETE` | `/api/workflows/[id]` | Soft-delete workflow | None | ✅ Auth | QA Engineer+ | Required | 20 req/min |

### 4.6 Interactive Studio Recorder APIs (`lib/playwright-service/`)

| Method | Endpoint | Purpose | Zod Schema | Auth | RBAC Role | Idempotency | Rate Limit |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `POST` | `/api/workspace/[projectId]/session` | Launch live Playwright browser context | `launchSessionSchema` | ✅ Auth | QA Engineer+ | Required | 10 req/min |
| `GET` | `/api/workspace/[projectId]/stream` | SSE stream base64 JPEG canvas frames | None | ✅ Auth | QA Engineer+ | No | 60 req/min |
| `POST` | `/api/workspace/[projectId]/actions` | Dispatch canvas click/type/scroll event | `dispatchActionSchema` | ✅ Auth | QA Engineer+ | No | 120 req/min |
| `DELETE` | `/api/workspace/[projectId]/session` | Close Playwright recorder context | None | ✅ Auth | QA Engineer+ | Optional | 20 req/min |

### 4.7 Execution Engine & Replay APIs (`lib/playwright-service/`)

| Method | Endpoint | Purpose | Zod Schema | Auth | RBAC Role | Idempotency | Rate Limit |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `POST` | `/api/executions` | Trigger scenario or workflow test execution | `triggerExecutionSchema` | ✅ Auth | Viewer+ | Required | 30 req/min |
| `GET` | `/api/executions` | List test executions history | `listExecutionsQuerySchema` | ✅ Auth | Viewer+ | No | 60 req/min |
| `GET` | `/api/executions/[id]` | Get execution result detail & step logs | None | ✅ Auth | Viewer+ | No | 60 req/min |
| `GET` | `/api/executions/[id]/stream` | SSE stream real-time execution step results | None | ✅ Auth | Viewer+ | No | 60 req/min |
| `POST` | `/api/executions/[id]/stop` | Cancel active running execution | None | ✅ Auth | QA Engineer+ | Required | 20 req/min |

### 4.8 Code Export APIs (`lib/export-service/`)

| Method | Endpoint | Purpose | Zod Schema | Auth | RBAC Role | Idempotency | Rate Limit |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `POST` | `/api/export/scenario/[id]` | Transpile scenario into TS/Py code | `exportCodeSchema` | ✅ Auth | Viewer+ | No | 30 req/min |
| `POST` | `/api/export/workflow/[id]` | Transpile workflow suite into TS/Py code | `exportCodeSchema` | ✅ Auth | Viewer+ | No | 30 req/min |

---

## 5. PHASE 4: Frontend Core Infrastructure & Shared State

### Task 4.1: Typed API Client (`lib/api-client.ts`)
- Client-side fetch wrapper handling standard response envelope parsing.
- Automatic JWT token refresh on `401 UNAUTHORIZED`.
- Unified error toast notifications (`Toast`).

### Task 4.2: Global Auth & Active Organization State
- `useAuth()` hook managing current user profile and session.
- `useOrganization()` hook managing active project/tenant scope.

### Task 4.3: Theme & Accent Color System
- `ThemeToggle` component: toggles light/dark/system mode via `next-themes`.
- `ColorToggle` component: updates dynamic CSS HSL variables across 9 accent colors (`default`, `amber`, `blue`, `cyan`, `emerald`, `fuchsia`, `green`, `violet`, `purple`).

---

## 6. PHASE 5: Frontend Page-by-Page Specifications

All pages MUST be placed under `app/(protected)/` using the shared `AppSidebar` + `AppHeader` layout shell, obeying the Zero Hardcoded Colors rule (`docs/Design.md`).

### Page 5.1: Authentication & Onboarding (`app/(auth)/`)
- **Routes**: `/login`, `/register`, `/invite/[token]`.
- **UI Components**: `Card`, `Field`, `Input`, `Button`, `Alert`.
- **Functionality**: Email/password authentication, registration, company invite acceptance, JWT cookie storage.

### Page 5.2: Executive Dashboard (`app/(protected)/dashboard/page.tsx`)
- **UI Components**: Metric Summary Cards (`Card`), Test Execution Trend Chart (`bg-chart-1` through `5`), Recent Executions Table, Quick Action Buttons.
- **Functionality**: Displays total scenarios, workflow suites, pass/fail rates, execution duration metrics, and recent test logs.

### Page 5.3: Projects & Workspaces (`app/(protected)/projects/page.tsx`)
- **UI Components**: Tenant Switcher Tabs (Personal vs Organization), Project Cards, Create Project Modal (`Dialog`), Base URL Input.
- **Functionality**: Admin creates/edits projects, sets default viewport resolution, configures environment profiles.

### Page 5.4: Scenario Catalog (`app/(protected)/scenarios/page.tsx`)
- **UI Components**: Scenario Search & Filter Bar, Scenario Grid/Table, Record New Scenario Button, Step Preview Sheet (`Sheet`).
- **Functionality**: Displays recorded scenarios, target relative routes (`/checkout`), step counts, and launch Studio canvas button.

### Page 5.5: Workflow Suite Builder (`app/(protected)/workflows/page.tsx`)
- **UI Components**: Workflow Drag-and-Drop List, Add Scenario Combobox (`Combobox`), Run Workflow Button (`Play`), Step Reorder Handles.
- **Functionality**: Chains multiple scenarios into a sequential workflow test suite running in a single Playwright context.

### Page 5.6: Test Executions History & Live Monitor (`app/(protected)/executions/page.tsx`)
- **UI Components**: Execution Status Badges (`Badge`), Execution Detail Drawer, SSE Real-Time Progress Stream, Failure Screenshot Modal (`Dialog`).
- **Functionality**: Live monitoring of running replays, step-by-step pass/fail logs, healed selector badges, screenshot comparisons.

### Page 5.7: Interactive Studio Recorder (`app/(protected)/projects/[id]/workspace/page.tsx`)
- **UI Components**: Live Browser Canvas Viewport (`img` JPEG SSE stream), Step Inspector Sidebar, Smart Selector Priority Picker, Assertion Modal (`ASSERT_VISIBLE`, `ASSERT_TEXT`, `ASSERT_URL`).
- **Functionality**: Real-time click/type action recording, DOM selector metadata extraction, primary key selection, visual assertion building.

### Page 5.8: Settings & Team Management (`app/(protected)/settings/page.tsx`, `members/page.tsx`)
- **UI Components**: Team Member Role Table, Invite Member Modal (`Dialog`), Environment Variables Table, Integration Package Toggles (GitHub, Slack).
- **Functionality**: Admin invites team members via email tokens, updates roles (`ADMIN`, `QA_ENGINEER`, `VIEWER`), configures environment profiles.

---

## 7. Execution Sequence & Quality Verification Plan

To verify that development proceeds cleanly at every stage:

1. **Database Schema Verification**: Run `npx tsc --noEmit` and verify database seed script inserts clean records.
2. **API Controller Verification**: Test each API endpoint using Zod validation schemas; verify standard JSON response envelope shape and HTTP status codes.
3. **RBAC & Security Audit**: Test endpoints under `VIEWER` and `QA_ENGINEER` roles to confirm `403 FORBIDDEN` is returned on unauthorized write actions.
4. **Idempotency Audit**: Send duplicate requests with identical `Idempotency-Key` headers to ensure state actions execute exactly once.
5. **Frontend UI Audit**: Toggle Light/Dark mode and all 9 Color Accents to verify zero hardcoded color glitches. Ensure `npm run build` passes with zero errors.

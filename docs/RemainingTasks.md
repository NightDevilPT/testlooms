# TestLoom — Remaining Tasks & Integration Roadmap

This document serves as the master tracking checklist for all remaining architectural features, services, and UI components needed to bring TestLoom to full production readiness.

---

## 📌 Master Feature Status Tracker

- [x] **Core Authentication & Sessions** (JWT HTTP-only cookies, direct session table lookup, in-place rotation)
- [x] **RBAC Engine** (Admin, QA Engineer, Viewer permission matrix)
- [x] **Organizations & Team Management** (Members, roles, invite links, removal dialogs)
- [x] **Projects & Workspaces** (CRUD, Ownership filters, base URL ping reachability, backend metrics)
- [x] **Project Details & Environment Profiles** (AES-256 encrypted variables, secret masking)
- [x] **Playwright Studio Canvas** (Live session streaming, step recorder, multi-selector capture, IndexedDB drafts)
- [x] **Test Scenarios Dashboard** (Tabular list UI, debounced search, server-side pagination, one-click execution)
- [x] **Test Executions Dashboard** (Telemetry metrics, duration tracking, step-by-step audit inspection)
- [x] **Backend Telemetry Metrics** (Prisma count aggregations on all feature pages)
- [x] **Phase 2: Environment Variables & Dynamic Pattern Builder Integration**
- [ ] **Phase 1: Workflows Suite Management (`/dashboard/workflows`)**
- [ ] **Phase 3: Multi-Target Code Export Service (`lib/export-service/`)**
- [ ] **Phase 4: CI/CD & Webhook Trigger Integration**
- [ ] **Phase 5: Self-Healing Pipeline & Performance Optimization**

---

## Phase 1: Workflows Suite Management (`/dashboard/workflows`)

### Objective
Allow QA Engineers and Admins to chain multiple test scenarios into end-to-end user journeys (e.g., `Login Scenario` ➔ `Dashboard Navigation` ➔ `Create Organization` ➔ `View Organization Details`) with **in-memory session and cookie continuity** across scenarios.

### Detailed Task Checklist:
1. **Service Layer — `lib/workflows-service/`**:
   - [ ] `types.ts`: Define `WorkflowItem`, `WorkflowScenarioItem`, `CreateWorkflowInput`, `UpdateWorkflowInput`, `WorkflowMetrics`.
   - [ ] `validation.ts`: Zod schemas for workflow creation, updates, and scenario ordering.
   - [ ] `workflows.service.ts`:
     - [ ] `getWorkflows(userId, params)`: Paginated list with search, status filters, and database counts (`totalWorkflows`, `readyCount`, `draftCount`, `totalStepsCount`).
     - [ ] `getWorkflowById(id, userId)`: Fetch single workflow with ordered scenarios.
     - [ ] `createWorkflow(userId, payload)`: Single transaction creating workflow and `workflow_scenarios` entries.
     - [ ] `updateWorkflow(id, userId, payload)`: Update metadata and scenario ordering.
     - [ ] `deleteWorkflow(id, userId)`: Soft-delete workflow and relations.
     - [ ] `executeWorkflow(id, userId)`: Multi-scenario execution runner reusing **one shared Playwright browser context** (preserves cookies/auth across scenarios).
2. **API Layer — `app/api/workflows/`**:
   - [ ] `app/api/workflows/route.ts`:
     - [ ] `GET`: Return paginated workflows with backend metrics envelope via `ResponseService.paginated`.
     - [ ] `POST`: Create workflow with RBAC check (`SCENARIO_RECORD`).
   - [ ] `app/api/workflows/[id]/route.ts`:
     - [ ] `GET`: Single workflow details.
     - [ ] `PATCH`: Update workflow.
     - [ ] `DELETE`: Soft-delete workflow.
   - [ ] `app/api/workflows/[id]/run/route.ts`:
     - [ ] `POST`: Trigger chained workflow execution and record telemetry in `TestExecution`.
3. **Frontend State & Context — `components/context/workflows-context.tsx`**:
   - [ ] React Context managing `workflows`, `selectedWorkflow`, `metrics`, `page`, `totalPages`, `totalItems`, and execution triggers.
4. **UI Dashboard — `components/pages/workflows/`**:
   - [ ] `index.tsx`: Main dashboard page with telemetry metric cards, 350ms debounced search, status filter tabs, project filter, and server-side pagination.
   - [ ] `_components/workflow-list-row.tsx`: Tabular row component showing scenario chain pills, step counts, run CTA, and status badge.
   - [ ] `_components/create-workflow-dialog.tsx`: Modal for creating new workflow suites and selecting initial scenarios.
   - [ ] `_components/workflow-builder-drawer.tsx`: Drawer for visually re-ordering scenarios in the chain (drag-and-drop or up/down arrows).
   - [ ] `_components/workflows-skeleton.tsx`: Dedicated loading skeleton adhering to AGENTS.md §1.3.

---

## Phase 2: Environment Variables & Dynamic Pattern Builder (COMPLETED)

### Objective
Enable scenarios to run flexibly across different deployment stages (*Local*, *Staging*, *Production*) without hardcoding values, and provide a no-code visual pattern builder for unique/formatted data (e.g. unique emails, company names, PAN, CIN, phone numbers).

### Detailed Task Checklist:
1. **Dynamic Pattern & Mask Utility — `lib/utils/pattern-generator.ts`**:
   - [x] Build lightweight, zero-cost token generator function `generateFromMask(mask: string)`:
     - [x] `#` = Random Digit (`0-9`)
     - [x] `A` = Random Uppercase Letter (`A-Z`)
     - [x] `a` = Random Lowercase Letter (`a-z`)
     - [x] `*` = Random Alphanumeric
   - [x] Support dynamic date/timestamp tokens (`{{epochMs}}`, `{{date:YYYYMMDD}}`, `{{timestamp}}`, `{{timestamp:N}}`).
   - [x] Support modulo/fixed-length timestamp slots for strict length limits (PAN 10 chars, CIN 21 chars).
   - [x] Built-in presets for Indian PAN card, CIN registration, unique emails, phones, and order numbers.
2. **Execution Engine Variable Ingestion — `lib/scenarios-service/scenarios.service.ts` & `recorder/route.ts`**:
   - [x] Update `executeScenario(projectId, scenarioId, userId, environmentId?)` to load active `EnvironmentProfile` (or default).
   - [x] Decrypt AES-256 secrets from `EnvironmentProfile.variables`.
   - [x] Substitute `baseUrl` and `{{env.KEY}}` / dynamic tokens in step inputs (`inputConfig.value`, `inputConfig.url`, `assertionConfig.expectedValue`) before passing actions to Playwright.
   - [x] Link `environmentProfileId` on `TestExecution` telemetry record.
   - [x] Update recorder `replay` endpoint to resolve environment variables and dynamic tokens on the fly.
3. **Studio Canvas & Shared Component Integration — `components/shared/pattern-builder-dialog.tsx` & `components/pages/workspace/`**:
   - [x] Visual Pill-based `PatternBuilderDialog` modal with live real-time output preview, token character counter meter, and one-click presets.
   - [x] Active **Environment Selector** dropdown in Studio toolbar (`Project Base`, `Staging`, `Production`, etc.).
   - [x] In Studio step editor (`StepItemCard`), add **"Dynamic Pattern Builder"** button for `TYPE` and `ASSERT` steps.
   - [x] Dynamic indicator badge on Step Card rows when steps contain dynamic tokens (`{{...}}`).
   - [x] Update `useScenarios().runScenario` and API route to support `environmentId`.

---

## Phase 3: Multi-Target Code Export Service (`lib/export-service/`)

### Objective
Generate standalone, production-ready automation scripts from recorded scenarios and workflows so developers can export tests directly into their existing CI/CD or QA codebases.

### Detailed Task Checklist:
1. **Service Layer — `lib/export-service/`**:
   - [ ] `types.ts`: Define `ExportTarget` (`"PLAYWRIGHT_TS" | "PLAYWRIGHT_PYTHON" | "CYPRESS_JS" | "SELENIUM_JS" | "CUCUMBER_BDD"`).
   - [ ] `export.service.ts`:
     - [ ] Playwright TypeScript generator (`test.describe`, `page.locator`, `expect`).
     - [ ] Cypress JavaScript generator (`describe`, `cy.get`, `cy.type`, `should`).
     - [ ] Selenium WebDriver generator (`driver.findElement`, `By.css`).
     - [ ] Cucumber BDD generator (`Feature:`, `Scenario:`, `Given`, `When`, `Then`).
2. **API Layer — `app/api/export/`**:
   - [ ] `POST /api/scenarios/[id]/export`: Export scenario to chosen target framework.
   - [ ] `POST /api/workflows/[id]/export`: Export multi-scenario workflow to single test suite script.
3. **UI Integration**:
   - [ ] Add **"Export Code"** dialog with syntax highlighting and one-click copy button on Scenarios and Workflows pages.

---

## Phase 4: CI/CD & Webhook Trigger Integration

### Objective
Enable running TestLoom scenarios and workflows directly from external CI pipelines (GitHub Actions, GitLab CI, Jenkins) or webhooks.

### Detailed Task Checklist:
1. **API Key Authentication**:
   - [ ] Project-scoped API keys for programmatic headless triggers without web cookies.
2. **Webhook Execution Endpoint**:
   - [ ] `POST /api/v1/projects/[id]/run`: Trigger specific scenario or workflow via POST request.
   - [ ] Support query/body params: `scenarioId`, `workflowId`, `environmentId`.
3. **Execution Status Webhooks**:
   - [ ] Dispatch webhook callback payload to external URLs on test completion (`PASSED` or `FAILED`).

---

## Phase 5: Self-Healing Pipeline & Performance Optimization

### Objective
Harden the execution engine against flaky tests, dynamic DOM changes, and database bottlenecks.

### Detailed Task Checklist:
1. **Self-Healing Selector Cascade Evaluation**:
   - [ ] Verify fallback priority order: `dataTestId` ➔ `id` ➔ `ariaLabel` ➔ `cssSelector` ➔ `xpathSelector` ➔ `text`.
   - [ ] Log healed selectors in `execution_step_results.healedSelector`.
2. **Database Performance**:
   - [ ] Verify composite indexes on `test_executions (projectId, createdAt)` and `workflow_scenarios (workflowId, stepOrder)`.
   - [ ] Test query latency with 10,000+ step result records.

---

## 🚀 Recommended Next Step
Proceed immediately with **Phase 1: Workflows Suite Management (`/dashboard/workflows`)**:
1. Implement `lib/workflows-service/`
2. Create `app/api/workflows/` route handlers
3. Build `components/context/workflows-context.tsx`
4. Build `components/pages/workflows/` dashboard and scenario chain builder UI

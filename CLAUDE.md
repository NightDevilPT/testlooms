<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TestLoom — Repository Rules & Architecture Guidelines

This document is the single source of truth for how code is written, organized, and reviewed in this repository. It applies to every contributor — human or AI agent. When in doubt, follow this file over habit or training data.

**Related documentation:**

- [`docs/overview.md`](./docs/overview.md) — product overview & README-level summary
- [`docs/PRD.md`](./docs/PRD.md) — product requirement document, roles, functional scope
- [`docs/Architecture.md`](./docs/Architecture.md) — system architecture, domain flows, execution engine behavior
- [`docs/Design.md`](./docs/Design.md) — design system specification, semantic tokens, component composition rules
- [`docs/Rule.md`](./docs/Rule.md) — strict development rules, thin API controllers, 2-file service pattern
- [`docs/Memory.md`](./docs/Memory.md) — living AI session memory, completed milestones & state tracker
- [`docs/DbSchema.md`](./docs/DbSchema.md) — full database schema, field reference, sample payloads

---

## 0. Repository Structure

```
testloom/
├── AGENTS.md                          → This file — repository rules
├── CLAUDE.md                          → Mirrors AGENTS.md for Claude-based agents
├── README.md                          → Project overview (see docs/overview.md for full version)
├── docs/
│   ├── overview.md                    → Product overview
│   ├── Architecture.md                → System architecture
│   └── DbSchema.md                    → Database schema reference
├── app/
│   ├── (auth)/                        → Sign up, log in, invite acceptance routes
│   ├── (dashboard)/                   → Projects dashboard, team management
│   │   └── projects/[id]/workspace/   → Studio canvas & recorder
│   ├── api/                           → Thin API route handlers ONLY
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── context/                       → React Context Providers (AuthContext, etc.)
│   ├── ui/                            → Immutable Shadcn / Base-UI primitives
│   ├── shared/                        → Reusable cross-page components
│   └── pages/<page-name>/_components/ → Page-exclusive components
├── middleware/                        → Root API Route Handler Middlewares (rate-limit, idempotency, rbac)
│   ├── <middleware-name>/
│   │   ├── types.ts
│   │   └── <middleware-name>.middleware.ts
│   └── types.ts                       → RouteHandler & RouteHandlerContext types
├── lib/
│   └── <service-name>/
│       ├── types.ts
│       └── <service-name>.service.ts
├── public/
├── components.json                    → shadcn config
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

**Rule:** Any new top-level folder outside this structure requires a documented reason in this file before use. Do not invent new organizational patterns ad hoc.

---

## 1. Component Architecture Rules

### 1.1 Primitive UI Components — `components/ui/` (IMMUTABLE)

- **Never modify, edit, or delete files inside `components/ui/`.**
- These are base Shadcn / Base-UI primitives, generated and updated **only** via the `shadcn` CLI (see `components.json`). Manual edits will be overwritten and cause drift from the design system.
- If a primitive doesn't support a needed variant, **compose it** in `components/shared/` or `components/pages/<page>/_components/` — do not fork or patch the primitive itself.

**Available primitives (`@/components/ui/`):**

| File                | Exports                                                                                                     |
| :------------------ | :---------------------------------------------------------------------------------------------------------- |
| `alert-dialog.tsx`  | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, etc.                                             |
| `alert.tsx`         | `Alert`, `AlertTitle`, `AlertDescription`                                                                   |
| `avatar.tsx`        | `Avatar`, `AvatarImage`, `AvatarFallback`                                                                   |
| `badge.tsx`         | `Badge`                                                                                                     |
| `breadcrumb.tsx`    | `Breadcrumb`, `BreadcrumbItem`, `BreadcrumbLink`, etc.                                                      |
| `button.tsx`        | `Button`, `buttonVariants`                                                                                  |
| `calendar.tsx`      | `Calendar`                                                                                                  |
| `card.tsx`          | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                           |
| `checkbox.tsx`      | `Checkbox`                                                                                                  |
| `combobox.tsx`      | `Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxItem`, etc.                                        |
| `dialog.tsx`        | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, etc.                            |
| `drawer.tsx`        | `Drawer`, `DrawerTrigger`, `DrawerContent`, etc.                                                            |
| `dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuGroup`, etc. |
| `empty.tsx`         | `Empty`, `EmptyTitle`, `EmptyDescription`, `EmptyImage`                                                     |
| `field.tsx`         | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`                                                     |
| `input-group.tsx`   | `InputGroup`, `InputGroupAddon`                                                                             |
| `input-otp.tsx`     | `InputOTP`, `InputOTPGroup`, `InputOTPSlot`                                                                 |
| `input.tsx`         | `Input`                                                                                                     |
| `label.tsx`         | `Label`                                                                                                     |
| `pagination.tsx`    | `Pagination`, `PaginationContent`, `PaginationItem`, etc.                                                   |
| `progress.tsx`      | `Progress`                                                                                                  |
| `scroll-area.tsx`   | `ScrollArea`, `ScrollBar`                                                                                   |
| `select.tsx`        | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`                                     |
| `separator.tsx`     | `Separator`                                                                                                 |
| `sheet.tsx`         | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, etc.                                 |
| `sidebar.tsx`       | `Sidebar`, `SidebarProvider`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, etc.                       |
| `skeleton.tsx`      | `Skeleton`                                                                                                  |
| `textarea.tsx`      | `Textarea`                                                                                                  |
| `toast.tsx`         | `Toast`, `ToastProvider`, `ToastViewport`, etc.                                                             |
| `toggle.tsx`        | `Toggle`                                                                                                    |
| `tooltip.tsx`       | `Tooltip`, `TooltipTrigger`, `TooltipContent`                                                               |

> **This table must stay current.** Whenever a new primitive is added via `shadcn add <component>`, append it to this table in the same change set — see §11.

### 1.2 Shared Global Components — `components/shared/` (REUSABLE)

- Place any component used across **more than one page**: theme switchers, modal wrappers, layout shells, empty states, confirmation dialogs, etc.
- Examples: `theme-toggle.tsx` (`ThemeToggle`), `color-toggle.tsx` (`ColorToggle`), `playwright-studio/playwright-studio.tsx` (`PlaywrightStudio`).
- Must be strictly typed (no `any`), accessible (correct ARIA roles/labels), and reactive to light/dark theme and accent color changes.
- Naming: kebab-case filename, PascalCase export (`theme-toggle.tsx` → `ThemeToggle`).
- **NO BARREL INDEX FILES (`index.ts`):** Never create `index.ts` barrel re-export files in shared component directories. Import components directly from their explicit file path (e.g. `import { PlaywrightStudio } from "@/components/shared/playwright-studio/playwright-studio"`).
- **NO DUPLICATE PAGES:** Public/demo pages must have a single canonical location (e.g. `app/(public)/page.tsx`). Do not create duplicate page routes or alias pages.
- **Every new file added to `components/shared/` must be listed in §11.2 (Shared Components Registry) in the same change set** — do not add a shared component without registering it.

### 1.3 Page-Specific Components — `components/pages/<page-name>/_components/` (LOCAL)

- Anything used on **exactly one page** — forms, skeletons, local layout pieces — belongs here, never in `components/shared/`.
- Example: `components/pages/dashboard/_components/dashboard-skeleton.tsx`, `components/pages/checkout/_components/checkout-form.tsx`.
- `<page-name>` must match the corresponding route segment under `app/(dashboard)/` or `app/(auth)/`.
- **Before adding a new shared component, check whether a page-specific one already exists that could be promoted** — don't duplicate logic between a page-local and a shared version.
- **Every new file added under `components/pages/<page-name>/_components/` must be listed in §11.3 (Page Components Registry) in the same change set.**

### 1.4 Design System & Semantic Color Tokens (NO HARDCODED COLORS)

**Always use semantic tokens** defined in the Shadcn design system / `globals.css`:

| Category          | Tokens                                                                                                                                                                                                                                                                          |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backgrounds       | `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `bg-primary`, `bg-secondary`, `bg-destructive`, `bg-sidebar`, `bg-sidebar-primary`, `bg-sidebar-accent`                                                                                                      |
| Text              | `text-foreground`, `text-card-foreground`, `text-popover-foreground`, `text-muted-foreground`, `text-accent-foreground`, `text-primary-foreground`, `text-secondary-foreground`, `text-sidebar-foreground`, `text-sidebar-primary-foreground`, `text-sidebar-accent-foreground` |
| Borders & Rings   | `border-border`, `border-input`, `border-sidebar-border`, `ring-ring`, `ring-sidebar-ring`                                                                                                                                                                                      |
| Charts / Data Viz | `bg-chart-1` through `bg-chart-5`                                                                                                                                                                                                                                               |

**Never use hardcoded Tailwind color utilities** (`bg-red-500`, `text-blue-600`, `bg-gray-100`, `text-slate-900`, `border-zinc-300`) or raw color values (`#ff0000`, `rgb(...)`, `hsl(...)`) anywhere in component code.

Semantic tokens guarantee every component reacts correctly to light/dark mode and active accent theme without per-component overrides.

### 1.5 Icons Rule — Lucide Icons Only

- **Never write raw `<svg>` tags directly in component code, page files, or primitives.**
- **Always import icons from `lucide-react`** (e.g., `import { Globe, Shield, KeyRound, Zap, Loader2 } from "lucide-react"`).
- Pass standard sizing utilities (`h-4 w-4`, `h-5 w-5`) and semantic theme color classes (`text-muted-foreground`, `text-primary`, `text-foreground`).

### 1.6 No Gradient Colors Rule

- **Never use CSS gradient colors (`bg-gradient-*`, `from-*`, `via-*`, `to-*`) in component code, cards, headers, or page layouts.**
- Use clean, flat solid semantic color tokens (`bg-background`, `bg-card`, `bg-muted`, `bg-accent`, `bg-primary`, `border-border`, `text-foreground`) for all UI surfaces to maintain high contrast, professional accessibility, and flat modern theme consistency across light and dark modes.

---

## 2. Backend Service Layer Rules — `lib/<service-name>/`

Every feature service and integration follows a **strict structured pattern**:

```
lib/<service-name>/
├── types.ts                    → All interfaces, payload models, unions, enums for this service
├── validation.ts               → All Zod validation schemas for this service (when input validation is required)
└── <service-name>.service.ts   → All logic — static or instance methods, one exported service class/object
```

**Rules:**

- **Types (`types.ts`)**: Contains all TypeScript interfaces, request/response DTO types, enums, and JWT payload interfaces.
- **Validation (`validation.ts`)**: Contains all Zod validation schemas. **Crucial Rule**: Every Zod schema defined in `validation.ts` MUST be shared and reused in **both frontend forms** (e.g. `@hookform/resolvers/zod` with React Hook Form) and **backend API route handlers** (zod `.parse()` validation) to guarantee 100% consistent validation across client and server.
- **Service (`<service-name>.service.ts`)**: Contains pure business logic and database queries.
- **No loose utility files** inside a service directory. If a helper is only used by one service, it lives inside that service's `.service.ts` file (private function) or `types.ts` (shared type). If it's used across multiple services, it belongs in `lib/utils.ts`.
- **No business logic outside `lib/`.** Route handlers, page components, and shared components must call into a service — never re-implement query logic, validation, or Playwright orchestration inline.
- Service file names match the folder: `lib/playwright-service/playwright.service.ts` exports the primary automation service class.

> **Naming correction:** the current folder is `lib/playright-service/` (typo). Rename to `lib/playwright-service/` to match the actual technology (`playwright` npm package) and avoid confusion for future contributors and generated imports (`@/lib/playwright-service/...`).

### 2.1 Required Services (aligned to the domain model in `docs/Architecture.md` / `docs/DbSchema.md`)

| Service                      | Responsibility                                                                                                   |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `lib/response-service/`       | Standard API response envelopes (`ok`, `paginated`, `fail`), `HttpStatus`/`ErrorCode` enums & `handleError` strategy |
| `lib/api-client/`            | Client-side HTTP fetch service wrapper (`get`, `post`, `put`, `patch`, `delete`) with cookie credentials & response envelope typing |
| `lib/auth-service/`          | Sign up, login, refresh token issuance/rotation, invite token validation                                         |
| `lib/organizations-service/` | Organization creation, membership, role assignment/invites                                                       |
| `lib/projects-service/`      | Project CRUD, environment profiles, integration packages                                                         |
| `lib/scenarios-service/`     | Scenario CRUD, step recording, `requiredScenarioId` validation                                                   |
| `lib/workflows-service/`     | Workflow CRUD, `workflow_scenarios` ordering                                                                     |
| `lib/playwright-service/`    | Browser context lifecycle, step execution, replay strategy resolution, self-healing selector cascade             |
| `lib/export-service/`        | Code generation per `targetFramework` (Playwright TS / Cypress / Selenium / Cucumber)                            |
| `lib/rbac-service/`          | Central permission-matrix checks (Admin / QA Engineer / Viewer) — the **only** place role checks are implemented |
| `lib/idempotency-service/`   | Request deduplication checking, key locking, response caching, lock release, and expired record purging         |

**Do not duplicate permission logic anywhere else.** Every route handler or server action that needs a role check calls `rbac-service`, never re-derives it from `organization_members.role` directly.

### 2.2 Auth & Session Token Management Rules (`lib/auth-service/`)

- **Single Cookie Rule**: Upon login, signup, or OTP verification, return **ONLY `access_token`** in the HTTP-only cookie. Never set `refresh_token` in client cookies.
- **Direct JWT Token Storage**: Store both `accessToken` and `refreshToken` JWT strings directly in the `refresh_tokens` database table (indexed by `accessToken`).
- **Access-Token-Based Session Lookup**: When an access token is expired or revoked (or upon calling `/api/auth/refresh`), query `refresh_tokens` by `accessToken` to locate the user's active session.
- **Refresh Token Validation & In-Place Rotation**: Check if the associated `refreshToken` in DB is valid (`expiresAt > now` and `revokedAt IS NULL`).
  - If invalid / expired / revoked: Return `HTTP 401 Unauthorized` (`code: "UNAUTHORIZED_SESSION_EXPIRED"`), requiring re-login.
  - If valid: Generate new `accessToken` & `refreshToken`, **update the current user's existing DB session row in-place** (`accessToken`, `refreshToken`, `accessTokenExpiresAt`, `expiresAt`, `updatedAt`), and set the new `access_token` in cookie (do NOT insert a new DB row).

**Every new service folder added under `lib/` must be added to the table above (§2.1) in the same change set, including which `app/api/` routes consume it — see §11.4 (Lib Services Registry).**

---

## 3. API & Middleware Architecture Rules — `app/api/`

### 3.1 Thin Controllers Only

- `app/api/**/route.ts` handlers do exactly three things:
    1. Parse and validate the incoming request (query params, body, headers).
    2. Call one or more `lib/<service-name>/` service methods.
    3. Return a structured JSON response.
- **No Playwright calls, database queries, or business rules directly inside a `route.ts` file.** If a route handler is longer than ~30 lines or contains an `if` branching on business state (not HTTP state), that logic belongs in a service.

### 3.2 Standard Response Shape

All API responses use one consistent envelope so client-side error handling, pagination, and observability stay uniform across every route. **No route handler builds a response object by hand — always go through the shared response builders below.**

```ts
// Success — single resource
{
  success: true,
  statusCode: 200,
  data: T,
  pagination: null,
  meta: {
    responseTimeMs: number,
    startedAt: string,   // ISO timestamp, request received
    endedAt: string      // ISO timestamp, response sent
  }
}

// Success — list/collection resource
{
  success: true,
  statusCode: 200,
  data: T[],
  pagination: {
    page: number,
    pageSize: number,
    totalItems: number,
    totalPages: number,
    hasNext: boolean,
    hasPrevious: boolean
  },
  meta: {
    responseTimeMs: number,
    startedAt: string,
    endedAt: string
  }
}

// Failure
{
  success: false,
  statusCode: number,   // 400, 401, 403, 404, 409, 422, 500, etc.
  data: null,
  pagination: null,
  error: { code: string; message: string },
  meta: {
    responseTimeMs: number,
    startedAt: string,
    endedAt: string
  }
}
```

**Rules:**

- `pagination` is `null` for single-resource responses and non-list endpoints — never omit the key, so client-side types stay consistent across every response.
- `meta` is **always present**, success or failure — `responseTimeMs` is measured from the start of the route handler to just before the response is returned; `startedAt`/`endedAt` are ISO-8601 timestamps.
- Defined in `lib/response-service/types.ts` and `lib/response-service/response.service.ts`:
    - Uses `HttpStatus` and `ErrorCode` enums bound via data-driven `ERROR_REGISTRY`.
    - `ResponseService.ok(data, status?, request?)` → single-resource success
    - `ResponseService.paginated(data, pagination, status?, request?)` → list success
    - `ResponseService.fail(errorCode, message?, request?, details?)` → data-driven failure response
    - `ResponseService.handleError(error, request)` → central exception strategy (ZodError, PrismaError, runtime errors).
- Every `app/api/**/route.ts` handler passes its outputs through `ResponseService` — never returns a raw `NextResponse.json({...})` with an ad hoc shape.

### 3.3 Input Validation

- Every route handler validates its input with a **zod schema** before calling a service. Define request/response schemas alongside the relevant service's `types.ts` (e.g. `lib/scenarios-service/types.ts` exports `createScenarioSchema`).
- Never trust `request.json()` or `searchParams` without parsing through zod first.

### 3.4 Authentication & Authorization in Routes

- Every protected route resolves the current user/session at the top of the handler (via `lib/auth-service/`) before doing anything else.
- Role checks go through `lib/rbac-service/`, called with the resolved user + target resource (project/organization) — never inferred ad hoc from request headers or client-supplied role claims.

### 3.5 API Route Handler Middleware Rules (`middleware/`)

- All Route Handler Middlewares reside under the root `middleware/` folder.
- **Folder per Middleware**: Each middleware has its own directory containing `types.ts` and `<middleware-name>.middleware.ts` (e.g., `middleware/rate-limit/`, `middleware/idempotency/`, `middleware/rbac/`).
- **Single Standard Signature**: Every middleware wrapper uses the signature `middlewareName(handler, options?)`.
- **Full Next.js Signature Support**: Middlewares receive `(request: NextRequest | Request, context?: { params?: Promise<T> | T })` supporting dynamic route parameters seamlessly.

### 3.6 Mandatory Rate Limiting Rule

- **Every API Route Handler MUST be Rate-Limited**: Wrap every route handler export in `app/api/**/route.ts` with `rateLimitMiddleware` from `@/middleware/rate-limit/rate-limit.middleware`.
- **Rate Limit Tiers**:
  - Auth & Sensitive (`signup`, `login`): 10 requests per 60s window (`{ maxRequests: 10, windowSeconds: 60 }`).
  - Standard Writes (`POST`, `PATCH`, `DELETE`): 60 requests per 60s window (`{ maxRequests: 60, windowSeconds: 60 }`).
  - Read Operations (`GET`): 300 requests per 60s window (`{ maxRequests: 300, windowSeconds: 60 }`).

### 3.7 Idempotency & Middleware Verification Rule

- **Idempotency for Mutating Routes**: Every route marked `Yes (key)` in `docs/Api.md` (e.g., `signup`, `create project`, `execute scenario`, `upload file`) MUST be wrapped with `idempotencyMiddleware` from `@/middleware/idempotency/idempotency.middleware`.
- **Middleware Composition & Verification**: Before creating or updating any API route handler (especially `POST`, `PATCH`, `DELETE` mutating operations), verify the exact set of required middlewares (`rateLimitMiddleware`, `idempotencyMiddleware`, `rbacMiddleware`) specified in `docs/Api.md` and compose them onto the handler.

---

## 4. Data & Database Rules

Full schema reference: [`docs/DbSchema.md`](./docs/DbSchema.md).

### 4.1 Audit & Soft-Delete Convention

Every table has: `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`.

- **`deletedAt` must always be `NULLABLE`.** Never mark it `NOT NULL` — that breaks the soft-delete pattern (every row would be permanently "deleted").
- **All queries filter `WHERE deletedAt IS NULL`** unless explicitly querying archived/deleted data (e.g. an admin "trash" view). Encapsulate this filter inside the relevant service, not repeated inline across callers.
- Never hard-delete a row from application code. Deletion = setting `deletedAt` + `deletedBy`.

### 4.2 Ownership Invariants

- `projects.userId` and `projects.organizationId` are both nullable at the schema level, but **exactly one must be set** — enforce this in `lib/projects-service/` before insert/update, not just at the UI layer.
- `test_executions.scenarioId` and `test_executions.workflowId` follow the same rule — exactly one set per run.

### 4.3 JSONB Fields

- `selectorMetadata`, `inputConfig`, `variables`, `config` (on `test_steps`, `environment_profiles`, `integration_packages`) are JSONB. Always validate their shape with a zod schema in the owning service's `types.ts` before writing — never pass raw client JSON straight to the database.

---

## 5. Forms & Validation

- All forms use **`react-hook-form`** with **`@hookform/resolvers`** bridging to a **zod** schema.
- Define the zod schema once, in the relevant service's `types.ts`, and reuse it for both the client-side form resolver and the server-side API validation (§3.3) — one schema, two call sites, never two schemas that can drift apart.
- Use `components/ui/field.tsx` (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`) for consistent field layout and error display — do not hand-roll form field markup.

---

## 6. Test Automation Engine Rules (`lib/playwright-service/`)

These rules encode the behavior described in `docs/Architecture.md` §5–6 — implementers must not deviate without updating that document first.

### 6.1 Browser Context Lifecycle

- **One shared Playwright `BrowserContext` per workflow run — never one per scenario.** Scenarios chained in a workflow must execute sequentially inside the same context so session cookies/auth headers persist.
- A single-scenario run (not part of a workflow) gets its own dedicated context, closed when that scenario's execution completes.
- Always close the browser context in a `finally` block — a crashed step must not leak browser processes.

### 6.2 Replay Strategy Resolution

- Selection controls (`RADIO`, `CHECKBOX`, `SELECT`) default to `DETERMINISTIC_EXACT` and must use Playwright's state-setting APIs (`setChecked(targetState)`, `.check()`, `.selectOption(...)`) — never a blind `.click()` that could toggle to the wrong state.
- Textual/data inputs (`TEXT`, `EMAIL`, `NUMBER`, `AMOUNT`) default to `DYNAMIC_AUTO_GENERATE` — resolve the generation logic (timestamp suffixing, numeric ranges) inside `playwright-service`, not inline in route handlers or components.
- Strategy overrides (`ENVIRONMENT_VARIABLE`, `RANDOM_OPTION`) read from `environment_profiles.variables` — never hardcode environment-specific values in service code.

### 6.3 Self-Healing Selector Pipeline

- Always attempt `test_steps.primaryKey` first, then cascade through the fixed priority order: `testId` → `id` → `name`/`ariaLabel`/`placeholder` → `labelText`/`textContent` → `cssPath`/`xpath` → `tagName`+`classList`.
- On a successful fallback, mark the step result `HEALED`, log `healedSelector` + `healedPriority`, and **update `test_steps.primaryKey`** to the working key so subsequent runs skip the cascade. This write-back must happen inside `playwright-service`, transactionally with the step result log.
- Never skip the cascade order or short-circuit to "any working selector" — the priority order is deliberate (stability over convenience).

### 6.4 Playwright Studio Browser Recording & Replay Engine Rules

- **Native Separate Chromium Window**: Interactive recording runs in a real separate Chromium browser window (`headless: false`) launched via `chromium.launch({ headless: false })`. Never use iframe overlays or client-side canvas image interception for DOM recording.
- **Server-Injected DOM Listeners**: DOM user interactions inside the Chromium window are captured via server-exposed functions (`__testloom_on_click__`, `__testloom_on_change__`, `__testloom_on_scroll__`) and injected init scripts (`page.addInitScript`).
- **Cucumber Gherkin Step Formatting**: Action steps are formatted using standard Gherkin phrasing (`Given I navigate to...`, `When I click on...`, `And I type...`, `And I scroll...`, `Then browser session was closed`).
- **Real-Time Browser Window Lifecycle Tracking**: Event listeners for `page.on('close')`, `context.on('close')`, and `browser.on('disconnected')` update `session.isClosed = true` and broadcast `status: "COMPLETED"` over SSE to reflect window closure in real-time.
- **Automated Replay Completion & Cleanup**: `PlaywrightService.replaySession` executes recorded steps sequentially with a 700ms human delay. Once all steps complete, it automatically closes the Chromium browser window (`session.browser.close()`), logs completion, and transitions status to `COMPLETED`.
- **Vertical Action Timeline UI**: `StudioActionTimeline` displays recorded steps in a vertical timeline layout with continuous connecting guide lines, anchored icon nodes, Gherkin keyword badges (`GIVEN`, `WHEN`, `AND`, `THEN`), timestamp badges, and scrollable locator breakdown panels.

---

## 7. Naming Conventions

| Item                          | Convention                                   | Example                          |
| :---------------------------- | :------------------------------------------- | :------------------------------- |
| Component files               | kebab-case                                   | `dashboard-skeleton.tsx`         |
| Component exports             | PascalCase                                   | `DashboardSkeleton`              |
| Service folders               | kebab-case, suffixed `-service`              | `lib/scenarios-service/`         |
| Service class/object          | PascalCase, suffixed `Service`               | `ScenariosService`               |
| API route files               | always `route.ts` inside the resource folder | `app/api/projects/[id]/route.ts` |
| Zod schemas                   | camelCase, suffixed `Schema`                 | `createScenarioSchema`           |
| Types/interfaces              | PascalCase                                   | `TestStep`, `ExecutionStatus`    |
| Enums / union string literals | SCREAMING_SNAKE_CASE values                  | `"DETERMINISTIC_EXACT"`          |

---

## 8. TypeScript & Type Safety

- `any` is not allowed except when explicitly justified with a `// eslint-disable-next-line` and a comment explaining why (e.g. untyped third-party payload pending a schema).
- Every service method has an explicit return type — do not rely on inference for public service APIs.
- Shared domain types (e.g. `Role`, `ScenarioStatus`, `ExecutionStatus`) live in the owning service's `types.ts` and are imported elsewhere — never redefined locally.

---

## 9. Linting & Formatting

- Run `npm run lint` before committing; CI rejects lint failures.
- Do not disable ESLint rules repo-wide in `eslint.config.mjs` to work around a single file — use scoped inline disables with justification instead.

---

## 11. Registering New Additions (MANDATORY)

**This file is a living inventory, not a one-time write-up.** Any time new code adds a shadcn primitive, a shared component, a page-specific component, or a `lib/` service, **this file must be updated in the same change set** — an LLM or contributor making the code change is responsible for also making the corresponding documentation edit below. A PR that adds one of these without updating `AGENTS.md` is incomplete.

### 11.1 shadcn / Base-UI Primitives Registry

When `shadcn add <component>` introduces a new file into `components/ui/`, add a row to the table in §1.1 with the filename and its exports. Do this even if the component is only used once — the table must always reflect exactly what exists in `components/ui/`.

### 11.2 Shared Components Registry

Every file in `components/shared/` must appear here:

| File                                             | Export                 | Used By (pages)                 | Purpose                                                 |
| :----------------------------------------------- | :--------------------- | :------------------------------ | :------------------------------------------------------ |
| `theme-toggle.tsx`                               | `ThemeToggle`          | Global (layout)                 | Light/dark mode switch                                  |
| `color-toggle.tsx`                               | `ColorToggle`          | Global (layout)                 | Accent color switch                                     |
| `app-sidebar.tsx`                                | `AppSidebar`           | Dashboard                       | Main navigation sidebar                                 |
| `app-header.tsx`                                 | `AppHeader`            | Dashboard                       | Main top header bar                                     |
| `playwright-studio/playwright-studio.tsx`       | `PlaywrightStudio`     | Public (`app/(public)/page.tsx`)| Master interactive Playwright browser studio container  |
| `playwright-studio/studio-control-bar.tsx`       | `StudioControlBar`     | Internal to PlaywrightStudio    | Studio control bar (URL, record, pause, stop, replay)   |
| `playwright-studio/studio-canvas-player.tsx`     | `StudioCanvasPlayer`   | Internal to PlaywrightStudio    | SSE live browser frame player with click capture        |
| `playwright-studio/studio-action-timeline.tsx`   | `StudioActionTimeline` | Internal to PlaywrightStudio    | Live recorded step inspector timeline                   |
| `playwright-studio/studio-code-exporter.tsx`     | `StudioCodeExporter`   | Internal to PlaywrightStudio    | Multi-framework automated test code exporter modal      |
| `onboarding-modal.tsx`                            | `OnboardingModal`      | Global (`RootProviders`)        | Non-dismissible account type & workspace setup modal    |

_(Add a row every time a new shared component is created. Remove the row if the component is deleted.)_

### 11.3 Page Components Registry

Every folder under `components/pages/` must appear here:

| Page    | Component File   | Export       | Purpose                                        |
| :------ | :--------------- | :----------- | :--------------------------------------------- |
| `login`       | `login/index.tsx`        | `LoginForm`                | Card grid login form with auth context integration |
| `signup`      | `signup/index.tsx`       | `SignupForm`               | Card grid signup form with auth context integration |
| `organization`| `organization/index.tsx` | `OrganizationPageComponent` | Team organization details, member roles, & admin edits |

_(Add a row every time a new page-specific component is created. Group rows by page for readability.)_

### 11.4 Lib Services Registry

This expands on §2.1 — every folder under `lib/` must appear here, including which API routes and pages/components consume it:

| Service                   | Files                               | Consumed By (API routes)            | Consumed By (pages/components)     |
| :------------------------ | :---------------------------------- | :---------------------------------- | :--------------------------------- |
| `lib/utils.ts`            | `utils.ts`                          | —                                   | Global (`cn()` helper)             |
| `lib/api-client/`         | `types.ts`, `validation.ts`, `api-client.service.ts` | Frontend Client HTTP API Calls | React Components / Hooks |
| `lib/auth-service/`      | `types.ts`, `validation.ts`, `auth.service.ts`       | `/api/auth/*`                       | Auth Forms / Client Pages |
| `lib/playwright-service/` | `types.ts`, `playwright.service.ts` | _(to be added as routes are built)_ | Studio workspace, execution runner |

_(Add a row every time a new `lib/<service-name>/` folder is created. Keep the "Consumed By" columns current as routes/components start calling the service — stale entries should be removed during review.)_

### 11.5 What Triggers a Registry Update

| Action                                                  | Registry to update                                                                        |
| :------------------------------------------------------ | :---------------------------------------------------------------------------------------- |
| Run `shadcn add <component>`                            | §1.1 table                                                                                |
| Create a file in `components/shared/`                   | §11.2                                                                                     |
| Create a file in `components/pages/<page>/_components/` | §11.3                                                                                     |
| Create a new folder in `lib/`                           | §2.1 and §11.4                                                                            |
| An existing service gains a new consumer (route/page)   | §11.4 ("Consumed By" columns)                                                             |
| Delete/rename any of the above                          | Remove or update the corresponding row — stale entries are treated as a documentation bug |

---

## 12. Documentation Maintenance

- Any change to the role model, schema, or execution engine behavior **must** be reflected in `docs/Architecture.md` and/or `docs/DbSchema.md` in the same change set — these docs are treated as living specs, not historical snapshots.
- `README.md` stays high-level (product overview, quick start) and links out to `docs/` rather than duplicating detail.
- This file (`AGENTS.md`) must stay in sync with the actual contents of `components/ui/`, `components/shared/`, `components/pages/`, and `lib/` at all times — per §11.

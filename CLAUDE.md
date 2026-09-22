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
- [`docs/Memory.md`](./docs/Memory.md) — living AI session memory, completed milestones & state tracker
- [`docs/DbSchema.md`](./docs/DbSchema.md) — full database schema, field reference, sample payloads

---

## 0. Repository Structure

```
testloom/
├── AGENTS.md                          → Repository rules for AI agents
├── CLAUDE.md                          → This file — mirrors AGENTS.md
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
│   ├── ui/                            → Immutable Shadcn / Base-UI primitives
│   ├── shared/                        → Reusable cross-page components
│   └── pages/<page-name>/_components/ → Page-exclusive components
├── middleware/                        → Root API Route Handler Middlewares (rate-limit, idempotency, rbac)
│   ├── <middleware-name>/
│   │   ├── types.ts
│   │   └── <middleware-name>.middleware.ts
│   ├── types.ts                       → RouteHandler & RouteHandlerContext types
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
| `skeleton.tsx`      | `Skeleton`                                                                                                  |
| `textarea.tsx`      | `Textarea`                                                                                                  |
| `toast.tsx`         | `Toast`, `ToastProvider`, `ToastViewport`, etc.                                                             |
| `toggle.tsx`        | `Toggle`                                                                                                    |
| `tooltip.tsx`       | `Tooltip`, `TooltipTrigger`, `TooltipContent`                                                               |

### 1.2 Shared Global Components — `components/shared/` (REUSABLE)

- Place any component used across **more than one page**: theme switchers, modal wrappers, layout shells, empty states, confirmation dialogs, etc.
- Examples: `theme-toggle.tsx` (`ThemeToggle`), `color-toggle.tsx` (`ColorToggle`).
- Must be strictly typed (no `any`), accessible (correct ARIA roles/labels), and reactive to light/dark theme and accent color changes.
- Naming: kebab-case filename, PascalCase export (`theme-toggle.tsx` → `ThemeToggle`).

### 1.3 Page-Specific Components — `components/pages/<page-name>/_components/` (LOCAL)

- Anything used on **exactly one page** — forms, skeletons, local layout pieces — belongs here, never in `components/shared/`.

### 1.4 Design System & Semantic Color Tokens (NO HARDCODED COLORS)

**Always use semantic tokens** defined in the Shadcn design system / `globals.css`. Never use hardcoded Tailwind color utilities (`bg-red-500`, `#ff0000`, etc.).

---

## 2. Backend Service Layer Rules — `lib/<service-name>/`

Every feature service and integration follows a **strict two-file pattern**:

```
lib/<service-name>/
├── types.ts                    → All interfaces, payload models, unions, enums for this service
└── <service-name>.service.ts   → All logic — static or instance methods, one exported service class/object
```

### 2.1 Required Services

| Service                      | Responsibility                                                                                                   |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `lib/response-service/`       | Standard API response envelopes (`ok`, `paginated`, `fail`), `HttpStatus`/`ErrorCode` enums & `handleError`      |
| `lib/auth-service/`          | Sign up, login, refresh token issuance/rotation, invite token validation                                         |
| `lib/organizations-service/` | Organization creation, membership, role assignment/invites                                                       |
| `lib/projects-service/`      | Project CRUD, environment profiles, integration packages                                                         |
| `lib/scenarios-service/`     | Scenario CRUD, step recording, `requiredScenarioId` validation                                                   |
| `lib/workflows-service/`     | Workflow CRUD, `workflow_scenarios` ordering                                                                     |
| `lib/playwright-service/`    | Browser context lifecycle, step execution, replay strategy resolution, self-healing selector cascade             |
| `lib/export-service/`        | Code generation per `targetFramework` (Playwright TS / Cypress / Selenium / Cucumber)                            |
| `lib/rbac-service/`          | Central permission-matrix checks (Admin / QA Engineer / Viewer) — the **only** place role checks are implemented |
| `lib/idempotency-service/`   | Request deduplication checking, key locking, response caching, lock release, and expired record purging         |

---

## 3. API & Middleware Architecture Rules — `app/api/`

### 3.1 Thin Controllers Only

- `app/api/**/route.ts` handlers do exactly three things:
    1. Parse and validate the incoming request (query params, body, headers).
    2. Call one or more `lib/<service-name>/` service methods.
    3. Return a structured JSON response via `ResponseService`.

### 3.2 Standard Response Shape

All API responses use one consistent envelope formatted by `ResponseService`:

```ts
// Success
{ success: true, statusCode: 200, data: T, pagination: null, meta: { responseTimeMs: number, startedAt: string, endedAt: string } }

// Failure
{ success: false, statusCode: number, data: null, pagination: null, error: { code: string, message: string }, meta: { responseTimeMs: number, startedAt: string, endedAt: string } }
```

### 3.3 API Route Handler Middleware Rules (`middleware/`)

- All Route Handler Middlewares reside under the root `middleware/` folder.
- **Folder per Middleware**: Each middleware has its own directory containing `types.ts` and `<middleware-name>.middleware.ts` (e.g., `middleware/rate-limit/`, `middleware/idempotency/`, `middleware/rbac/`).
- **Single Standard Signature**: Every middleware wrapper uses the signature `middlewareName(handler, options?)`.
- **Full Next.js Signature Support**: Middlewares receive `(request: NextRequest | Request, context?: { params?: Promise<T> | T })` supporting dynamic route parameters seamlessly.

---

## 4. Data & Database Rules

Full schema reference: [`docs/DbSchema.md`](./docs/DbSchema.md).
Audit & Soft-Delete Convention: Every table has `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`. All queries filter `WHERE deletedAt IS NULL`.

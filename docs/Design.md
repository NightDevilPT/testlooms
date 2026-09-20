# TestLoom — Design System & UI Architecture Specification

This document is the **authoritative single source of truth** for all visual design tokens, component composition patterns, typography rules, and UI guidelines in TestLoom.

Every human contributor and AI coding agent **MUST STRICTLY ADHERE** to the guidelines in this file. Arbitrary styling, random hardcoded colors, ad-hoc inline styles, and unapproved UI primitives are strictly prohibited.

---

## 1. Zero Hardcoded Colors Rule (STRICT)

### 🚨 Strict Ban on Hardcoded Colors

- **NEVER** use hardcoded Tailwind color utilities (`bg-red-500`, `text-blue-600`, `bg-gray-100`, `text-slate-900`, `border-zinc-300`, `bg-black`).
- **NEVER** use raw hex, RGB, or HSL values (`#ff0000`, `rgb(0,0,0)`, `hsl(...)`) in component code or inline styles.
- **ALWAYS** use semantic design system tokens defined in `globals.css` and the Shadcn design system.

### Why this rule is mandatory:

TestLoom features dynamic light/dark mode switching (`next-themes`) and real-time color theme accent swapping (`default`, `amber`, `blue`, `cyan`, `emerald`, `fuchsia`, `green`, `violet`, `purple`). Semantic tokens guarantee that every component adapts automatically to theme changes with **zero component-level overrides**.

---

## 2. Semantic Color Token Reference

Always map component styling to these exact semantic tokens:

### 2.1 Surface & Background Tokens

| Token                | Tailwind Class            | Intended Usage                                                  |
| :------------------- | :------------------------ | :-------------------------------------------------------------- |
| `background`         | `bg-background`           | Main page body background behind containers and layouts.        |
| `card`               | `bg-card`                 | Cards, panels, modals, and container surfaces.                  |
| `card-foreground`    | `text-card-foreground`    | Primary text inside card containers.                            |
| `popover`            | `bg-popover`              | Floating popovers, dropdown menus, and tooltips.                |
| `popover-foreground` | `text-popover-foreground` | Text inside popovers and dropdown menus.                        |
| `muted`              | `bg-muted`                | Subtle secondary backgrounds (e.g. table headers, code blocks). |
| `muted-foreground`   | `text-muted-foreground`   | Subtitles, helper text, timestamps, and icons.                  |
| `accent`             | `bg-accent`               | Hover states, active list selections, and subtle highlights.    |
| `accent-foreground`  | `text-accent-foreground`  | Text on hovered/accented elements.                              |

### 2.2 Brand, Interactive & Feedback Tokens

| Token                    | Tailwind Class                       | Intended Usage                                                       |
| :----------------------- | :----------------------------------- | :------------------------------------------------------------------- |
| `primary`                | `bg-primary`, `text-primary`         | Primary action buttons, active navigation indicators, brand accents. |
| `primary-foreground`     | `text-primary-foreground`            | Text rendered on top of `primary` backgrounds.                       |
| `secondary`              | `bg-secondary`                       | Secondary action buttons, badge backgrounds.                         |
| `secondary-foreground`   | `text-secondary-foreground`          | Text rendered on top of `secondary` backgrounds.                     |
| `destructive`            | `bg-destructive`, `text-destructive` | Danger actions, delete buttons, test failure badges, error text.     |
| `destructive-foreground` | `text-destructive-foreground`        | Text rendered on top of `destructive` backgrounds.                   |

### 2.3 Sidebar & Chrome Tokens

| Token                        | Tailwind Class                    | Intended Usage                                            |
| :--------------------------- | :-------------------------------- | :-------------------------------------------------------- |
| `sidebar`                    | `bg-sidebar`                      | Main navigation sidebar background.                       |
| `sidebar-foreground`         | `text-sidebar-foreground`         | Primary text in the navigation sidebar.                   |
| `sidebar-primary`            | `bg-sidebar-primary`              | Active item indicator inside the sidebar.                 |
| `sidebar-primary-foreground` | `text-sidebar-primary-foreground` | Text on active sidebar items.                             |
| `sidebar-accent`             | `bg-sidebar-accent`               | Hover background for sidebar links.                       |
| `sidebar-accent-foreground`  | `text-sidebar-accent-foreground`  | Text on hovered sidebar links.                            |
| `sidebar-border`             | `border-sidebar-border`           | Vertical divider border between sidebar and main content. |

### 2.4 Border, Input & Ring Tokens

| Token    | Tailwind Class  | Intended Usage                                                 |
| :------- | :-------------- | :------------------------------------------------------------- |
| `border` | `border-border` | Standard card dividers, section borders, and table rows.       |
| `input`  | `border-input`  | Form input borders, select box outlines.                       |
| `ring`   | `ring-ring`     | Focus rings for interactive elements (`focus-visible:ring-2`). |

### 2.5 Charts & Data Visualization Tokens
| Token | Tailwind Class | Intended Usage |
| :--- | :--- | :--- |
| `chart-1` | `bg-chart-1`, `text-chart-1`, `stroke-chart-1` | Primary chart series / pass-rate metrics data color. |
| `chart-2` | `bg-chart-2`, `text-chart-2`, `stroke-chart-2` | Secondary chart series / execution duration trends. |
| `chart-3` | `bg-chart-3`, `text-chart-3`, `stroke-chart-3` | Tertiary chart series / scenario execution breakdown. |
| `chart-4` | `bg-chart-4`, `text-chart-4`, `stroke-chart-4` | Quaternary data visualization series. |
| `chart-5` | `bg-chart-5`, `text-chart-5`, `stroke-chart-5` | Quinary data visualization series. |

---

## 3. UI Primitive Rules (`components/ui/` — IMMUTABLE)

- **`components/ui/` is IMMUTABLE.** Never edit, patch, or hand-modify files inside `components/ui/`.
- UI primitives are generated and updated **strictly** via the `shadcn` CLI (`npx shadcn add <component>`).
- If a primitive lacks a needed layout or variant:
    - **Compose it** inside `components/shared/` or `components/pages/<page>/_components/`.
    - **Do NOT fork or edit** the primitive file directly.

### Registered UI Primitives Checklist (`@/components/ui/`):

`alert-dialog`, `alert`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `checkbox`, `combobox`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `input-group`, `input-otp`, `input`, `label`, `pagination`, `progress`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `textarea`, `toast`, `toggle`, `tooltip`.

---

## 4. Typography & Font Hierarchy

TestLoom uses **Inter** (`var(--font-sans)`) as its primary font family across all environments.

### Standard Typography Scale:

| Level                      | Classes                                                                    | Usage                                                              |
| :------------------------- | :------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| **Page Title (H1)**        | `text-2xl font-bold tracking-tight text-foreground`                        | Top heading on main pages (`Projects`, `Scenarios`, `Executions`). |
| **Section Title (H2)**     | `text-lg font-semibold text-foreground`                                    | Section headers inside cards, modal titles, and step group titles. |
| **Subsection Header (H3)** | `text-sm font-semibold text-foreground`                                    | Card subtitles, table column titles, inspector section labels.     |
| **Body Text**              | `text-sm text-foreground`                                                  | Default paragraph text, form input text, modal descriptions.       |
| **Muted Helper Text**      | `text-xs text-muted-foreground`                                            | Timestamps, subtitles, field helper text, badge descriptions.      |
| **Micro Labels**           | `text-[10px] font-semibold tracking-wider text-muted-foreground uppercase` | Sidebar group headers, status indicators, tag labels.              |

---

## 5. Spacing, Radii & Depth

### 5.1 Corner Radii (`border-radius`)

- **Containers & Cards**: `rounded-xl` or `rounded-lg`
- **Buttons, Inputs & Badges**: `rounded-md`
- **Avatars & Status Pills**: `rounded-full`

### 5.2 Shadows & Elevation

- **Floating Popovers / Dropdowns**: `shadow-md border border-border bg-popover`
- **Cards & Surfaces**: `shadow-xs border border-border bg-card`
- **Studio Inspector Panels**: `border-l border-border bg-card/50`

---

## 6. Component Composition Guidelines

### 6.1 Buttons (`Button`)

Use standard `Button` variants from `@/components/ui/button`:

```tsx
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Play } from "lucide-react";

// Primary Action
<Button variant="default" size="md">
  <Plus className="h-4 w-4" />
  New Scenario
</Button>

// Replay Action
<Button variant="secondary" size="sm">
  <Play className="h-3.5 w-3.5" />
  Run Replay
</Button>

// Destructive Action
<Button variant="destructive" size="sm">
  <Trash2 className="h-4 w-4" />
  Delete
</Button>
```

### 6.2 Cards & Containers (`Card`)

Compose card layouts using Shadcn primitives:

```tsx
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

<Card className="hover:border-primary/50 transition-colors">
	<CardHeader className="pb-3">
		<div className="flex items-center justify-between">
			<CardTitle className="text-lg">Checkout Scenario</CardTitle>
			<Badge variant="default">READY</Badge>
		</div>
		<CardDescription>
			Verifies product checkout flow and payment assertion
		</CardDescription>
	</CardHeader>
	<CardContent>
		<p className="text-xs text-muted-foreground">Route: /checkout</p>
	</CardContent>
</Card>;
```

### 6.3 Badges & Status Indicators (`Badge`)

Map test execution statuses to standard badge variants:

| Status                    | Badge Variant & Styling                                                               |
| :------------------------ | :------------------------------------------------------------------------------------ |
| **`PASSED` / `READY`**    | `<Badge variant="default">PASSED</Badge>`                                             |
| **`FAILED`**              | `<Badge variant="destructive">FAILED</Badge>`                                         |
| **`RUNNING` / `PENDING`** | `<Badge variant="secondary">RUNNING</Badge>`                                          |
| **`HEALED`**              | `<Badge variant="outline" className="border-amber-500 text-amber-500">HEALED</Badge>` |

### 6.4 Forms & Input Fields (`Field`)

Always use `components/ui/field.tsx` for consistent form layouts:

```tsx
import {
	Field,
	FieldLabel,
	FieldDescription,
	FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

<Field>
	<FieldLabel htmlFor="targetUrl">Target Base URL</FieldLabel>
	<Input id="targetUrl" placeholder="https://staging.shop.example.com" />
	<FieldDescription>
		Every relative scenario route resolves against this URL.
	</FieldDescription>
	{error && <FieldError>{error.message}</FieldError>}
</Field>;
```

---

## 7. Protected Layout Structure (`app/(protected)`)

The protected area uses a uniform **Sidebar + Header** shell:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ APP HEADER (AppHeader)                                                                 │
│ [SidebarTrigger] │ [Breadcrumb: Dashboard / Projects]                   [User Avatar]  │
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ APP SIDEBAR       │ MAIN CONTENT AREA                                                  │
│ (AppSidebar)      │                                                                    │
│                   │   <h1 className="text-2xl font-bold">Projects</h1>                 │
│ 📁 Projects       │   <p className="text-sm text-muted-foreground">...</p>             │
│ 🧪 Scenarios       │                                                                    │
│ 🔄 Workflows      │   <div className="grid grid-cols-3 gap-6">                        │
│ 🚀 Executions     │     ...                                                        │
│ ⚙️ Settings       │   </div>                                                       │
│ 👥 Team Members   │                                                                    │
└───────────────────┴────────────────────────────────────────────────────────────────────┘
```

---

## 8. Anti-Patterns & Prohibited Code

| Anti-Pattern                         | Bad Example                                                                         | Correct Pattern                                                         |
| :----------------------------------- | :---------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| ❌ Hardcoded color utility           | `<div className="bg-blue-600 text-white">`                                          | `<div className="bg-primary text-primary-foreground">`                  |
| ❌ Raw hex inline style              | `<span style={{ color: "#ff0000" }}>`                                               | `<span className="text-destructive">`                                   |
| ❌ Button inside Button HTML nesting | `<DropdownMenuTrigger><Button><SidebarMenuButton /></Button></DropdownMenuTrigger>` | `<DropdownMenuTrigger render={<SidebarMenuButton render={<div />} />}>` |
| ❌ Direct primitive editing          | Modifying `components/ui/button.tsx`                                                | Compose in `components/shared/`                                         |
| ❌ Ad-hoc pixel heights              | `height: "453px"`                                                                   | Use flex, grid, or Tailwind scale (`h-full`, `min-h-screen`)            |

---

## 9. Developer Checklist Before Committing UI Code

- [ ] Does the component react correctly to **Dark Mode** toggle?
- [ ] Does the component adapt cleanly when switching **Color Theme Accents**?
- [ ] Are all color classes using **semantic tokens** (`bg-background`, `bg-card`, `text-muted-foreground`)?
- [ ] Is there **zero** hardcoded color (`bg-blue-500`, `#123456`) in the diff?
- [ ] Are all new shared components registered in `AGENTS.md` §11.2?
- [ ] Does `npx tsc --noEmit` pass with zero type errors?

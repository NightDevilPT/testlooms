# TestLoom

**No-code / low-code web test automation & recording platform.**

TestLoom lets QA engineers, developers, and product managers record real browser interactions on a live web application, attach visual assertion checkpoints, replay tests automatically, and export the result as executable code — no manual scripting required.

Think of it as: **record like a human → replay like a robot → export like a developer.**

Built as a modern, cloud-native alternative to tools like Bugbug.io, Cypress Studio, and Playwright Codegen.

---

## ✨ Key Features

- **Zero-code recording** — click through your app like a normal user; TestLoom records every action as a reusable test step.
- **Smart replay strategies** — auto-detects input types and picks safe defaults: exact values for checkboxes/radios/dropdowns (business logic), auto-generated unique values for text/email fields (avoids duplicate-key errors on rerun).
- **Self-healing selectors** — every element is fingerprinted with multiple locator signals (test ID, ARIA label, CSS path, XPath, and more). If the UI changes, tests automatically fall back through a priority list instead of breaking.
- **Scenarios & Workflows** — chain individual recorded tests into full end-to-end user journeys, running in a single shared browser session (log in once, stay authenticated through the whole flow).
- **Multi-framework export** — turn any scenario into real code: Playwright (TypeScript), Cypress (JS), Selenium (Python), or Cucumber (Gherkin).
- **Team-ready from day one** — simple 3-role access model (Admin / QA Engineer / Viewer) across personal or company-owned projects.
- **Built-in integrations** — GitHub webhooks, Slack alerts, and email reports per project.

---

## 🧱 Tech Stack

| Layer              | Choice                                                                                                |
| :----------------- | :---------------------------------------------------------------------------------------------------- |
| Framework          | [Next.js](https://nextjs.org) 16 (App Router)                                                         |
| UI                 | [React](https://react.dev) 19, [@base-ui/react](https://base-ui.com), [shadcn](https://ui.shadcn.com) |
| Styling            | [Tailwind CSS](https://tailwindcss.com) 4                                                             |
| Forms & Validation | [react-hook-form](https://react-hook-form.com), [zod](https://zod.dev)                                |
| Automation Engine  | [Playwright](https://playwright.dev)                                                                  |
| Language           | TypeScript                                                                                            |

---

## 🧩 Core Concept

TestLoom organizes test assets into **Scenarios** and **Workflows**:

- A **Scenario** is one recorded test for a specific page or action — e.g. `Login`, `Dashboard View`, `Company Create`.
- A **Workflow** chains multiple scenarios into a complete journey — e.g. `Login` ➔ `Dashboard View` ➔ `Company Create` ➔ `Company View`, all running in one continuous browser session so authentication persists across the whole chain.

---

## 👥 Roles

| Capability                        | Admin | QA Engineer | Viewer |
| :-------------------------------- | :---: | :---------: | :----: |
| Manage team & projects            |  ✅   |     ❌      |   ❌   |
| Record & edit scenarios/workflows |  ✅   |     ✅      |   ❌   |
| Run tests & view results          |  ✅   |     ✅      |   ✅   |
| Export automation code            |  ✅   |     ✅      |   ✅   |

Projects can be **personal** (owned by an individual) or **company-owned** (shared across a team via invite).

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📖 Documentation

| Document                               | Purpose                                                                                     |
| :------------------------------------- | :------------------------------------------------------------------------------------------ |
| [`Architecture.md`](./Architecture.md) | System architecture — roles, flows, execution engine, self-healing pipeline, repo structure |
| [`dbschema.md`](./dbschema.md)         | Full database schema — every table, field, and sample JSON payload                          |
| `AGENTS.md`                            | Repository coding rules and conventions                                                     |

---

## 📁 Repository Structure

```
app/
  (auth)/                                → Sign up, log in, invite acceptance
  (dashboard)/                           → Projects dashboard, team management
  (dashboard)/projects/[id]/workspace/   → Studio canvas & recorder
  api/                                   → Thin API controllers → delegate to lib/ services

components/
  ui/          → Base primitives (Shadcn / Base-UI) — do not edit directly
  shared/      → Global reusable components
  pages/       → Page-exclusive components

lib/
  <service>/
    types.ts
    <service>.service.ts
```

---

## License

Proprietary — internal project.

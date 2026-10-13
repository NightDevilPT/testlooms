"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bug,
  Terminal,
  Play,
  Layers,
  ShieldCheck,
  KeyRound,
  FileCode,
  Copy,
  Check,
  ArrowRight,
  MonitorPlay,
  MousePointerClick,
  RefreshCw,
  Crown,
  FlaskConical,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Code2,
  Lock,
  Zap,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Workflow,
  CheckCheck,
  Download,
  Users,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ColorToggle } from "@/components/shared/color-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/context/auth-context";

export function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Active framework tab for code exporter preview
  const [activeFramework, setActiveFramework] = React.useState<
    "playwright-ts" | "playwright-py" | "cypress" | "selenium" | "cucumber"
  >("playwright-ts");
  const [copiedCode, setCopiedCode] = React.useState(false);

  // Active tab for Studio Feature Deep-Dive
  const [activeFeatureTab, setActiveFeatureTab] = React.useState<
    "recording" | "self-healing" | "sessions" | "dynamic-env"
  >("recording");

  // FAQ Accordion expanded state
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const frameworks = [
    { id: "playwright-ts", name: "Playwright TypeScript", ext: "spec.ts" },
    { id: "playwright-py", name: "Playwright Python", ext: "test_suite.py" },
    { id: "cypress", name: "Cypress", ext: "spec.cy.ts" },
    { id: "selenium", name: "Selenium (Python)", ext: "test_runner.py" },
    { id: "cucumber", name: "Cucumber Gherkin", ext: "scenarios.feature" },
  ] as const;

  const codeSnippets: Record<string, string> = {
    "playwright-ts": `import { test, expect } from '@playwright/test';

test.describe('Automated Checkout Flow', () => {
  test('Complete purchase with resilient self-healed selectors', async ({ page }) => {
    // 1. Navigate to target application route
    await page.goto(process.env.APP_BASE_URL || 'https://demo.app.com/checkout');

    // 2. Type with mapped environment variable
    await page.fill('#customer-email', process.env.USER_EMAIL || 'qa.tester@company.org');

    // 3. Self-healed click with resilient text fallback
    const submitButton = page.locator('button:has-text("Confirm & Pay")');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    // 4. Visual assertion checkpoints
    await expect(page.locator('#order-confirmed-banner')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*checkout\\/success/);
  });
});`,

    "playwright-py": `import os
import re
import pytest
from playwright.sync_api import Page, expect

def test_automated_checkout_flow(page: Page):
    # 1. Navigate to target application route
    base_url = os.environ.get("APP_BASE_URL", "https://demo.app.com/checkout")
    page.goto(base_url)

    # 2. Fill credentials using mapped environment variable
    user_email = os.environ.get("USER_EMAIL", "qa.tester@company.org")
    page.fill("#customer-email", user_email)

    # 3. Click self-healed fallback locator
    submit_btn = page.locator('button:has-text("Confirm & Pay")')
    submit_btn.wait_for(state="visible", timeout=5000)
    submit_btn.click()

    # 4. Visual assertion checkpoints
    expect(page.locator("#order-confirmed-banner")).to_be_visible(timeout=5000)
    expect(page).to_have_url(re.compile(r".*checkout/success"))`,

    cypress: `describe('Automated Checkout Flow', () => {
  it('Completes purchase with resilient self-healed selectors', () => {
    // 1. Navigate to target application route
    const baseUrl = Cypress.env('APP_BASE_URL') || 'https://demo.app.com/checkout';
    cy.visit(baseUrl);

    // 2. Fill credentials using mapped environment variable
    const userEmail = Cypress.env('USER_EMAIL') || 'qa.tester@company.org';
    cy.get('#customer-email').clear().type(userEmail);

    // 3. Self-healed locator click
    cy.contains('button', 'Confirm & Pay').should('be.visible').click();

    // 4. Visual assertion checkpoints
    cy.get('#order-confirmed-banner').should('be.visible');
    cy.url().should('include', 'checkout/success');
  });
});`,

    selenium: `import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
try:
    # 1. Navigate to target application route
    driver.get(os.environ.get("APP_BASE_URL", "https://demo.app.com/checkout"))

    # 2. Fill credentials using mapped environment variable
    email_field = driver.find_element(By.ID, "customer-email")
    email_field.send_keys(os.environ.get("USER_EMAIL", "qa.tester@company.org"))

    # 3. Click with self-healed XPath fallback
    submit_btn = WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Confirm & Pay')]"))
    )
    submit_btn.click()

    # 4. Visual assertion checkpoint
    WebDriverWait(driver, 5).until(
        EC.visibility_of_element_located((By.ID, "order-confirmed-banner"))
    )
finally:
    driver.quit()`,

    cucumber: `Feature: Automated Checkout Flow
  As a QA Engineer
  I want to verify the checkout pipeline without fragile scripts
  So that regressions are detected before every production release

  Scenario: User completes purchase with dynamic credentials
    Given user navigates to base route "/checkout"
    When user inputs decrypted "{{env.USER_EMAIL}}" into "#customer-email"
    And user clicks self-healed locator "button:has-text('Confirm & Pay')"
    Then element "#order-confirmed-banner" should be visible within 5000ms
    And current URL should match "/checkout/success"`,
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeFramework]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const faqs = [
    {
      q: "What is TestLoom and who is it designed for?",
      a: "TestLoom is an enterprise-grade No-Code / Low-Code web test automation platform designed for QA engineers, developers, and product teams. It allows you to record real browser interactions on live web applications, attach visual assertion checkpoints, and execute automated replays without writing fragile boilerplate code.",
    },
    {
      q: "How does the 6-Tier Self-Healing Selector Engine work?",
      a: "Traditional test scripts break as soon as frontend developers change a class name or refactor a component. TestLoom captures a 6-tier locator cascade: testId → id → ariaLabel → textContent → cssPath → tagName. If the primary selector fails during replay, the engine evaluates fallback tiers, executes the step, and automatically updates the database in-place so future runs succeed instantly.",
    },
    {
      q: "What is in-memory session continuity in workflows?",
      a: "Workflows allow chaining multiple scenarios (e.g., Login ➔ Dashboard ➔ Purchase). Unlike standard test runners that clear browser cookies between tests, TestLoom maintains a single shared Playwright browser context in memory. Authentication cookies and JWT headers remain active across scenario boundaries without redundant re-logins.",
    },
    {
      q: "Does TestLoom lock my team into a proprietary runtime?",
      a: "No! Zero vendor lock-in is a core pillar of TestLoom. Every recorded scenario can be exported immediately into native, clean, production-ready code for Playwright (TypeScript & Python), Cypress, Selenium, or Cucumber Gherkin. You can run exported tests anywhere in your existing CI/CD pipelines.",
    },
    {
      q: "How are sensitive credentials and environment variables protected?",
      a: "All environment variables and secret tokens are encrypted with hardware-grade AES-256 GCM in the database. During execution, values are decrypted only inside the runtime memory and automatically sanitized and masked with [REDACTED] across all telemetry logs and screenshots.",
    },
  ];

  return (
    <ScrollArea className="h-screen w-full bg-background">
      <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans select-text">
        {/* Hero Section: Clear Introduction to TestLoom */}
        <section className="py-16 sm:py-24 border-b border-border bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <Badge
              variant="secondary"
              className="gap-2 px-3 py-1 text-xs font-semibold rounded-full border border-border mx-auto inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Next-Gen Web Test Automation Platform</span>
            </Badge>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15] max-w-4xl mx-auto">
              Automate Web Testing.
              <br />
              <span className="text-primary">Without Writing Fragile Scripts.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              TestLoom is a modern cloud &amp; local platform for engineering teams. Record real browser
              journeys on live web applications, let self-healing locators auto-repair broken selectors,
              and export clean, native code to Playwright, Cypress, Selenium, or Cucumber.
            </p>

            {/* Main Action Callouts */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Link
                href="/auth/signup"
                className={buttonVariants({
                  size: "lg",
                  className: "gap-2 font-semibold px-6 shadow-xs cursor-pointer",
                })}
              >
                <span>Start Recording Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/login"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "gap-2 font-medium px-6 cursor-pointer",
                })}
              >
                <span>Sign In to Workspace</span>
              </Link>
            </div>

            {/* Quick Feature Pillars Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 border-t border-border max-w-4xl mx-auto text-left">
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Self-Healing Locators</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  6-tier selector cascade recovers broken steps automatically.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <span>In-Memory Sessions</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Preserve auth cookies across chained workflow scenarios.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-primary shrink-0" />
                  <span>Encrypted Env Profiles</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Hardware AES-256 vault with dynamic pattern generators.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileCode className="h-4 w-4 text-primary shrink-0" />
                  <span>Zero Vendor Lock-In</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  100% native code export for Playwright, Cypress, and Selenium.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why TestLoom? Problem Space vs Solution */}
        <section className="py-16 sm:py-20 border-b border-border bg-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                Why TestLoom?
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Built to Solve Why Traditional Tests Break
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Automated testing shouldn&apos;t feel like maintaining a house of cards. Here is how TestLoom
                systematically eliminates the 4 most common failure modes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Failure 1 */}
              <Card className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Traditional Problem #1
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                    High Maintenance
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Brittle CSS Locators Break on Every UI Tweak
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When frontend engineers rename CSS classes, adjust component layouts, or refactor Tailwind
                  utilities, traditional Selenium and Cypress scripts fail with locator timeouts.
                </p>
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCheck className="h-3.5 w-3.5 text-primary" />
                    <span>The TestLoom Solution: 6-Tier Self-Healing</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Captures a resilient cascade: <code className="text-foreground font-mono">data-testid → id → ariaLabel → text → cssPath → tagName</code>.
                    If a class changes, TestLoom heals automatically and updates the database record.
                  </p>
                </div>
              </Card>

              {/* Failure 2 */}
              <Card className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Traditional Problem #2
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                    Slow Execution
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Redundant Login Flows in Every Test File
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Most test runners clear storage and cookies after each file. Testing a checkout page forces
                  you to re-run the entire login flow over and over, drastically slowing CI/CD pipelines.
                </p>
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCheck className="h-3.5 w-3.5 text-primary" />
                    <span>The TestLoom Solution: In-Memory Workflows</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Chains modular scenarios (Login ➔ Dashboard ➔ Purchase) in a single shared browser context.
                    Authentication cookies remain active in memory without redundant logins.
                  </p>
                </div>
              </Card>

              {/* Failure 3 */}
              <Card className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Traditional Problem #3
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                    Database Conflicts
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Duplicate Key Collisions on Repeated Replays
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hardcoded values like <code className="text-foreground font-mono">&apos;john@test.com&apos;</code> work once, but subsequent test runs
                  fail with unique constraint database collisions (<code className="font-mono">409 Conflict</code>).
                </p>
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCheck className="h-3.5 w-3.5 text-primary" />
                    <span>The TestLoom Solution: Dynamic Pattern Builder</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Bind dynamic tokens like <code className="text-primary font-mono font-bold">{"{{timestamp}}"}</code>, <code className="text-primary font-mono font-bold">{"{{randomEmail}}"}</code>,
                    and hardware-encrypted AES-256 environment profiles to guarantee unique inputs on every run.
                  </p>
                </div>
              </Card>

              {/* Failure 4 */}
              <Card className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Traditional Problem #4
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                    Vendor Lock-in
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Trapped Inside Proprietary Cloud SaaS Silos
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Many recording platforms store tests in proprietary formats. If you cancel your subscription,
                  you lose your entire testing suite and have to rebuild everything from scratch.
                </p>
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCheck className="h-3.5 w-3.5 text-primary" />
                    <span>The TestLoom Solution: 1-Click Code Transpiler</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Transpile any visual scenario into clean, idiomatic Playwright TypeScript/Python, Cypress,
                    Selenium, or Cucumber code to run on your own infrastructure with zero extra fees.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature Deep Dive with Interactive Tab Switcher */}
        <section className="py-16 sm:py-20 border-b border-border bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                Core Capabilities
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                A Unified Studio for Modern Quality Engineering
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Explore the key features that make TestLoom the fastest way to record, maintain, and export tests.
              </p>
            </div>

            {/* Feature Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant={activeFeatureTab === "recording" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFeatureTab("recording")}
                className="text-xs font-semibold cursor-pointer gap-1.5"
              >
                <MonitorPlay className="h-3.5 w-3.5" />
                <span>Live Studio Recorder</span>
              </Button>
              <Button
                variant={activeFeatureTab === "self-healing" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFeatureTab("self-healing")}
                className="text-xs font-semibold cursor-pointer gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>6-Tier Self-Healing</span>
              </Button>
              <Button
                variant={activeFeatureTab === "sessions" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFeatureTab("sessions")}
                className="text-xs font-semibold cursor-pointer gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Workflow Suites</span>
              </Button>
              <Button
                variant={activeFeatureTab === "dynamic-env" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFeatureTab("dynamic-env")}
                className="text-xs font-semibold cursor-pointer gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Env Variables &amp; Vault</span>
              </Button>
            </div>

            {/* Feature Content Display */}
            <Card className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
              {activeFeatureTab === "recording" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      Low-Latency SSE Streaming
                    </Badge>
                    <h3 className="text-2xl font-bold text-foreground">
                      Point, Click, and Record Directly on Live Browser Canvases
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Simply type in your web application&apos;s URL (e.g. staging or local environment). TestLoom
                      spins up an isolated Chromium browser instance on the server and streams viewport frames
                      in real time over Server-Sent Events (SSE).
                    </p>
                    <ul className="space-y-2 text-xs text-foreground/90">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Interactive mouse clicks, typing, uploads, and dropdown selection capture.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Click any element to add Visual Assertions (Visible, Text Match, URL Check).</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>IndexedDB draft synchronization protects recorded work against accidental tab closures.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-lg bg-muted/40 border border-border space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border text-[11px] text-muted-foreground">
                      <span>STUDIO ACTION TIMELINE</span>
                      <span className="text-primary font-bold">● LIVE STREAMING</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-card border border-border flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">1. NAVIGATE</span>
                        <span className="text-muted-foreground">https://demo.app.com/login</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">2. TYPE</span>
                        <span className="text-primary">#email-input → &quot;qa@testloom.dev&quot;</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">3. CLICK</span>
                        <span className="text-muted-foreground">#submit-btn</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">4. ASSERT_URL</span>
                        <span className="text-primary">&quot;/dashboard&quot; (Passed)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === "self-healing" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      Automated DOM Recovery
                    </Badge>
                    <h3 className="text-2xl font-bold text-foreground">
                      6 Prioritized Fallback Tiers Keep Tests Passing
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Frontend code changes should never stop your QA pipeline. If a button&apos;s primary locator
                      breaks, TestLoom automatically cascades through fallback tiers, executes the interaction,
                      and updates your database so future runs pass on the first try.
                    </p>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                      <div className="font-bold text-foreground">Cascade Priority:</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        Priority 1: data-testid<br />
                        Priority 2: id (#element-id)<br />
                        Priority 3: name / aria-label / placeholder<br />
                        Priority 4: textContent (&quot;Sign In&quot;)<br />
                        Priority 5: cssPath / xpath<br />
                        Priority 6: tagName + classList
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg bg-muted/40 border border-border space-y-3 text-xs">
                    <div className="font-bold text-foreground">Self-Healing Execution Log Example:</div>
                    <div className="p-3 rounded bg-card border border-border font-mono text-[11px] space-y-1 text-muted-foreground">
                      <div className="text-destructive">[WARN] Primary selector &apos;#old-btn&apos; not found in DOM.</div>
                      <div className="text-foreground">[INFO] Evaluating Tier 1 (testId)... None.</div>
                      <div className="text-foreground">[INFO] Evaluating Tier 4 (textContent &quot;Submit&quot;)... Matched!</div>
                      <div className="text-primary font-bold">[HEALED] Step execution completed. Updating DB in-place.</div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === "sessions" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      Workflow Pipeline
                    </Badge>
                    <h3 className="text-2xl font-bold text-foreground">
                      Chain Scenarios in One Shared Browser Session
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Build full end-to-end user journeys by chaining independent scenarios together:
                      <code className="text-foreground font-mono"> Login ➔ Dashboard ➔ Company Create ➔ Invoice View</code>.
                    </p>
                    <ul className="space-y-2 text-xs text-foreground/90">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>One shared Playwright browser context created in memory.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Cookies, tokens, and storage state remain active across scenario steps.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Prerequisite Scenario dependencies execute prerequisites automatically.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-lg bg-muted/40 border border-border space-y-2.5 text-xs font-mono">
                    <div className="font-bold text-foreground pb-2 border-b border-border">
                      WORKFLOW EXECUTION PIPELINE
                    </div>
                    <div className="p-2 rounded bg-card border border-border flex items-center justify-between text-[11px]">
                      <span>Scenario 1: Authentication</span>
                      <Badge variant="secondary" className="text-[10px]">Session Active</Badge>
                    </div>
                    <div className="text-center text-muted-foreground">↓ (Cookies &amp; JWT Preserved)</div>
                    <div className="p-2 rounded bg-card border border-border flex items-center justify-between text-[11px]">
                      <span>Scenario 2: Add to Cart</span>
                      <Badge variant="secondary" className="text-[10px]">Active Context</Badge>
                    </div>
                    <div className="text-center text-muted-foreground">↓ (No Re-login Needed)</div>
                    <div className="p-2 rounded bg-card border border-border flex items-center justify-between text-[11px]">
                      <span>Scenario 3: Checkout Complete</span>
                      <Badge variant="secondary" className="text-[10px]">PASSED</Badge>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === "dynamic-env" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      AES-256 GCM Vault
                    </Badge>
                    <h3 className="text-2xl font-bold text-foreground">
                      Dynamic Values &amp; Secure Environment Profiles
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Easily map environment variables to recorded input fields or assertions. TestLoom
                      supports dynamic timestamp masks and random value generation to prevent database duplicate
                      key collisions on replays.
                    </p>
                    <ul className="space-y-2 text-xs text-foreground/90">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>1-Click Bind Env chips directly on test step cards.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Dynamic tokens: {"{{env.KEY}}"}, {"{{timestamp}}"}, {"{{randomEmail}}"}.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>Secrets masked automatically with [REDACTED] in logs and telemetry.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-lg bg-muted/40 border border-border space-y-3 font-mono text-xs">
                    <div className="font-bold text-foreground pb-2 border-b border-border">
                      ENVIRONMENT PROFILES
                    </div>
                    <div className="space-y-2 text-[11px]">
                      <div className="p-2 rounded bg-card border border-border flex items-center justify-between">
                        <span>BASE_URL</span>
                        <span className="text-muted-foreground">https://staging.app.com</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border flex items-center justify-between">
                        <span>API_KEY (🔒 Secret)</span>
                        <span className="text-muted-foreground">••••••••••••••••</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border flex items-center justify-between">
                        <span>USER_EMAIL</span>
                        <span className="text-primary font-bold">qa+{"{{timestamp}}"}@app.com</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Multi-Framework Code Transpiler Showcase */}
        <section className="py-16 sm:py-20 border-b border-border bg-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                Export &amp; Integrate
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Export to Your Favorite Testing Framework
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Every test recorded in TestLoom belongs to you. Transpile visual scenarios into clean, native code
                formatted for your existing test runner with zero extra dependencies.
              </p>
            </div>

            {/* Framework Selector Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {frameworks.map((fw) => (
                <Button
                  key={fw.id}
                  variant={activeFramework === fw.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFramework(fw.id)}
                  className="text-xs font-medium cursor-pointer gap-1.5"
                >
                  <FileCode className="h-3.5 w-3.5" />
                  <span>{fw.name}</span>
                </Button>
              ))}
            </div>

            {/* Code Viewer Card */}
            <div className="max-w-4xl mx-auto">
              <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="bg-muted/70 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary" />
                    <span className="text-xs font-mono font-medium text-foreground">
                      checkout_test.{frameworks.find((f) => f.id === activeFramework)?.ext}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Native Script
                    </Badge>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-primary" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-4 sm:p-6 bg-card overflow-x-auto">
                  <pre className="text-xs font-mono leading-relaxed text-foreground/90 selection:bg-primary/20">
                    <code>{codeSnippets[activeFramework]}</code>
                  </pre>
                </div>

                <div className="bg-muted/30 px-4 py-2.5 border-t border-border flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span>Run immediately in GitHub Actions, GitLab CI, or local terminal</span>
                  </div>
                  <span className="font-mono">Engine: TestLoom Transpiler</span>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Simplified 3-Role Governance Overview */}
        <section className="py-16 sm:py-20 border-b border-border bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                Access Governance
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Tailored for Engineering Teams of Any Size
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Support both solo developers with Personal Projects and multi-team enterprises with Company
                Organizations governed by a streamlined 3-Role Access Model.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Crown className="size-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">👑 Admin</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Full authority over company organizations, member invites, billing plans, project creation,
                  and environment variable vaults.
                </p>
                <div className="pt-2 border-t border-border text-[11px] text-foreground font-medium">
                  Ideal for: Leads &amp; QA Managers
                </div>
              </Card>

              <Card className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <FlaskConical className="size-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">🧪 QA Engineer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Launch the live browser Studio, record new scenarios, adjust locators, add visual assertion
                  checkpoints, and chain workflow suites.
                </p>
                <div className="pt-2 border-t border-border text-[11px] text-foreground font-medium">
                  Ideal for: SDETs &amp; Automation Testers
                </div>
              </Card>

              <Card className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Eye className="size-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">👁️ Viewer / Developer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Trigger manual test replays, inspect step execution logs and failure screenshots, and export
                  scenarios into native code scripts.
                </p>
                <div className="pt-2 border-t border-border text-[11px] text-foreground font-medium">
                  Ideal for: Software Developers &amp; Stakeholders
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions Accordion */}
        <section className="py-16 sm:py-20 border-b border-border bg-muted/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                Common Questions
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Frequently Asked Questions
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Everything you need to know about TestLoom, self-healing architecture, and code exports.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <Card
                    key={index}
                    className="rounded-xl border border-border bg-card overflow-hidden shadow-xs cursor-pointer transition-colors"
                    onClick={() => toggleFaq(index)}
                  >
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-bold text-foreground">{faq.q}</span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/60">
                        {faq.a}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="py-16 sm:py-20 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs space-y-6">
              <div className="flex justify-center">
                <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Bug className="size-6" />
                </div>
              </div>

              <div className="space-y-3 max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  Ready to Modernize Your Web Test Automation?
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Join QA engineers and developers recording resilient, self-healing browser tests today.
                  Zero setup required.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/auth/signup"
                  className={buttonVariants({
                    size: "lg",
                    className: "gap-2 font-semibold px-6 shadow-xs cursor-pointer",
                  })}
                >
                  <span>Start Recording Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/login"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "gap-2 font-medium px-6 cursor-pointer",
                  })}
                >
                  <span>Sign In to Existing Workspace</span>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>Free Personal and Team plans</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>100% native code export</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>No credit card required</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Clean Footer */}
        <footer className="w-full border-t border-border bg-card/40 py-8 px-4 sm:px-8 text-xs text-muted-foreground mt-auto">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex aspect-square size-6 items-center justify-center rounded bg-primary text-primary-foreground shadow-xs">
                <Bug className="size-3.5" />
              </div>
              <span className="font-bold text-foreground">TestLoom</span>
              <span>•</span>
              <span>Enterprise Web Test Automation Platform</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <Link href="/auth/login" className="hover:text-foreground transition-colors">
                Sign In
              </Link>
              <span>•</span>
              <Link href="/auth/signup" className="hover:text-foreground transition-colors">
                Sign Up
              </Link>
              <span>•</span>
              <Link href="/dashboard/projects" className="hover:text-foreground transition-colors">
                Projects Console
              </Link>
              <span>•</span>
              <span>© {new Date().getFullYear()} TestLoom</span>
            </div>
          </div>
        </footer>
      </div>
    </ScrollArea>
  );
}

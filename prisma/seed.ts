import "dotenv/config";
import prisma from "../lib/db/prisma";
import { UserRole, AccountType, ScenarioStatus, ExecutionStatus, TriggerType, ActionType, StepResultStatus, OwnershipType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger-service/logger.service";

async function main() {
  logger.info("Starting TestLoom database seed process...", "DatabaseSeed");

  // 1. Clean existing database tables in safe order for foreign keys
  await prisma.executionStepResult.deleteMany();
  await prisma.testExecution.deleteMany();
  await prisma.workflowScenario.deleteMany();
  await prisma.testWorkflow.deleteMany();
  await prisma.testStep.deleteMany();
  await prisma.testScenario.deleteMany();
  await prisma.integrationPackage.deleteMany();
  await prisma.environmentProfile.deleteMany();
  await prisma.project.deleteMany();
  await prisma.orgInvite.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.user.deleteMany();

  logger.info("Cleaned existing database tables.", "DatabaseSeed");

  // 2. Hash default password ("Password123")
  const passwordHash = await bcrypt.hash("Test@123", 10);

  // User 1: NightDevil
  const nightDevilUser = await prisma.user.create({
    data: {
      email: "nightdevilpt@gmail.com",
      password: passwordHash,
      firstName: "Night",
      lastName: "Devil",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isVerified: true,
      status: "ACTIVE",
      accountType: AccountType.ORGANIZATION,
      hasCompletedOnboarding: true,
    },
  });

  // User 2: WhiteDevil
  const whiteDevilUser = await prisma.user.create({
    data: {
      email: "whitedevilpt@gmail.com",
      password: passwordHash,
      firstName: "White",
      lastName: "Devil",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      isVerified: true,
      status: "ACTIVE",
      accountType: AccountType.ORGANIZATION,
      hasCompletedOnboarding: true,
    },
  });

  logger.info(`Created User 1: ${nightDevilUser.email} (ID: ${nightDevilUser.id})`, "DatabaseSeed");
  logger.info(`Created User 2: ${whiteDevilUser.email} (ID: ${whiteDevilUser.id})`, "DatabaseSeed");

  // 3. Create Shared Organization: NightDevil Studio
  const nightOrg = await prisma.organization.create({
    data: {
      name: "NightDevil Studio",
      slug: "nightdevil-studio",
      logoUrl: null,
      plan: "ENTERPRISE",
      gstin: "27AAPCU2081F1Z0",
      pan: "AAPCU2081F",
      cin: "U74999MH2019PTC123456",
      addressLine1: "Building 16, Rajendra Place",
      addressLine2: "3rd Floor, Corporate Tower",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110008",
      country: "India",
      website: "https://nightdevil-studio.com",
      contactEmail: "admin@nightdevil-studio.com",
      contactPhone: "+91 9876543210",
      industry: "Software Automation & Quality Assurance",
      companySize: "11-50 employees",
      createdBy: nightDevilUser.id,
    },
  });

  // Link both users to the Organization
  await prisma.organizationMember.createMany({
    data: [
      {
        organizationId: nightOrg.id,
        userId: nightDevilUser.id,
        role: UserRole.ADMIN,
      },
      {
        organizationId: nightOrg.id,
        userId: whiteDevilUser.id,
        role: UserRole.QA_ENGINEER,
      },
    ],
  });

  logger.info(`Created Organization: ${nightOrg.name} (Slug: ${nightOrg.slug}) with 2 Members.`, "DatabaseSeed");

  // 4. Create 5 Projects (3 Company Org Projects, 2 Personal Projects)
  const project1 = await prisma.project.create({
    data: {
      name: "NightLoom Core Studio",
      description: "Primary web recording & Playwright test scenario execution suite",
      slug: "nightloom-core-studio",
      ownershipType: OwnershipType.COMPANY,
      organizationId: nightOrg.id,
      userId: nightDevilUser.id,
      baseUrl: "https://studio.nightdevil.com",
      defaultViewportWidth: 1440,
      defaultViewportHeight: 900,
      headless: true,
      createdBy: nightDevilUser.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Devil Pay Payment Gateway",
      description: "E-Commerce checkout, subscription renewal & billing verification API",
      slug: "devil-pay-payment-gateway",
      ownershipType: OwnershipType.COMPANY,
      organizationId: nightOrg.id,
      userId: nightDevilUser.id,
      baseUrl: "https://pay.nightdevil.com",
      defaultViewportWidth: 1280,
      defaultViewportHeight: 800,
      headless: true,
      createdBy: nightDevilUser.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "WhiteLoom Web Inspector",
      description: "Live DOM selector recorder & CSS path analyzer tool",
      slug: "whiteloom-web-inspector",
      ownershipType: OwnershipType.COMPANY,
      organizationId: nightOrg.id,
      userId: whiteDevilUser.id,
      baseUrl: "https://inspector.whitedevil.com",
      defaultViewportWidth: 1280,
      defaultViewportHeight: 800,
      headless: true,
      createdBy: whiteDevilUser.id,
    },
  });

  const project4 = await prisma.project.create({
    data: {
      name: "NightDevil Personal Sandbox",
      description: "Standalone experimental automation suite for NightDevil",
      slug: "nightdevil-personal-sandbox",
      ownershipType: OwnershipType.PERSONAL,
      userId: nightDevilUser.id,
      baseUrl: "https://sandbox.nightdevil.com",
      defaultViewportWidth: 1280,
      defaultViewportHeight: 800,
      headless: true,
      createdBy: nightDevilUser.id,
    },
  });

  const project5 = await prisma.project.create({
    data: {
      name: "WhiteDevil Analytics Engine",
      description: "Telemetry aggregation & custom metric dashboard engine",
      slug: "whitedevil-analytics-engine",
      ownershipType: OwnershipType.PERSONAL,
      userId: whiteDevilUser.id,
      baseUrl: "https://analytics.whitedevil.com",
      defaultViewportWidth: 1280,
      defaultViewportHeight: 800,
      headless: true,
      createdBy: whiteDevilUser.id,
    },
  });

  logger.info("Created 5 Projects (3 Company Org + 2 Personal).", "DatabaseSeed");

  // 5. Create Test Scenarios & Steps
  const scenario1 = await prisma.testScenario.create({
    data: {
      projectId: project1.id,
      title: "User Authentication & MFA Login Flow",
      description: "Verifies email login, OTP validation, and JWT token issuance",
      relativeRoute: "/login",
      status: ScenarioStatus.READY,
      tags: ["auth", "mfa", "login", "critical"],
      createdBy: nightDevilUser.id,
    },
  });

  await prisma.testStep.createMany({
    data: [
      {
        scenarioId: scenario1.id,
        stepOrder: 1,
        actionType: ActionType.TYPE,
        primaryKey: "input-email",
        selectorMetadata: { css: "input#email" },
        inputConfig: { value: "nightdevilpt@gmail.com" },
        description: "Enter login email address",
      },
      {
        scenarioId: scenario1.id,
        stepOrder: 2,
        actionType: ActionType.TYPE,
        primaryKey: "input-password",
        selectorMetadata: { css: "input#password" },
        inputConfig: { value: "Password123" },
        description: "Enter password",
      },
      {
        scenarioId: scenario1.id,
        stepOrder: 3,
        actionType: ActionType.CLICK,
        primaryKey: "btn-login-submit",
        selectorMetadata: { css: "button[type='submit']" },
        description: "Click submit login",
      },
    ],
  });

  const scenario2 = await prisma.testScenario.create({
    data: {
      projectId: project2.id,
      title: "Stripe Payment & Checkout Processing",
      description: "Tests adding items to cart, promo code redemption, and card checkout",
      relativeRoute: "/checkout",
      status: ScenarioStatus.READY,
      tags: ["checkout", "payment", "stripe"],
      createdBy: nightDevilUser.id,
    },
  });

  const scenario3 = await prisma.testScenario.create({
    data: {
      projectId: project3.id,
      title: "DOM Inspector Live Element Highlighting",
      description: "Validates canvas overlay highlighting and CSS path selector extraction",
      relativeRoute: "/inspector",
      status: ScenarioStatus.READY,
      tags: ["inspector", "dom"],
      createdBy: whiteDevilUser.id,
    },
  });

  const scenario4 = await prisma.testScenario.create({
    data: {
      projectId: project4.id,
      title: "Experimental Dynamic Input Strategy Test",
      description: "Draft test scenario testing dynamic auto-generation input strategy",
      relativeRoute: "/sandbox",
      status: ScenarioStatus.DRAFT,
      tags: ["experimental", "sandbox"],
      createdBy: nightDevilUser.id,
    },
  });

  const scenario5 = await prisma.testScenario.create({
    data: {
      projectId: project5.id,
      title: "Legacy Analytics Webhook Assertion",
      description: "Deprecated V1 webhook validation endpoint",
      relativeRoute: "/api/v1/analytics",
      status: ScenarioStatus.DEPRECATED,
      tags: ["legacy", "deprecated"],
      createdBy: whiteDevilUser.id,
    },
  });

  logger.info("Created 5 Test Scenarios with step assertions.", "DatabaseSeed");

  // 6. Generate 35+ Historical Test Executions over past 7 days
  logger.info("Generating 35+ historical test executions across past 7 days...", "DatabaseSeed");

  const allProjects = [project1, project2, project3, project4, project5];
  const allScenarios = [scenario1, scenario2, scenario3, scenario4, scenario5];
  const triggerTypes: TriggerType[] = [TriggerType.CI_CD, TriggerType.MANUAL, TriggerType.SCHEDULED, TriggerType.WEBHOOK];

  const now = new Date();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const execDate = new Date(now);
    execDate.setDate(execDate.getDate() - dayOffset);

    // 5 executions per day
    for (let j = 0; j < 5; j++) {
      const proj = allProjects[(dayOffset + j) % allProjects.length];
      const sc = allScenarios[(j + dayOffset) % allScenarios.length];
      const trigger = triggerTypes[(dayOffset + j) % triggerTypes.length];
      const execUser = j % 2 === 0 ? nightDevilUser : whiteDevilUser;

      // 88% pass rate
      const isPassed = Math.random() > 0.12;
      const status: ExecutionStatus = isPassed ? ExecutionStatus.PASSED : ExecutionStatus.FAILED;

      const durationMs = Math.floor(Math.random() * 4800) + 1100; // 1.1s to 5.9s
      const totalSteps = 5;
      const passedSteps = isPassed ? 5 : Math.floor(Math.random() * 4);
      const failedSteps = isPassed ? 0 : 5 - passedSteps;
      const healedSteps = Math.random() > 0.65 ? 1 : 0; // AI self-healing occurrence

      const executionTime = new Date(execDate);
      executionTime.setHours(8 + (j * 2), Math.floor(Math.random() * 59), 0);

      const execution = await prisma.testExecution.create({
        data: {
          projectId: proj.id,
          scenarioId: sc.id,
          status,
          triggerType: trigger,
          startedAt: executionTime,
          completedAt: new Date(executionTime.getTime() + durationMs),
          durationMs,
          totalSteps,
          passedSteps,
          failedSteps,
          healedSteps,
          errorMessage: isPassed ? null : "AssertionError: Expected text 'Payment Complete' but received 'Gateway Timeout'",
          createdAt: executionTime,
          createdBy: execUser.id,
        },
      });

      // Add step results for execution
      if (healedSteps > 0) {
        await prisma.executionStepResult.create({
          data: {
            executionId: execution.id,
            stepOrder: 2,
            actionType: ActionType.CLICK,
            status: StepResultStatus.HEALED,
            durationMs: 380,
            healedSelector: "button[data-testid='submit-checkout-v2']",
            healedPriority: "PRIORITY_AI_SEMANTIC",
            executedAt: executionTime,
            createdBy: execUser.id,
          },
        });
      }
    }
  }

  logger.info("Seed completed successfully!", "DatabaseSeed");
  logger.info("Demo Accounts: 1. nightdevilpt@gmail.com | 2. whitedevilpt@gmail.com", "DatabaseSeed");
}

main()
  .catch((e) => {
    logger.error("Error seeding database:", "DatabaseSeed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

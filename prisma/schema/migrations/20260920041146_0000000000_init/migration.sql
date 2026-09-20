-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'QA_ENGINEER', 'VIEWER');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('PERSONAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('DRAFT', 'READY', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "InputStrategy" AS ENUM ('DETERMINISTIC_EXACT', 'ENVIRONMENT_VARIABLE', 'RANDOM_OPTION', 'DYNAMIC_AUTO_GENERATE');

-- CreateEnum
CREATE TYPE "AssertionType" AS ENUM ('ASSERT_VISIBLE', 'ASSERT_TEXT', 'ASSERT_URL');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StepResultStatus" AS ENUM ('PASSED', 'FAILED', 'HEALED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CLICK', 'TYPE', 'SELECT', 'CHECK', 'UNCHECK', 'HOVER', 'SCROLL', 'KEYPRESS', 'UPLOAD_FILE', 'ASSERT');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GITHUB', 'SLACK', 'EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'CI_CD', 'WEBHOOK');

-- CreateTable
CREATE TABLE "test_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "scenarioId" UUID,
    "workflowId" UUID,
    "environmentProfileId" UUID,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" "TriggerType" NOT NULL DEFAULT 'MANUAL',
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "durationMs" INTEGER,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "passedSteps" INTEGER NOT NULL DEFAULT 0,
    "failedSteps" INTEGER NOT NULL DEFAULT 0,
    "healedSteps" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "test_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_step_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "executionId" UUID NOT NULL,
    "stepId" UUID,
    "stepOrder" INTEGER NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "status" "StepResultStatus" NOT NULL DEFAULT 'PASSED',
    "durationMs" INTEGER,
    "healedSelector" TEXT,
    "healedPriority" TEXT,
    "failureReason" TEXT,
    "screenshotUrl" TEXT,
    "executedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "execution_step_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "requestPath" TEXT NOT NULL,
    "requestParamsHash" TEXT,
    "responseStatusCode" INTEGER,
    "responseBody" JSONB,
    "lockedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "invitedById" UUID,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "acceptedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "org_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "ownershipType" "OwnershipType" NOT NULL DEFAULT 'PERSONAL',
    "userId" UUID,
    "organizationId" UUID,
    "baseUrl" TEXT NOT NULL,
    "defaultViewportWidth" INTEGER NOT NULL DEFAULT 1280,
    "defaultViewportHeight" INTEGER NOT NULL DEFAULT 800,
    "headless" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "environment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "integration_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_scenarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "relativeRoute" TEXT NOT NULL,
    "status" "ScenarioStatus" NOT NULL DEFAULT 'DRAFT',
    "requiredScenarioId" UUID,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "test_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenarioId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "primaryKey" TEXT NOT NULL,
    "selectorMetadata" JSONB NOT NULL DEFAULT '{}',
    "inputConfig" JSONB NOT NULL DEFAULT '{}',
    "assertionConfig" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "screenshotUrl" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "test_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "replacedByToken" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ScenarioStatus" NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "test_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_scenarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflowId" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "workflow_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_executions_projectId_idx" ON "test_executions"("projectId");

-- CreateIndex
CREATE INDEX "test_executions_scenarioId_idx" ON "test_executions"("scenarioId");

-- CreateIndex
CREATE INDEX "test_executions_workflowId_idx" ON "test_executions"("workflowId");

-- CreateIndex
CREATE INDEX "execution_step_results_executionId_idx" ON "execution_step_results"("executionId");

-- CreateIndex
CREATE INDEX "execution_step_results_stepId_idx" ON "execution_step_results"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_idempotencyKey_key" ON "idempotency_records"("idempotencyKey");

-- CreateIndex
CREATE INDEX "idempotency_records_idempotencyKey_idx" ON "idempotency_records"("idempotencyKey");

-- CreateIndex
CREATE INDEX "idempotency_records_expiresAt_idx" ON "idempotency_records"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "org_invites_token_key" ON "org_invites"("token");

-- CreateIndex
CREATE INDEX "org_invites_organizationId_idx" ON "org_invites"("organizationId");

-- CreateIndex
CREATE INDEX "org_invites_email_idx" ON "org_invites"("email");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE INDEX "environment_profiles_projectId_idx" ON "environment_profiles"("projectId");

-- CreateIndex
CREATE INDEX "integration_packages_projectId_idx" ON "integration_packages"("projectId");

-- CreateIndex
CREATE INDEX "test_scenarios_projectId_idx" ON "test_scenarios"("projectId");

-- CreateIndex
CREATE INDEX "test_scenarios_requiredScenarioId_idx" ON "test_scenarios"("requiredScenarioId");

-- CreateIndex
CREATE INDEX "test_steps_scenarioId_idx" ON "test_steps"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "test_steps_scenarioId_stepOrder_key" ON "test_steps"("scenarioId", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "test_workflows_projectId_idx" ON "test_workflows"("projectId");

-- CreateIndex
CREATE INDEX "workflow_scenarios_workflowId_idx" ON "workflow_scenarios"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_scenarios_scenarioId_idx" ON "workflow_scenarios"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_scenarios_workflowId_stepOrder_key" ON "workflow_scenarios"("workflowId", "stepOrder");

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "test_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "test_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_environmentProfileId_fkey" FOREIGN KEY ("environmentProfileId") REFERENCES "environment_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_step_results" ADD CONSTRAINT "execution_step_results_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "test_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_step_results" ADD CONSTRAINT "execution_step_results_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "test_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_profiles" ADD CONSTRAINT "environment_profiles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_packages" ADD CONSTRAINT "integration_packages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_scenarios" ADD CONSTRAINT "test_scenarios_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_scenarios" ADD CONSTRAINT "test_scenarios_requiredScenarioId_fkey" FOREIGN KEY ("requiredScenarioId") REFERENCES "test_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_steps" ADD CONSTRAINT "test_steps_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "test_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_workflows" ADD CONSTRAINT "test_workflows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_scenarios" ADD CONSTRAINT "workflow_scenarios_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "test_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_scenarios" ADD CONSTRAINT "workflow_scenarios_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "test_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

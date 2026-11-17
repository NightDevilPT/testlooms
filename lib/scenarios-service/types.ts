// TestLoom Scenario & Step Service Type Definitions

export type ScenarioStatusType = "DRAFT" | "READY" | "DEPRECATED";

export type ActionType =
  | "CLICK"
  | "TYPE"
  | "SELECT"
  | "CHECK"
  | "UNCHECK"
  | "HOVER"
  | "SCROLL"
  | "KEYPRESS"
  | "UPLOAD_FILE"
  | "ASSERT";

export interface SelectorMetadata {
  cssSelector?: string;
  xpathSelector?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
  placeholder?: string;
  text?: string;
  dataTestId?: string;
  defaultSelector?: "css" | "xpath" | "id" | "dataTestId" | "text";
}

export interface InputConfig {
  value?: string;
  url?: string;
  keyName?: string;
  filePaths?: string[];
  x?: number;
  y?: number;
}

export interface AssertionConfig {
  assertionType?: "ASSERT_VISIBLE" | "ASSERT_TEXT" | "ASSERT_URL";
  expectedValue?: string;
  attributeName?: string;
}

export interface RecordedStep {
  id?: string;
  stepOrder?: number;
  actionType: ActionType;
  primaryKey: string;
  selectorMetadata?: SelectorMetadata;
  inputConfig?: InputConfig;
  assertionConfig?: AssertionConfig;
  description?: string;
  screenshotUrl?: string;
}

export interface CreateScenarioPayload {
  projectId: string;
  title: string;
  description?: string;
  relativeRoute?: string;
  status?: ScenarioStatusType;
  requiredScenarioId?: string | null;
  tags?: string[];
  steps?: RecordedStep[];
}

export interface UpdateScenarioPayload {
  title?: string;
  description?: string;
  relativeRoute?: string;
  status?: ScenarioStatusType;
  requiredScenarioId?: string | null;
  tags?: string[];
  steps?: RecordedStep[];
}

export interface ScenarioMetrics {
  totalScenarios: number;
  readyCount: number;
  draftCount: number;
  totalStepsCount: number;
}

export interface ScenarioFilterOptions {
  projectId?: string;
  userId?: string;
  status?: ScenarioStatusType;
  tag?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "updated" | "title" | "steps";
}

export interface TestScenarioWithSteps {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  relativeRoute: string;
  status: ScenarioStatusType;
  requiredScenarioId: string | null;
  tags: string[];
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  steps: RecordedStep[];
  stepCount?: number;
  project?: {
    id: string;
    name: string;
    baseUrl: string;
  };
}

// ---------------------------------------------------------------------------
// Live scenario runs (progress tracker, streaming, cancel)
// ---------------------------------------------------------------------------

export type RunStatus = "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "CANCELLED";

export type RunStepStatus =
  | "PENDING"
  | "RUNNING"
  | "PASSED"
  | "FAILED"
  | "HEALED"
  | "SKIPPED";

export interface RunStepState {
  index: number;
  stepId: string | null;
  actionType: string;
  description: string;
  status: RunStepStatus;
  durationMs: number | null;
  error: string | null;
  healedSelector: string | null;
  healedPriority: string | null;
  /** JPEG data URL captured when the step failed */
  screenshot: string | null;
}

/** Full state of one scenario run, used for the live tracker and for finished runs. */
export interface ExecutionRunSnapshot {
  executionId: string;
  projectId: string;
  projectName: string;
  scenarioId: string | null;
  scenarioTitle: string;
  status: RunStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  currentUrl: string;
  pageTitle: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  healedSteps: number;
  errorMessage: string | null;
  steps: RunStepState[];
  /** Latest browser frame (JPEG data URL), only available while the run is in memory */
  frame: string | null;
  /** True while the run is executing on this server */
  isLive: boolean;
}

/** Counters and page info sent with every step event so the client never has to recompute them. */
export interface RunProgressCounts {
  passedSteps: number;
  failedSteps: number;
  healedSteps: number;
  currentUrl: string;
  pageTitle: string;
}

export type RunEvent =
  | ({ type: "step"; index: number; step: RunStepState } & RunProgressCounts)
  | { type: "frame"; frame: string }
  | { type: "complete"; snapshot: ExecutionRunSnapshot };

export type RunListener = (event: RunEvent) => void;

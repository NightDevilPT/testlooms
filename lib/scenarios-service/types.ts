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

export interface ScenarioFilterOptions {
  projectId: string;
  status?: ScenarioStatusType;
  tag?: string;
  search?: string;
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

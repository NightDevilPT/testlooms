import { Browser, BrowserContext, Page } from 'playwright';

export type ActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'select_option'
  | 'check'
  | 'upload_file'
  | 'hover'
  | 'scroll'
  | 'press_key'
  | 'assert_visible'
  | 'assert_text'
  | 'assert_url';

export interface SmartSelectors {
  testId?: string;
  ariaLabel?: string;
  id?: string;
  css: string;
  xpath: string;
}

export interface ClickedElementInfo {
  tagName: string;
  id: string;
  className: string;
  innerText: string;
  selector: string;
  xpath: string;
  attributes: Record<string, string>;
  outerHTML: string;
  rect?: { x: number; y: number; width: number; height: number };
  coords?: { x: number; y: number };
  timestamp: string;
}

import { SelectorMetadata } from '../scenarios-service/types';

export interface ActionLog {
  id: string;
  type: ActionType;
  description: string;
  details?: string;
  selector?: string;
  selectors?: SmartSelectors;
  xpath?: string;
  elementId?: string;
  className?: string;
  tagName?: string;
  innerText?: string;
  value?: string;
  filePaths?: string[];
  expectedValue?: string;
  key?: string;
  url?: string;
  attributes?: Record<string, string>;
  selectorMetadata?: SelectorMetadata;
  defaultSelector?: 'css' | 'xpath' | 'id' | 'dataTestId' | 'text';
  timestamp: string;
}

export interface PlaywrightSession {
  sessionId: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  currentUrl: string;
  initialUrl?: string;
  pageTitle: string;
  isLoading: boolean;
  isClosed?: boolean;
  isFastForwarding?: boolean;
  viewport: { width: number; height: number };
  latestClickedElement: ClickedElementInfo | null;
  actionLogs: ActionLog[];
  cachedFrame: string | null;
  lastUpdated: number;
  frameUpdateTimer?: NodeJS.Timeout;
  listeners?: Set<(data: any) => void>;
}

/** Filled in by executeStepWithSelfHealing so callers can tell which locator strategy worked. */
export interface StepExecutionOutcome {
  /** 0 = the preferred (default) locator, > 0 = a fallback locator healed the step */
  candidateIndex: number;
  selector?: string;
  strategy?: string;
}

export interface ScenarioRunStepResult {
  status: 'PASSED' | 'FAILED' | 'HEALED';
  durationMs: number;
  error?: string;
  healedSelector?: string;
  healedPriority?: string;
  /** JPEG data URL of the page at the moment a step failed */
  screenshot?: string | null;
}

/** Callbacks used by PlaywrightService.runScenarioSteps to report live progress. */
export interface ScenarioRunHooks {
  isCancelled: () => boolean;
  onStepStart: (index: number, step: ActionLog) => void;
  onStepResult: (index: number, result: ScenarioRunStepResult) => void;
  onFrame?: (frame: string) => void;
  onPage?: (currentUrl: string, pageTitle: string) => void;
}

export interface ScenarioRunOutcome {
  cancelled: boolean;
  /** Index of the first failed step, or null when every step passed */
  failedIndex: number | null;
}

export type SupportedFramework ='playwright' | 'cypress' | 'selenium' | 'cucumber';
export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'csharp';

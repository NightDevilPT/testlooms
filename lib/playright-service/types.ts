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
  viewport: { width: number; height: number };
  latestClickedElement: ClickedElementInfo | null;
  actionLogs: ActionLog[];
  cachedFrame: string | null;
  lastUpdated: number;
  frameUpdateTimer?: NodeJS.Timeout;
}

export type SupportedFramework = 'playwright' | 'cypress' | 'selenium' | 'cucumber';
export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'csharp';

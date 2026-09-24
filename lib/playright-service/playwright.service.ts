import { chromium } from 'playwright';
import {
  ActionLog,
  ClickedElementInfo,
  PlaywrightSession,
  SupportedFramework,
  SupportedLanguage,
} from './types';

export * from './types';

// Global store to persist browser sessions across Next.js dev hot reloads
const globalForPlaywright = globalThis as unknown as {
  __testloom_sessions__?: Map<string, PlaywrightSession>;
};

const sessions =
  globalForPlaywright.__testloom_sessions__ ?? new Map<string, PlaywrightSession>();
if (process.env.NODE_ENV !== 'production') {
  globalForPlaywright.__testloom_sessions__ = sessions;
}

export class PlaywrightService {
  /**
   * Fast frame capture helper
   */
  private static async updateFrameCache(session: PlaywrightSession): Promise<string | null> {
    if (!session || session.page.isClosed() || !session.currentUrl) return null;
    try {
      const buffer = await session.page.screenshot({
        type: 'jpeg',
        quality: 55, // Optimized speed/quality ratio
        fullPage: false,
        animations: 'disabled',
      });
      session.cachedFrame = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      session.lastUpdated = Date.now();
      return session.cachedFrame;
    } catch {
      return session.cachedFrame;
    }
  }

  /**
   * Get or create a Playwright session with high-performance flags
   */
  static async getOrCreateSession(
    sessionId: string = 'default',
    initialUrl?: string
  ): Promise<PlaywrightSession> {
    let session = sessions.get(sessionId);

    if (session && !session.page.isClosed() && !session.isClosed) {
      if (initialUrl && initialUrl !== session.currentUrl && initialUrl !== 'about:blank') {
        await this.navigateSession(sessionId, initialUrl);
      }
      return session;
    }

    if (session) {
      await this.closeSession(sessionId);
    }

    const viewport = { width: 1280, height: 800 };

    // Optimized Chromium launch arguments for maximum speed and rendering
    const isHeadless = process.env.HEADLESS === 'true';
    const browser = await chromium.launch({
      headless: isHeadless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-extensions',
        '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--mute-audio',
      ],
    });

    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TestLoom/1.0',
    });

    const page = await context.newPage();

    const formattedInitialUrl = initialUrl
      ? (initialUrl.startsWith('http://') || initialUrl.startsWith('https://') ? initialUrl : `https://${initialUrl}`)
      : 'https://example.com';

    session = {
      sessionId,
      browser,
      context,
      page,
      currentUrl: formattedInitialUrl,
      initialUrl: formattedInitialUrl,
      pageTitle: 'Loading...',
      isLoading: false,
      isClosed: false,
      viewport,
      latestClickedElement: null,
      actionLogs: [],
      cachedFrame: null,
      lastUpdated: Date.now(),
    };

    sessions.set(sessionId, session);

    // Event listener for Chromium browser window close
    const handleClose = () => {
      const activeSession = sessions.get(sessionId);
      if (activeSession) {
        activeSession.isClosed = true;
        activeSession.pageTitle = 'Browser Window Closed';
        activeSession.lastUpdated = Date.now();
        const lastLog = activeSession.actionLogs[0];
        if (!lastLog || lastLog.description !== 'Then the browser session was closed') {
          activeSession.actionLogs.unshift({
            id: Math.random().toString(36).substring(2, 9),
            type: 'navigate',
            description: 'Then the browser session was closed',
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    };

    page.on('close', handleClose);
    context.on('close', handleClose);
    browser.on('disconnected', handleClose);

    // Expose click handler
    await page.exposeFunction('__testloom_on_click__', (elementData: ClickedElementInfo) => {
      const activeSession = sessions.get(sessionId);
      if (activeSession && !activeSession.isClosed) {
        activeSession.latestClickedElement = elementData;
        activeSession.lastUpdated = Date.now();

        const targetTag = elementData.tagName ? elementData.tagName.toLowerCase() : 'element';
        const textPreview = elementData.innerText ? `"${elementData.innerText.substring(0, 35)}"` : '';
        const identifier = elementData.id ? `#${elementData.id}` : (elementData.selector ? `<${elementData.selector}>` : `<${targetTag}>`);
        const clickDescription = textPreview
          ? `When I click on ${textPreview} (${identifier})`
          : `When I click on element ${identifier}`;

        activeSession.actionLogs.unshift({
          id: Math.random().toString(36).substring(2, 9),
          type: 'click',
          description: clickDescription,
          selector: elementData.selector,
          xpath: elementData.xpath,
          elementId: elementData.id,
          className: elementData.className,
          tagName: elementData.tagName,
          innerText: elementData.innerText,
          details: elementData.selector,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });

    // Expose input & form change handler with smart log deduplication
    await page.exposeFunction('__testloom_on_change__', (data: { selector: string; value: string; type: string; tagName: string; id?: string; className?: string; xpath?: string }) => {
      const activeSession = sessions.get(sessionId);
      if (activeSession && !activeSession.isClosed && data.selector) {
        activeSession.lastUpdated = Date.now();
        const lastLog = activeSession.actionLogs[0];

        const targetTag = data.tagName ? data.tagName.toLowerCase() : 'element';
        const identifier = data.id ? `#${data.id}` : `<${data.selector}>`;
        const changeDescription = data.tagName === 'SELECT'
          ? `And I select option "${data.value}" from dropdown (${identifier})`
          : `And I type "${data.value}" into field (${identifier})`;

        if (lastLog && (lastLog.type === 'type' || lastLog.type === 'select_option') && lastLog.selector === data.selector) {
          lastLog.value = data.value;
          lastLog.description = changeDescription;
          lastLog.timestamp = new Date().toLocaleTimeString();
        } else {
          activeSession.actionLogs.unshift({
            id: Math.random().toString(36).substring(2, 9),
            type: data.tagName === 'SELECT' ? 'select_option' : 'type',
            description: changeDescription,
            selector: data.selector,
            xpath: data.xpath,
            elementId: data.id,
            className: data.className,
            tagName: data.tagName,
            value: data.value,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    });

    // Expose scroll handler with smart log update
    await page.exposeFunction('__testloom_on_scroll__', (scrollData: { scrollY: number; scrollX: number }) => {
      const activeSession = sessions.get(sessionId);
      if (activeSession && !activeSession.isClosed) {
        activeSession.lastUpdated = Date.now();
        const lastLog = activeSession.actionLogs[0];
        const scrollAmount = Math.round(scrollData.scrollY);
        const scrollDescription = `And I scroll down page to ${scrollAmount}px`;

        if (lastLog && lastLog.type === 'scroll') {
          lastLog.value = `${scrollAmount}px`;
          lastLog.description = scrollDescription;
          lastLog.timestamp = new Date().toLocaleTimeString();
        } else {
          activeSession.actionLogs.unshift({
            id: Math.random().toString(36).substring(2, 9),
            type: 'scroll',
            description: scrollDescription,
            value: `${scrollAmount}px`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    });

    // Listen to automatic page navigation events
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (url && url !== 'about:blank' && session && !session.isClosed) {
          session.currentUrl = url;
          try {
            session.pageTitle = await page.title();
          } catch {
            session.pageTitle = url;
          }
          session.lastUpdated = Date.now();
          const lastLog = session.actionLogs[0];
          if (!lastLog || lastLog.type !== 'navigate' || lastLog.value !== url) {
            session.actionLogs.unshift({
              id: Math.random().toString(36).substring(2, 9),
              type: 'navigate',
              description: `Given I navigate to "${url}"`,
              value: url,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        }
      }
    });

    // Inject DOM event listeners into Chromium browser window
    await page.addInitScript(() => {
      const getCssSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const path: string[] = [];
        let current: HTMLElement | null = el;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let selector = current.nodeName.toLowerCase();
          if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
          } else {
            let sibling = current;
            let nth = 1;
            while (sibling.previousElementSibling) {
              sibling = sibling.previousElementSibling as HTMLElement;
              if (sibling.nodeName.toLowerCase() === current.nodeName.toLowerCase()) {
                nth++;
              }
            }
            if (nth !== 1) {
              selector += `:nth-of-type(${nth})`;
            }
          }
          path.unshift(selector);
          current = current.parentElement;
        }
        return path.join(' > ');
      };

      const getXPath = (el: HTMLElement): string => {
        if (el.id) return `//*[@id="${el.id}"]`;
        const parts: string[] = [];
        let current: HTMLElement | null = el;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 1;
          let sibling = current.previousSibling;
          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as HTMLElement).tagName === current.tagName) {
              index++;
            }
            sibling = sibling.previousSibling;
          }
          const tagName = current.tagName.toLowerCase();
          const pathIndex = index > 1 ? `[${index}]` : '';
          parts.unshift(`${tagName}${pathIndex}`);
          current = current.parentElement;
        }
        return parts.length ? '/' + parts.join('/') : '';
      };

      // Helper function to dispatch typing & change events to Playwright
      const dispatchChangeEvent = (target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
        if (!target || !target.tagName) return;
        const selector = getCssSelector(target);
        const value = target.value || '';
        const xpath = getXPath(target);

        if (typeof (window as unknown as { __testloom_on_change__?: (d: Record<string, string>) => void }).__testloom_on_change__ === 'function') {
          (window as unknown as { __testloom_on_change__: (d: Record<string, string>) => void }).__testloom_on_change__({
            selector,
            value,
            type: target.type || 'text',
            tagName: target.tagName,
            id: target.id || '',
            className: typeof target.className === 'string' ? target.className : '',
            xpath,
          });
        }
      };

      // Listen for click events inside browser window
      window.addEventListener(
        'click',
        (e: MouseEvent) => {
          try {
            const target = e.target as HTMLElement;
            if (!target) return;

            const attributes: Record<string, string> = {};
            if (target.attributes) {
              Array.from(target.attributes).forEach((attr) => {
                if (attr.name !== 'style') {
                  attributes[attr.name] = attr.value;
                }
              });
            }

            const rect = target.getBoundingClientRect();

            const info: ClickedElementInfo = {
              tagName: target.tagName,
              id: target.id || '',
              className: typeof target.className === 'string' ? target.className : '',
              innerText: (target.innerText || target.textContent || '').trim().substring(0, 300),
              selector: getCssSelector(target),
              xpath: getXPath(target),
              attributes,
              outerHTML: target.outerHTML ? target.outerHTML.substring(0, 800) : '',
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
              coords: {
                x: Math.round(e.clientX),
                y: Math.round(e.clientY),
              },
              timestamp: new Date().toLocaleTimeString(),
            };

            if (typeof (window as unknown as { __testloom_on_click__?: (d: ClickedElementInfo) => void }).__testloom_on_click__ === 'function') {
              (window as unknown as { __testloom_on_click__: (d: ClickedElementInfo) => void }).__testloom_on_click__(info);
            }
          } catch (err) {
            console.error('TestLoom click listener error:', err);
          }
        },
        true
      );

      // Listen for real-time input typing events with 200ms debounce
      let inputDebounceTimer: ReturnType<typeof setTimeout> | null = null;
      window.addEventListener(
        'input',
        (e: Event) => {
          try {
            const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            if (!target || !target.tagName) return;

            if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
            inputDebounceTimer = setTimeout(() => {
              dispatchChangeEvent(target);
            }, 200);
          } catch (err) {
            console.error('TestLoom input listener error:', err);
          }
        },
        true
      );

      // Listen for blur/change events on form elements
      window.addEventListener(
        'change',
        (e: Event) => {
          try {
            const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            dispatchChangeEvent(target);
          } catch (err) {
            console.error('TestLoom change listener error:', err);
          }
        },
        true
      );

      window.addEventListener(
        'blur',
        (e: FocusEvent) => {
          try {
            const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
              dispatchChangeEvent(target);
            }
          } catch (err) {
            console.error('TestLoom blur listener error:', err);
          }
        },
        true
      );

      // Listen for window scroll events with 250ms debounce
      let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;
      window.addEventListener(
        'scroll',
        () => {
          try {
            if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
            scrollDebounceTimer = setTimeout(() => {
              if (typeof (window as unknown as { __testloom_on_scroll__?: (d: { scrollY: number; scrollX: number }) => void }).__testloom_on_scroll__ === 'function') {
                (window as unknown as { __testloom_on_scroll__: (d: { scrollY: number; scrollX: number }) => void }).__testloom_on_scroll__({
                  scrollY: window.scrollY || window.pageYOffset || 0,
                  scrollX: window.scrollX || window.pageXOffset || 0,
                });
              }
            }, 250);
          } catch (err) {
            console.error('TestLoom scroll listener error:', err);
          }
        },
        { passive: true, capture: true }
      );
    });

    await this.navigateSession(sessionId, formattedInitialUrl);

    return session;
  }

  /**
   * Fast navigate to URL
   */
  static async navigateSession(sessionId: string, url: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    session.isLoading = true;
    session.currentUrl = targetUrl;

    session.actionLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      type: 'navigate',
      description: `Given I navigate to "${targetUrl}"`,
      value: targetUrl,
      url: targetUrl,
      timestamp: new Date().toLocaleTimeString(),
    });

    try {
      await session.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      session.pageTitle = 'Navigation Failed';
      session.actionLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: 'navigate',
        description: `Failed to load ${targetUrl}: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      session.isLoading = false;
      await this.updateFrameCache(session);
    }

    return session;
  }

  /**
   * Fast click at coordinates without artificial delays
   */
  static async clickAtCoords(sessionId: string, x: number, y: number): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    if (!session.currentUrl) return session;

    try {
      await session.page.mouse.click(x, y);
      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (err: unknown) {
      console.error(`Click failed at (${x}, ${y}):`, err);
    }

    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Click element directly by selector
   */
  static async clickElementBySelector(sessionId: string, selector: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    try {
      await session.page.click(selector);
      session.actionLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: 'click',
        description: `When I click on element <${selector}>`,
        selector,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      console.error(`Click failed on selector (${selector}):`, err);
    }
    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Type text into element by selector
   */
  static async typeTextBySelector(sessionId: string, selector: string, text: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    try {
      await session.page.fill(selector, text);
      session.actionLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: 'type',
        description: `And I type "${text}" into field <${selector}>`,
        selector,
        value: text,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      console.error(`Type failed on selector (${selector}):`, err);
    }
    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Select dropdown option by selector
   */
  static async selectDropdownOption(sessionId: string, selector: string, value: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    try {
      await session.page.selectOption(selector, value);
      session.actionLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: 'select_option',
        description: `And I select option "${value}" from dropdown <${selector}>`,
        selector,
        value,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      console.error(`Select option failed on selector (${selector}):`, err);
    }
    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Fast upload files / images to input[type="file"] element
   */
  static async uploadFile(
    sessionId: string,
    selector: string,
    filePaths: string | string[]
  ): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

    try {
      await session.page.setInputFiles(selector, paths);
      const fileNames = paths.map((p) => p.split(/[/\\]/).pop()).join(', ');
      session.actionLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: 'upload_file',
        description: `Uploaded file(s) [${fileNames}] into <${selector}>`,
        selector,
        filePaths: paths,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      console.error(`File upload failed on selector (${selector}):`, err);
    }

    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Upload file via OS file dialog (triggered by clicking custom upload button)
   */
  static async uploadFileWithChooser(
    sessionId: string,
    triggerSelector: string,
    filePaths: string | string[]
  ): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

    try {
      const [fileChooser] = await Promise.all([
        session.page.waitForEvent('filechooser', { timeout: 5000 }),
        session.page.click(triggerSelector),
      ]);
      await fileChooser.setFiles(paths);

      const fileNames = paths.map((p) => p.split(/[/\\]/).pop()).join(', ');
      session.actionLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: 'upload_file',
        description: `Uploaded file(s) [${fileNames}] via button <${triggerSelector}>`,
        selector: triggerSelector,
        filePaths: paths,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      console.error(`File chooser upload failed on trigger (${triggerSelector}):`, err);
    }

    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Hover mouse over element by selector
   */
  static async hoverElement(sessionId: string, selector: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    try {
      await session.page.hover(selector);
      session.actionLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: 'hover',
        description: `Hovered over <${selector}>`,
        selector,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      console.error(`Hover failed on selector (${selector}):`, err);
    }
    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Fast wheel scroll
   */
  static async scrollPage(sessionId: string, deltaX: number, deltaY: number): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    if (!session.currentUrl) return session;

    try {
      await session.page.mouse.wheel(deltaX, deltaY);
    } catch (err: unknown) {
      console.error('Scroll failed:', err);
    }

    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Fast key press
   */
  static async pressKey(sessionId: string, key: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    if (!session.currentUrl) return session;

    try {
      await session.page.keyboard.press(key);
      session.actionLogs.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: 'press_key',
        description: `Pressed key: ${key}`,
        key,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      console.error(`Press key failed (${key}):`, err);
    }

    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Assert element visibility
   */
  static async assertElementVisible(
    sessionId: string,
    selector: string
  ): Promise<{ success: boolean; session: PlaywrightSession }> {
    const session = await this.getOrCreateSession(sessionId);
    let success = false;
    try {
      success = await session.page.isVisible(selector);
    } catch {
      success = false;
    }

    session.actionLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      type: 'assert_visible',
      description: success
        ? `Assertion PASSED: <${selector}> is visible`
        : `Assertion FAILED: <${selector}> is not visible`,
      selector,
      timestamp: new Date().toLocaleTimeString(),
    });

    return { success, session };
  }

  /**
   * Assert element text
   */
  static async assertElementText(
    sessionId: string,
    selector: string,
    expectedText: string
  ): Promise<{ success: boolean; actualText: string; session: PlaywrightSession }> {
    const session = await this.getOrCreateSession(sessionId);
    let actualText = '';
    let success = false;

    try {
      actualText = (await session.page.innerText(selector)).trim();
      success = actualText.includes(expectedText.trim());
    } catch (err) {
      actualText = String(err);
      success = false;
    }

    session.actionLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      type: 'assert_text',
      description: success
        ? `Assertion PASSED: <${selector}> text equals "${expectedText}"`
        : `Assertion FAILED: <${selector}> expected "${expectedText}" but got "${actualText}"`,
      selector,
      expectedValue: expectedText,
      value: actualText,
      timestamp: new Date().toLocaleTimeString(),
    });

    return { success, actualText, session };
  }

  /**
   * Multi-language multi-framework exporter
   */
  static exportToCode(
    steps: ActionLog[],
    suiteName: string = 'TestLoom Test Suite',
    framework: SupportedFramework = 'playwright',
    language: SupportedLanguage = 'typescript'
  ): string {
    if (framework === 'cypress') {
      let code = `describe('${suiteName}', () => {\n  it('executes test flow', () => {\n`;
      steps.forEach((step) => {
        const sel = step.selector || step.details || 'body';
        if (step.type === 'navigate') code += `    cy.visit('${step.url || step.details}');\n`;
        else if (step.type === 'click') code += `    cy.get('${sel}').click();\n`;
        else if (step.type === 'type') code += `    cy.get('${sel}').type('${step.value || ''}');\n`;
        else if (step.type === 'upload_file') code += `    cy.get('${sel}').selectFile(${JSON.stringify(step.filePaths || [])});\n`;
        else if (step.type === 'assert_visible') code += `    cy.get('${sel}').should('be.visible');\n`;
        else if (step.type === 'assert_text') code += `    cy.get('${sel}').should('have.text', '${step.expectedValue || ''}');\n`;
      });
      code += `  });\n});\n`;
      return code;
    }

    if (framework === 'selenium') {
      if (language === 'python') {
        let py = `from selenium import webdriver\nfrom selenium.webdriver.common.by import By\n\n`;
        py += `driver = webdriver.Chrome()\n`;
        steps.forEach((step) => {
          const sel = step.selector || step.details || 'body';
          if (step.type === 'navigate') py += `driver.get("${step.url || step.details}")\n`;
          else if (step.type === 'click') py += `driver.find_element(By.CSS_SELECTOR, "${sel}").click()\n`;
          else if (step.type === 'type') py += `driver.find_element(By.CSS_SELECTOR, "${sel}").send_keys("${step.value || ''}")\n`;
          else if (step.type === 'upload_file') py += `driver.find_element(By.CSS_SELECTOR, "${sel}").send_keys(${JSON.stringify((step.filePaths || [])[0] || '')})\n`;
        });
        py += `driver.quit()\n`;
        return py;
      }
    }

    if (framework === 'cucumber') {
      let gherkin = `Feature: ${suiteName}\n\n  Scenario: Execute automation flow\n`;
      steps.forEach((step) => {
        const sel = step.selector || step.details || 'body';
        if (step.type === 'navigate') gherkin += `    Given I navigate to "${step.url || step.details}"\n`;
        else if (step.type === 'click') gherkin += `    When I click "${sel}"\n`;
        else if (step.type === 'type') gherkin += `    And I enter "${step.value || ''}" into "${sel}"\n`;
        else if (step.type === 'upload_file') gherkin += `    And I attach file "${(step.filePaths || [])[0]}" to "${sel}"\n`;
        else if (step.type === 'assert_visible') gherkin += `    Then element "${sel}" should be visible\n`;
      });
      return gherkin;
    }

    // Default Playwright Exporter (TypeScript & Python)
    if (language === 'python') {
      let py = `from playwright.sync_api import Page, expect\n\n`;
      py += `def test_${suiteName.toLowerCase().replace(/\s+/g, '_')}(page: Page):\n`;
      steps.forEach((step) => {
        const sel = step.selector || step.details || 'body';
        if (step.type === 'navigate') py += `    page.goto("${step.url || step.details}")\n`;
        else if (step.type === 'click') py += `    page.locator("${sel}").click()\n`;
        else if (step.type === 'type') py += `    page.locator("${sel}").fill("${step.value || ''}")\n`;
        else if (step.type === 'upload_file') py += `    page.locator("${sel}").set_input_files(${JSON.stringify(step.filePaths || [])})\n`;
        else if (step.type === 'assert_visible') py += `    expect(page.locator("${sel}")).to_be_visible()\n`;
        else if (step.type === 'assert_text') py += `    expect(page.locator("${sel}")).to_have_text("${step.expectedValue || ''}")\n`;
      });
      return py;
    }

    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test('${suiteName}', async ({ page }) => {\n`;
    steps.forEach((step) => {
      const sel = step.selector || step.details || 'body';
      if (step.type === 'navigate') code += `  await page.goto('${step.url || step.details}');\n`;
      else if (step.type === 'click') code += `  await page.locator('${sel}').click();\n`;
      else if (step.type === 'type') code += `  await page.locator('${sel}').fill('${step.value || ''}');\n`;
      else if (step.type === 'upload_file') code += `  await page.locator('${sel}').setInputFiles(${JSON.stringify(step.filePaths || [])});\n`;
      else if (step.type === 'assert_visible') code += `  await expect(page.locator('${sel}')).toBeVisible();\n`;
      else if (step.type === 'assert_text') code += `  await expect(page.locator('${sel}')).toHaveText('${step.expectedValue || ''}');\n`;
    });
    code += `});\n`;
    return code;
  }

  /**
   * Fast Go Back
   */
  static async goBack(sessionId: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    try {
      await session.page.goBack({ waitUntil: 'domcontentloaded' });
      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (err: unknown) {
      console.error('Go back failed:', err);
    }
    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Fast Go Forward
   */
  static async goForward(sessionId: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    try {
      await session.page.goForward({ waitUntil: 'domcontentloaded' });
      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (err: unknown) {
      console.error('Go forward failed:', err);
    }
    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Fast Reload
   */
  static async reload(sessionId: string): Promise<PlaywrightSession> {
    const session = await this.getOrCreateSession(sessionId);
    try {
      await session.page.reload({ waitUntil: 'domcontentloaded' });
      session.currentUrl = session.page.url();
      session.pageTitle = await session.page.title();
    } catch (err: unknown) {
      console.error('Reload failed:', err);
    }
    await this.updateFrameCache(session);
    return session;
  }

  /**
   * Replay all recorded action steps sequentially from start to finish
   */
  static async replaySession(
    sessionId: string,
    fallbackTargetUrl?: string,
    customActionLogs?: ActionLog[]
  ): Promise<PlaywrightSession> {
    let session = sessions.get(sessionId);

    // If browser session was closed or missing, recreate it using initialUrl or fallbackTargetUrl
    if (!session || session.page.isClosed() || session.isClosed) {
      const initialUrl = fallbackTargetUrl || session?.initialUrl || session?.currentUrl || 'https://example.com';
      session = await this.getOrCreateSession(sessionId, initialUrl);
    }

    const logsToReplay = (customActionLogs && customActionLogs.length > 0)
      ? customActionLogs
      : (session.actionLogs.length > 0 ? session.actionLogs : []);

    if (logsToReplay.length === 0) {
      if (session.currentUrl && session.currentUrl !== 'about:blank') {
        await this.navigateSession(sessionId, session.currentUrl);
      } else if (fallbackTargetUrl) {
        await this.navigateSession(sessionId, fallbackTargetUrl);
      }
      return session;
    }

    // Restore logs on session if customActionLogs was provided
    if (customActionLogs && customActionLogs.length > 0 && session.actionLogs.length === 0) {
      session.actionLogs = [...customActionLogs];
    }

    // Snapshot recorded steps in chronological order (#1 to #N)
    const recordedSteps = [...logsToReplay].reverse();

    // Determine initial target website URL
    const initialNavigateStep = recordedSteps.find((s) => s.type === 'navigate' && s.value && s.value !== 'about:blank');
    const targetUrl = initialNavigateStep?.value || initialNavigateStep?.url || session.initialUrl || (session.currentUrl && session.currentUrl !== 'about:blank' ? session.currentUrl : undefined) || fallbackTargetUrl || 'https://example.com';

    session.isLoading = true;
    session.lastUpdated = Date.now();

    try {
      // 1. First navigate to target URL
      await session.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      session.currentUrl = session.page.url();
      try {
        session.pageTitle = await session.page.title();
      } catch {
        session.pageTitle = targetUrl;
      }

      // 2. Step through each recorded action sequentially with 700ms human delay
      for (const step of recordedSteps) {
        if (session.page.isClosed() || session.isClosed) break;

        await new Promise((res) => setTimeout(res, 700));

        switch (step.type) {
          case 'navigate':
            const navTarget = step.value || step.url;
            if (navTarget && navTarget !== 'about:blank' && navTarget !== session.page.url()) {
              await session.page.goto(navTarget, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            }
            break;

          case 'click':
            if (step.selector) {
              await session.page.click(step.selector, { timeout: 5000 }).catch(async () => {
                if (step.xpath) await session.page.click(step.xpath, { timeout: 3000 }).catch(() => {});
              });
            }
            break;

          case 'type':
            if (step.selector && step.value !== undefined) {
              await session.page.fill(step.selector, step.value, { timeout: 5000 }).catch(() => {});
            }
            break;

          case 'select_option':
            if (step.selector && step.value !== undefined) {
              await session.page.selectOption(step.selector, step.value, { timeout: 5000 }).catch(() => {});
            }
            break;

          case 'scroll':
            const scrollPos = parseInt(step.value || '300', 10) || 300;
            await session.page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollPos).catch(() => {});
            break;

          case 'press_key':
            if (step.key) {
              await session.page.keyboard.press(step.key).catch(() => {});
            }
            break;

          case 'assert_visible':
            if (step.selector) {
              await session.page.isVisible(step.selector).catch(() => {});
            }
            break;

          case 'assert_text':
            if (step.selector) {
              await session.page.innerText(step.selector).catch(() => {});
            }
            break;

          default:
            break;
        }

        session.currentUrl = session.page.url();
        try {
          session.pageTitle = await session.page.title();
        } catch {
          // Ignore title error
        }
        session.lastUpdated = Date.now();
      }

      // 3. Auto-close browser window cleanly after replay completes all steps
      await new Promise((res) => setTimeout(res, 1000));
      if (session && !session.isClosed && !session.page.isClosed()) {
        session.isClosed = true;
        session.pageTitle = 'Replay Completed & Closed';
        session.lastUpdated = Date.now();
        session.actionLogs.unshift({
          id: Math.random().toString(36).substring(2, 9),
          type: 'navigate',
          description: 'Then replay finished and browser window was closed',
          timestamp: new Date().toLocaleTimeString(),
        });
        await this.closeSession(sessionId);
      }
    } catch (err) {
      console.error(`Replay error for session ${sessionId}:`, err);
    } finally {
      session.isLoading = false;
      await this.updateFrameCache(session);
    }

    return session;
  }

  /**
   * Get cached frame instantly without blocking
   */
  static async captureFrame(sessionId: string): Promise<string | null> {
    const session = sessions.get(sessionId);
    if (!session || session.page.isClosed() || !session.currentUrl) return null;
    return await this.updateFrameCache(session);
  }

  /**
   * Get active session metadata
   */
  static getSession(sessionId: string = 'default'): PlaywrightSession | null {
    return sessions.get(sessionId) || null;
  }

  /**
   * Close session cleanly
   */
  static async closeSession(sessionId: string = 'default'): Promise<void> {
    const session = sessions.get(sessionId);
    if (session) {
      try {
        if (session.frameUpdateTimer) clearInterval(session.frameUpdateTimer);
        if (!session.page.isClosed()) await session.page.close();
        await session.context.close();
        await session.browser.close();
      } catch (err: unknown) {
        console.error(`Error closing session ${sessionId}:`, err);
      }
      sessions.delete(sessionId);
    }
  }
}

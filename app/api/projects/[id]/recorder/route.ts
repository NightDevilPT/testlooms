import { NextRequest } from "next/server";
import { PlaywrightService } from "@/lib/playright-service/playwright.service";
import { ActionLog } from "@/lib/playright-service/types";
import { ActionType, AssertionConfig, RecordedStep } from "@/lib/scenarios-service/types";
import { ProjectsService } from "@/lib/projects-service/projects.service";
import ResponseService from "@/lib/response-service/response.service";
import { HttpStatus } from "@/lib/response-service/types";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import { RouteHandlerContext } from "@/middleware/types";

interface Params {
  id: string;
}

/**
 * Convert session action logs into standard RecordedStep objects for the scenario builder
 */
function mapActionLogsToSteps(actionLogs: ActionLog[]): RecordedStep[] {
  const chronological = [...actionLogs].reverse();

  return chronological.map((log, index) => {
    let actionType: ActionType = "CLICK";
    let assertionConfig: AssertionConfig | undefined = undefined;

    switch (log.type) {
      case "navigate":
        actionType = "CLICK";
        break;
      case "click":
        actionType = "CLICK";
        break;
      case "type":
        actionType = "TYPE";
        break;
      case "select_option":
        actionType = "SELECT";
        break;
      case "check":
        actionType = "CHECK";
        break;
      case "upload_file":
        actionType = "UPLOAD_FILE";
        break;
      case "hover":
        actionType = "HOVER";
        break;
      case "scroll":
        actionType = "SCROLL";
        break;
      case "press_key":
        actionType = "KEYPRESS";
        break;
      case "assert_visible":
        actionType = "ASSERT";
        assertionConfig = {
          assertionType: "ASSERT_VISIBLE",
          expectedValue: "visible",
        };
        break;
      case "assert_text":
        actionType = "ASSERT";
        assertionConfig = {
          assertionType: "ASSERT_TEXT",
          expectedValue: log.value || log.expectedValue || "",
        };
        break;
      case "assert_url":
        actionType = "ASSERT";
        assertionConfig = {
          assertionType: "ASSERT_URL",
          expectedValue: log.value || log.url || "",
        };
        break;
      default:
        actionType = "CLICK";
        break;
    }

    const primaryKey = log.selector || log.xpath || log.elementId || log.url || `step-${index + 1}`;

    return {
      id: log.id || `step-${index + 1}`,
      stepOrder: index + 1,
      actionType,
      primaryKey,
      selectorMetadata: {
        cssSelector: log.selector || undefined,
        xpathSelector: log.xpath || undefined,
        id: log.elementId || undefined,
        text: log.innerText || undefined,
        dataTestId: log.attributes?.['data-testid'] || log.attributes?.['data-test-id'] || log.attributes?.['data-qa'] || log.attributes?.['data-cy'] || undefined,
        ariaLabel: log.attributes?.['aria-label'] || undefined,
        placeholder: log.attributes?.['placeholder'] || undefined,
        name: log.attributes?.['name'] || undefined,
      },
      inputConfig: {
        value: log.value,
        url: log.url || (log.type === "navigate" ? log.value : undefined),
        keyName: log.key,
        filePaths: log.filePaths,
      },
      assertionConfig,
      description: log.description,
    };
  });
}

/**
 * GET /api/projects/:id/recorder?sessionId=...
 * Returns active live recorder state, cached frame, and recorded steps
 */
export const GET = rateLimitMiddleware(
  authMiddleware(
    rbacMiddleware(
      async (request: NextRequest | Request, context?: RouteHandlerContext<Params>) => {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
          return ResponseService.unauthorized("Authentication required", request);
        }

        const params = await context?.params;
        const projectId = params?.id;
        if (!projectId) {
          return ResponseService.badRequest("Missing project ID", request);
        }

        const url = new URL(request.url);
        const sessionId = url.searchParams.get("sessionId") || `studio-proj-${projectId}`;

        const session = PlaywrightService.getSession(sessionId);
        if (!session) {
          return ResponseService.ok(
            {
              sessionId,
              isRecording: false,
              isClosed: true,
              currentUrl: "",
              pageTitle: "",
              cachedFrame: null,
              steps: [],
            },
            HttpStatus.OK,
            request
          );
        }

        const steps = mapActionLogsToSteps(session.actionLogs);

        return ResponseService.ok(
          {
            sessionId,
            isRecording: !session.isClosed && !session.page.isClosed(),
            isClosed: session.isClosed || session.page.isClosed(),
            currentUrl: session.currentUrl,
            pageTitle: session.pageTitle,
            cachedFrame: session.cachedFrame,
            steps,
          },
          HttpStatus.OK,
          request
        );
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 300, windowSeconds: 60, keyPrefix: "rl:recorder:get" }
);

/**
 * POST /api/projects/:id/recorder
 * Controls recording session: start, stop, navigate, click, type, replay
 */
export const POST = rateLimitMiddleware(
  authMiddleware(
    rbacMiddleware(
      async (request: NextRequest | Request, context?: RouteHandlerContext<Params>) => {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
          return ResponseService.unauthorized("Authentication required", request);
        }

        const params = await context?.params;
        const projectId = params?.id;
        if (!projectId) {
          return ResponseService.badRequest("Missing project ID", request);
        }

        const project = await ProjectsService.getProjectById(projectId, userId);
        if (!project) {
          return ResponseService.notFound("Project not found", request);
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return ResponseService.badRequest("Invalid JSON request body", request);
        }

        const action = body.action || "start";
        const sessionId = body.sessionId || `studio-proj-${projectId}`;

        if (action === "start") {
          const targetUrl = body.url || project.baseUrl || "https://example.com";
          const viewportWidth = body.viewport?.width || body.viewportWidth || project.defaultViewportWidth || 1280;
          const viewportHeight = body.viewport?.height || body.viewportHeight || project.defaultViewportHeight || 800;

          const session = await PlaywrightService.getOrCreateSession(sessionId, targetUrl, {
            width: Number(viewportWidth),
            height: Number(viewportHeight),
          });
          const steps = mapActionLogsToSteps(session.actionLogs);

          return ResponseService.ok(
            {
              sessionId,
              isRecording: !session.isClosed && !session.page.isClosed(),
              isClosed: session.isClosed || session.page.isClosed(),
              currentUrl: session.currentUrl,
              pageTitle: session.pageTitle,
              cachedFrame: session.cachedFrame,
              steps,
            },
            HttpStatus.OK,
            request
          );
        }

        if (action === "stop") {
          await PlaywrightService.closeSession(sessionId);
          return ResponseService.ok(
            {
              sessionId,
              isRecording: false,
              isClosed: true,
              currentUrl: "",
              pageTitle: "Browser Closed",
              cachedFrame: null,
              steps: [],
            },
            HttpStatus.OK,
            request
          );
        }

        if (action === "navigate") {
          const navUrl = body.url || project.baseUrl;
          const session = await PlaywrightService.navigateSession(sessionId, navUrl);
          const steps = mapActionLogsToSteps(session.actionLogs);

          return ResponseService.ok(
            {
              sessionId,
              isRecording: !session.isClosed && !session.page.isClosed(),
              isClosed: session.isClosed || session.page.isClosed(),
              currentUrl: session.currentUrl,
              pageTitle: session.pageTitle,
              cachedFrame: session.cachedFrame,
              steps,
            },
            HttpStatus.OK,
            request
          );
        }

        if (action === "click") {
          let session;
          if (body.x !== undefined && body.y !== undefined) {
            session = await PlaywrightService.clickAtCoords(sessionId, body.x, body.y);
          } else if (body.selector) {
            session = await PlaywrightService.clickElementBySelector(sessionId, body.selector);
          } else {
            return ResponseService.badRequest("Missing coordinates or selector for click action", request);
          }

          const steps = mapActionLogsToSteps(session.actionLogs);
          return ResponseService.ok(
            {
              sessionId,
              isRecording: !session.isClosed && !session.page.isClosed(),
              isClosed: session.isClosed || session.page.isClosed(),
              currentUrl: session.currentUrl,
              pageTitle: session.pageTitle,
              cachedFrame: session.cachedFrame,
              steps,
            },
            HttpStatus.OK,
            request
          );
        }

        if (action === "type") {
          if (!body.selector || body.value === undefined) {
            return ResponseService.badRequest("Missing selector or value for type action", request);
          }
          const session = await PlaywrightService.typeTextBySelector(sessionId, body.selector, body.value);
          const steps = mapActionLogsToSteps(session.actionLogs);

          return ResponseService.ok(
            {
              sessionId,
              isRecording: !session.isClosed && !session.page.isClosed(),
              isClosed: session.isClosed || session.page.isClosed(),
              currentUrl: session.currentUrl,
              pageTitle: session.pageTitle,
              cachedFrame: session.cachedFrame,
              steps,
            },
            HttpStatus.OK,
            request
          );
        }

        if (action === "replay") {
          let customLogs: ActionLog[] | undefined = body.customLogs;

          if (!customLogs && Array.isArray(body.steps) && body.steps.length > 0) {
            customLogs = body.steps.map((step: RecordedStep, idx: number) => {
              let type: ActionLog["type"] = "click";
              switch (step.actionType) {
                case "CLICK":
                  type = step.inputConfig?.url ? "navigate" : "click";
                  break;
                case "TYPE":
                  type = "type";
                  break;
                case "SELECT":
                  type = "select_option";
                  break;
                case "CHECK":
                case "UNCHECK":
                  type = "check";
                  break;
                case "HOVER":
                  type = "hover";
                  break;
                case "SCROLL":
                  type = "scroll";
                  break;
                case "KEYPRESS":
                  type = "press_key";
                  break;
                case "UPLOAD_FILE":
                  type = "upload_file";
                  break;
                case "ASSERT":
                  type = step.assertionConfig?.assertionType === "ASSERT_TEXT" ? "assert_text" : "assert_visible";
                  break;
                default:
                  type = "click";
                  break;
              }

              return {
                id: step.id || `step-${idx + 1}`,
                type,
                description: step.description || `Step ${idx + 1}`,
                selector: step.selectorMetadata?.cssSelector || step.primaryKey,
                xpath: step.selectorMetadata?.xpathSelector,
                elementId: step.selectorMetadata?.id,
                innerText: step.selectorMetadata?.text,
                value: step.inputConfig?.value || step.inputConfig?.url,
                url: step.inputConfig?.url,
                key: step.inputConfig?.keyName,
                filePaths: step.inputConfig?.filePaths,
                expectedValue: step.assertionConfig?.expectedValue,
                timestamp: new Date().toLocaleTimeString(),
              };
            });
          }

          const session = await PlaywrightService.replaySession(
            sessionId,
            project.baseUrl,
            customLogs
          );
          const steps = mapActionLogsToSteps(session.actionLogs);

          return ResponseService.ok(
            {
              sessionId,
              isRecording: false,
              isClosed: session.isClosed || session.page.isClosed(),
              currentUrl: session.currentUrl,
              pageTitle: session.pageTitle,
              cachedFrame: session.cachedFrame,
              steps: steps.length > 0 ? steps : (body.steps || []),
            },
            HttpStatus.OK,
            request
          );
        }

        if (action === "record_from_step") {
          const targetIndex = typeof body.targetIndex === "number" ? body.targetIndex : 0;
          let customLogs: ActionLog[] | undefined = undefined;

          if (Array.isArray(body.steps) && body.steps.length > 0) {
            const sliced = body.steps.slice(0, targetIndex + 1);
            customLogs = sliced.map((step: RecordedStep, idx: number) => {
              let type: ActionLog["type"] = "click";
              switch (step.actionType) {
                case "CLICK":
                  type = step.inputConfig?.url ? "navigate" : "click";
                  break;
                case "TYPE":
                  type = "type";
                  break;
                case "SELECT":
                  type = "select_option";
                  break;
                case "CHECK":
                case "UNCHECK":
                  type = "check";
                  break;
                case "HOVER":
                  type = "hover";
                  break;
                case "SCROLL":
                  type = "scroll";
                  break;
                case "KEYPRESS":
                  type = "press_key";
                  break;
                case "UPLOAD_FILE":
                  type = "upload_file";
                  break;
                case "ASSERT":
                  type = step.assertionConfig?.assertionType === "ASSERT_TEXT" ? "assert_text" : "assert_visible";
                  break;
                default:
                  type = "click";
                  break;
              }

              return {
                id: step.id || `step-${idx + 1}`,
                type,
                description: step.description || `Step ${idx + 1}`,
                selector: step.selectorMetadata?.cssSelector || step.primaryKey,
                xpath: step.selectorMetadata?.xpathSelector,
                elementId: step.selectorMetadata?.id,
                innerText: step.selectorMetadata?.text,
                value: step.inputConfig?.value || step.inputConfig?.url,
                url: step.inputConfig?.url,
                key: step.inputConfig?.keyName,
                filePaths: step.inputConfig?.filePaths,
                expectedValue: step.assertionConfig?.expectedValue,
                timestamp: new Date().toLocaleTimeString(),
              };
            });
          }

          const session = await PlaywrightService.recordFromStep(
            sessionId,
            project.baseUrl,
            customLogs
          );
          const steps = mapActionLogsToSteps(session.actionLogs);

          return ResponseService.ok(
            {
              sessionId,
              isRecording: !session.isClosed && !session.page.isClosed(),
              isClosed: session.isClosed || session.page.isClosed(),
              currentUrl: session.currentUrl,
              pageTitle: session.pageTitle,
              cachedFrame: session.cachedFrame,
              steps,
            },
            HttpStatus.OK,
            request
          );
        }

        return ResponseService.badRequest(`Unsupported recorder action: ${action}`, request);
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 180, windowSeconds: 60, keyPrefix: "rl:recorder:post" }
);

import { NextRequest, NextResponse } from "next/server";
import { PlaywrightService } from "@/lib/playright-service/playwright.service";
import { ActionLog } from "@/lib/playright-service/types";
import { ActionType, AssertionConfig, RecordedStep } from "@/lib/scenarios-service/types";
import ResponseService from "@/lib/response-service/response.service";
import { RbacPermission } from "@/lib/rbac-service/types";
import authMiddleware from "@/middleware/auth/auth.middleware";
import rateLimitMiddleware from "@/middleware/rate-limit/rate-limit.middleware";
import rbacMiddleware from "@/middleware/rbac/rbac.middleware";
import { RouteHandlerContext } from "@/middleware/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface Params {
  id: string;
}

/**
 * Convert session action logs into standard RecordedStep objects
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
 * GET /api/projects/:id/recorder/stream?sessionId=...
 * Real-time Server-Sent Events (SSE) route for live recorder events, frames, and steps
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

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          start(controller) {
            const sendSSE = (eventName: string, payload: any) => {
              try {
                // Named event frame
                controller.enqueue(
                  encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`)
                );
                // Standard data frame for onmessage compatibility
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ ...payload, sseEvent: eventName })}\n\n`)
                );
              } catch {}
            };

            // 1. Send initial session snapshot
            const session = PlaywrightService.getSession(sessionId);
            if (session) {
              const steps = mapActionLogsToSteps(session.actionLogs);
              sendSSE("steps", {
                sessionId,
                isRecording: !session.isClosed && !session.page.isClosed(),
                isClosed: session.isClosed || session.page.isClosed(),
                currentUrl: session.currentUrl,
                pageTitle: session.pageTitle,
                cachedFrame: session.cachedFrame,
                steps,
              });
            } else {
              sendSSE("steps", {
                sessionId,
                isRecording: false,
                isClosed: true,
                currentUrl: "",
                pageTitle: "",
                cachedFrame: null,
                steps: [],
              });
            }

            // 2. Subscribe to real-time events from PlaywrightService
            const unsubscribe = PlaywrightService.subscribeSession(sessionId, (data: any) => {
              if (data.type === "action" && data.actionLogs) {
                const steps = mapActionLogsToSteps(data.actionLogs);
                sendSSE("steps", {
                  sessionId,
                  currentUrl: data.currentUrl,
                  pageTitle: data.pageTitle,
                  steps,
                });
              } else if (data.type === "frame") {
                sendSSE("frame", {
                  cachedFrame: data.cachedFrame,
                });
              } else if (data.type === "close") {
                sendSSE("status", {
                  isClosed: true,
                  isRecording: false,
                });
              }
            });

            // 3. Keep connection alive with 5s ping
            const pingInterval = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`: ping\n\n`));
              } catch {
                clearInterval(pingInterval);
              }
            }, 5000);

            // Cleanup subscription on abort
            request.signal.addEventListener("abort", () => {
              unsubscribe();
              clearInterval(pingInterval);
              try {
                controller.close();
              } catch {}
            });
          },
        });

        return new NextResponse(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
      { permissionKey: RbacPermission.SCENARIO_RECORD }
    )
  ),
  { maxRequests: 60, windowSeconds: 60, keyPrefix: "rl:recorder:stream" }
);

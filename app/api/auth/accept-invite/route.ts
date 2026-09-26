import { NextRequest, NextResponse } from "next/server";
import AuthService from "@/lib/auth-service/auth.service";
import ResponseService from "@/lib/response-service/response.service";
import { acceptInviteSchema } from "@/lib/auth-service/validation";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const accessToken = await AuthService.getAuthCookie();
    const { payload, errorResponse } = await AuthService.verifySession(accessToken, request);

    if (errorResponse || !payload) {
      return errorResponse || ResponseService.unauthorized("Authentication required.", request);
    }

    const body = await request.json();
    const validation = acceptInviteSchema.safeParse(body);

    if (!validation.success) {
      return ResponseService.badRequest(validation.error.issues[0]?.message || "Invalid payload", request);
    }

    return await AuthService.acceptInvite(payload.userId, validation.data.token, request);
  } catch (error: unknown) {
    return ResponseService.handleError(error, request);
  }
}

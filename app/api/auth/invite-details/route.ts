import { NextRequest, NextResponse } from "next/server";
import AuthService from "@/lib/auth-service/auth.service";
import ResponseService from "@/lib/response-service/response.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return ResponseService.badRequest("Invite token is required.", request);
    }

    return await AuthService.validateInviteToken(token, request);
  } catch (error: unknown) {
    return ResponseService.handleError(error, request);
  }
}

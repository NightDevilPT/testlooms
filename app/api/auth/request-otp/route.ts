import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import { idempotencyMiddleware } from "@/middleware/idempotency/idempotency.middleware";
import { requestOtpSchema } from "@/lib/auth-service/validation";
import AuthService from "@/lib/auth-service/auth.service";

async function requestOtpHandler(request: Request) {
  const body = await request.json();
  const validatedInput = requestOtpSchema.parse(body);
  return AuthService.requestOtp(validatedInput, request);
}

export const POST = rateLimitMiddleware(
  idempotencyMiddleware(requestOtpHandler),
  { maxRequests: 10, windowSeconds: 60 }
);

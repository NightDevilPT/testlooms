import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import { idempotencyMiddleware } from "@/middleware/idempotency/idempotency.middleware";
import { loginWithOtpSchema } from "@/lib/auth-service/validation";
import AuthService from "@/lib/auth-service/auth.service";

async function verifyOtpLoginHandler(request: Request) {
  const body = await request.json();
  const validatedInput = loginWithOtpSchema.parse(body);
  return AuthService.loginWithOtp(validatedInput, request);
}

export const POST = rateLimitMiddleware(
  idempotencyMiddleware(verifyOtpLoginHandler),
  { maxRequests: 10, windowSeconds: 60 }
);

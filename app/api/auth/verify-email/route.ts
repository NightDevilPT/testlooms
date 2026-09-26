import { rateLimitMiddleware } from "@/middleware/rate-limit/rate-limit.middleware";
import { idempotencyMiddleware } from "@/middleware/idempotency/idempotency.middleware";
import { verifyEmailSchema } from "@/lib/auth-service/validation";
import AuthService from "@/lib/auth-service/auth.service";

async function verifyEmailHandler(request: Request) {
  const body = await request.json();
  const validatedInput = verifyEmailSchema.parse(body);
  return AuthService.verifyEmailOtp(validatedInput, request);
}

export const POST = rateLimitMiddleware(
  idempotencyMiddleware(verifyEmailHandler),
  { maxRequests: 10, windowSeconds: 60 }
);

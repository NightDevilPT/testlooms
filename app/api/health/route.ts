import { ResponseService } from "@/lib/response-service/response.service";

export async function GET(request: Request) {
  return ResponseService.ok(
    {
      status: "healthy",
      service: "TestLoom API Engine",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    },
    200,
    request
  );
}

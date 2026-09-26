"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, KeyRound, Loader2, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client/api-client.service";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailParam = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Cooldown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey("verify_email");
      const response = await apiClient.post<{ message: string }>(
        "/api/auth/verify-email",
        { email: email.trim().toLowerCase(), otpCode: otpCode.trim() },
        { idempotencyKey }
      );

      if (response.success && response.data) {
        setSuccess("Email address verified successfully! Redirecting to login...");
        setTimeout(() => {
          router.push(`/auth/login?email=${encodeURIComponent(email)}&verified=true`);
        }, 1500);
      } else {
        const errorMsg = response.success === false ? response.error.message : "Verification failed";
        setError(errorMsg);
      }
    } catch {
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Please enter your email address to resend verification code.");
      return;
    }

    setIsResending(true);
    try {
      const idempotencyKey = generateIdempotencyKey("resend_otp");
      const response = await apiClient.post<{ message: string }>(
        "/api/auth/request-otp",
        { email: email.trim().toLowerCase(), purpose: "EMAIL_VERIFICATION" },
        { idempotencyKey }
      );

      if (response.success) {
        setSuccess("A new 6-digit verification code has been sent to your email.");
        setResendCooldown(60);
      } else {
        const errorMsg = response.success === false ? response.error.message : "Failed to resend code";
        setError(errorMsg);
      }
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md w-full mx-auto">
      <Card className="overflow-hidden border-border bg-card shadow-2xl p-6 md:p-8">
        <CardContent className="p-0">
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <Shield className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Verify Your Email
              </h1>
              <p className="text-sm text-muted-foreground max-w-xs">
                Enter the 6-digit verification code sent to{" "}
                <span className="font-semibold text-foreground">{email || "your email"}</span>
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm font-medium text-destructive text-center"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="alert"
                className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm font-medium text-emerald-400 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={isSubmitting}
                />
              </Field>

              <Field className="flex flex-col items-center justify-center text-center">
                <FieldLabel htmlFor="otpCode" className="w-full text-center">6-Digit Verification Code</FieldLabel>
                <div className="py-2 flex justify-center w-full">
                  <InputOTP
                    id="otpCode"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={otpCode}
                    onChange={(val) => setOtpCode(val)}
                    disabled={isSubmitting}
                    autoFocus
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-10 w-10 text-base font-semibold" />
                      <InputOTPSlot index={1} className="h-10 w-10 text-base font-semibold" />
                      <InputOTPSlot index={2} className="h-10 w-10 text-base font-semibold" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="h-10 w-10 text-base font-semibold" />
                      <InputOTPSlot index={4} className="h-10 w-10 text-base font-semibold" />
                      <InputOTPSlot index={5} className="h-10 w-10 text-base font-semibold" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <FieldDescription className="text-xs text-center text-muted-foreground mt-1">
                  Code expires in 10 minutes
                </FieldDescription>
              </Field>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isSubmitting || otpCode.length !== 6}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </FieldGroup>

            <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
              <span>Didn&apos;t receive code?</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResending}
                className="h-auto p-0 text-primary hover:bg-transparent hover:underline text-xs gap-1"
              >
                {isResending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        Already verified?{" "}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}

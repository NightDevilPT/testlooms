"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Globe,
	Shield,
	KeyRound,
	Bug,
	Loader2,
	Mail,
	Lock,
	ArrowRight,
	CheckCircle2,
	RefreshCw,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/components/ui/field";
import { useAuth } from "@/components/context/auth-context";
import { loginSchema, LoginInput } from "@/lib/auth-service/validation";
import apiClient from "@/lib/api-client/api-client.service";
import { AuthSessionResult } from "@/lib/auth-service/types";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { login, refetchUser } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();

	const [activeTab, setActiveTab] = useState<"PASSWORD" | "OTP">("PASSWORD");
	const [formError, setFormError] = useState<string | null>(null);
	const [formNotice, setFormNotice] = useState<string | null>(null);
	const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

	// OTP Login state
	const [otpEmail, setOtpEmail] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [isOtpSent, setIsOtpSent] = useState(false);
	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);

	const inviteTokenParam = searchParams.get("inviteToken") || searchParams.get("token");
	const emailParam = searchParams.get("email");
	const verifiedParam = searchParams.get("verified");

	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<LoginInput>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: emailParam || "",
			password: "",
			inviteToken: inviteTokenParam || undefined,
		},
	});

	// Check URL params for verified status or prefilled email & invite token
	useEffect(() => {
		if (emailParam) {
			setOtpEmail(emailParam);
			setValue("email", emailParam);
		}

		if (inviteTokenParam) {
			if (inviteTokenParam) setValue("inviteToken", inviteTokenParam);
			setFormNotice("Log in to accept your team invitation.");
		} else if (verifiedParam === "true") {
			setFormNotice(
				"Your email address was verified successfully! Please log in.",
			);
		}
	}, [searchParams, setValue, inviteTokenParam, emailParam, verifiedParam]);

	// Resend cooldown timer
	useEffect(() => {
		if (resendCooldown <= 0) return;
		const timer = setInterval(() => {
			setResendCooldown((prev) => prev - 1);
		}, 1000);
		return () => clearInterval(timer);
	}, [resendCooldown]);

	// Handle Password-based login
	const onPasswordSubmit = async (data: LoginInput) => {
		setFormError(null);
		setFormNotice(null);
		setUnverifiedEmail(null);

		const loginData = {
			...data,
			inviteToken: inviteTokenParam || data.inviteToken,
		};

		const result = await login(loginData);
		if (!result.success && result.error) {
			setFormError(result.error);
			if (result.error.toLowerCase().includes("not verified")) {
				setUnverifiedEmail(data.email);
			}
		}
	};

	// Step 1: Request OTP for login
	const handleRequestOtp = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		setFormError(null);
		setFormNotice(null);

		if (!otpEmail.trim()) {
			setFormError("Please enter your email address.");
			return;
		}

		setIsSendingOtp(true);
		try {
			const idempotencyKey = generateIdempotencyKey("request_login_otp");
			const response = await apiClient.post<{ message: string }>(
				"/api/auth/request-otp",
				{ email: otpEmail.trim().toLowerCase(), purpose: "LOGIN" },
				{ idempotencyKey },
			);

			if (response.success) {
				setIsOtpSent(true);
				setFormNotice(
					`A 6-digit login code has been sent to ${otpEmail}.`,
				);
				setResendCooldown(60);
			} else {
				const errorMsg =
					response.success === false
						? response.error.message
						: "Failed to send login code";
				setFormError(errorMsg);
			}
		} catch {
			setFormError("Failed to send login code. Please try again.");
		} finally {
			setIsSendingOtp(false);
		}
	};

	// Step 2: Verify OTP and log in
	const handleVerifyOtpLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError(null);
		setFormNotice(null);

		if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
			setFormError("Please enter a valid 6-digit verification code.");
			return;
		}

		setIsVerifyingOtp(true);
		try {
			const idempotencyKey = generateIdempotencyKey("verify_otp_login");
			const response = await apiClient.post<AuthSessionResult>(
				"/api/auth/verify-otp-login",
				{
					email: otpEmail.trim().toLowerCase(),
					otpCode: otpCode.trim(),
					inviteToken: inviteTokenParam || undefined,
				},
				{ idempotencyKey },
			);

			if (response.success && response.data) {
				await refetchUser();
				router.push("/dashboard");
			} else {
				const errorMsg =
					response.success === false
						? response.error.message
						: "OTP login failed";
				setFormError(errorMsg);
			}
		} catch {
			setFormError("Failed to verify code. Please try again.");
		} finally {
			setIsVerifyingOtp(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0 border-border bg-card shadow-2xl">
				<CardContent className="grid p-0 md:grid-cols-2">
					<div className="p-6 md:p-8 flex flex-col justify-between">
						<div>
							{/* Header */}
							<div className="flex flex-col items-center gap-2 text-center mb-6">
								<h1 className="text-2xl font-bold tracking-tight text-foreground">
									Welcome back
								</h1>
								<p className="text-balance text-sm text-muted-foreground">
									Choose your preferred login method
								</p>

								{/* Login Mode Switcher Tabs */}
								<div className="grid grid-cols-2 w-full p-1 mt-2 bg-muted/50 rounded-lg border border-border">
									<button
										type="button"
										onClick={() => {
											setActiveTab("PASSWORD");
											setFormError(null);
											setFormNotice(null);
										}}
										className={cn(
											"py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5",
											activeTab === "PASSWORD"
												? "bg-background text-foreground shadow-sm border border-border"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										<Lock className="h-3.5 w-3.5" />{" "}
										Password Login
									</button>
									<button
										type="button"
										onClick={() => {
											setActiveTab("OTP");
											setFormError(null);
											setFormNotice(null);
										}}
										className={cn(
											"py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5",
											activeTab === "OTP"
												? "bg-background text-foreground shadow-sm border border-border"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										<Mail className="h-3.5 w-3.5" /> OTP /
										Passcode
									</button>
								</div>
							</div>

							{/* Status Alerts */}
							{formError && (
								<div
									role="alert"
									className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm font-medium text-destructive space-y-2"
								>
									<p>{formError}</p>
									{unverifiedEmail && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												router.push(
													`/auth/verify-email?email=${encodeURIComponent(unverifiedEmail)}`,
												)
											}
											className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5 text-xs mt-1"
										>
											Verify Email Address Now{" "}
											<ArrowRight className="h-3.5 w-3.5" />
										</Button>
									)}
								</div>
							)}

							{formNotice && (
								<div
									role="alert"
									className="mb-4 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm font-medium text-emerald-400 flex items-center gap-2"
								>
									<CheckCircle2 className="h-4 w-4 shrink-0" />
									<span>{formNotice}</span>
								</div>
							)}

							{/* TAB 1: Password-based Login Form */}
							{activeTab === "PASSWORD" && (
								<form
									onSubmit={handleSubmit(onPasswordSubmit)}
									className="space-y-4"
								>
									<FieldGroup>
										<Field data-invalid={!!errors.email}>
											<FieldLabel htmlFor="email">
												Email
											</FieldLabel>
											<Input
												id="email"
												type="email"
												placeholder="name@example.com"
												{...register("email")}
											/>
											<FieldError
												errors={[
													{
														message:
															errors.email
																?.message,
													},
												]}
											/>
										</Field>

										<Field data-invalid={!!errors.password}>
											<div className="flex items-center justify-between">
												<FieldLabel htmlFor="password">
													Password
												</FieldLabel>
												<Link
													href="/auth/verify-email"
													className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-primary"
												>
													Verify email?
												</Link>
											</div>
											<Input
												id="password"
												type="password"
												placeholder="••••••••"
												{...register("password")}
											/>
											<FieldError
												errors={[
													{
														message:
															errors.password
																?.message,
													},
												]}
											/>
										</Field>

										<Field className="pt-2">
											<Button
												type="submit"
												className="w-full"
												disabled={isSubmitting}
											>
												{isSubmitting ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Logging in...
													</>
												) : (
													"Login with Password"
												)}
											</Button>
										</Field>
									</FieldGroup>
								</form>
							)}

							{/* TAB 2: OTP / Passwordless Login Form */}
							{activeTab === "OTP" && (
								<form
									onSubmit={handleVerifyOtpLogin}
									className="space-y-4"
								>
									<FieldGroup>
										<Field>
											<FieldLabel htmlFor="otpEmail">
												Email Address
											</FieldLabel>
											<div className="flex gap-2">
												<Input
													id="otpEmail"
													type="email"
													value={otpEmail}
													onChange={(e) =>
														setOtpEmail(
															e.target.value,
														)
													}
													placeholder="name@example.com"
													disabled={
														isSendingOtp ||
														isVerifyingOtp
													}
												/>
												<Button
													type="button"
													variant="outline"
													onClick={handleRequestOtp}
													disabled={
														isSendingOtp ||
														!otpEmail.trim() ||
														resendCooldown > 0
													}
													className="shrink-0 text-xs gap-1.5 min-w-[100px]"
												>
													{isSendingOtp ? (
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
													) : resendCooldown > 0 ? (
														`${resendCooldown}s`
													) : isOtpSent ? (
														<>
															<RefreshCw className="h-3.5 w-3.5" />{" "}
															Resend
														</>
													) : (
														"Send Code"
													)}
												</Button>
											</div>
										</Field>

										<Field className="flex flex-col items-center justify-center text-center pt-2">
											<FieldLabel
												htmlFor="otpCode"
												className="w-full text-center font-medium mb-1"
											>
												6-Digit Login Code
											</FieldLabel>
											<div className="py-2 flex justify-center w-full">
												<InputOTP
													id="otpCode"
													maxLength={6}
													pattern={REGEXP_ONLY_DIGITS}
													value={otpCode}
													onChange={(val) =>
														setOtpCode(val)
													}
													disabled={isVerifyingOtp}
													autoFocus
													containerClassName="justify-center"
												>
													<InputOTPGroup>
														<InputOTPSlot
															index={0}
															className="h-10 w-10 text-base font-semibold"
														/>
														<InputOTPSlot
															index={1}
															className="h-10 w-10 text-base font-semibold"
														/>
														<InputOTPSlot
															index={2}
															className="h-10 w-10 text-base font-semibold"
														/>
													</InputOTPGroup>
													<InputOTPSeparator />
													<InputOTPGroup>
														<InputOTPSlot
															index={3}
															className="h-10 w-10 text-base font-semibold"
														/>
														<InputOTPSlot
															index={4}
															className="h-10 w-10 text-base font-semibold"
														/>
														<InputOTPSlot
															index={5}
															className="h-10 w-10 text-base font-semibold"
														/>
													</InputOTPGroup>
												</InputOTP>
											</div>
											<FieldDescription className="text-xs text-center text-muted-foreground mt-1">
												{isOtpSent
													? `Enter the 6-digit passcode sent to ${otpEmail}`
													: "Enter your email address and click Send Code to receive your passcode"}
											</FieldDescription>
										</Field>

										<Field className="pt-2">
											<Button
												type="submit"
												className="w-full gap-2"
												disabled={
													isVerifyingOtp ||
													otpCode.length !== 6 ||
													!otpEmail.trim()
												}
											>
												{isVerifyingOtp ? (
													<>
														<Loader2 className="h-4 w-4 animate-spin" />
														Verifying & Logging
														in...
													</>
												) : (
													<>
														Verify & Log In{" "}
														<ArrowRight className="h-4 w-4" />
													</>
												)}
											</Button>
										</Field>
									</FieldGroup>
								</form>
							)}
						</div>

						<div className="mt-6 pt-4 border-t border-border">
							<FieldDescription className="text-center text-xs">
								Don&apos;t have an account?{" "}
								<Link
									href={
										inviteTokenParam
											? `/auth/signup?inviteToken=${encodeURIComponent(inviteTokenParam)}&email=${encodeURIComponent(otpEmail || emailParam || "")}`
											: "/auth/signup"
									}
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									Sign up
								</Link>
							</FieldDescription>
						</div>
					</div>

					{/* Right Side Prominent Logo Visual Panel */}
					<div className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden bg-muted/30 border-l border-border">
						<div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
						<div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

						<div className="relative z-10 my-auto flex flex-col items-center justify-center text-center p-6 space-y-6">
							<div className="relative flex items-center justify-center">
								<div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
								<div className="relative h-28 w-28 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 border border-primary-foreground/20">
									<Bug className="h-14 w-14" />
								</div>
							</div>

							<div className="space-y-2 max-w-xs">
								<h2 className="text-xl font-bold tracking-tight text-foreground">
									TestLoom Studio
								</h2>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Record, replay, and auto-export enterprise
									Playwright browser test suites effortlessly.
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<FieldDescription className="px-6 text-center text-xs">
				By clicking continue, you agree to our{" "}
				<Link
					href="#"
					className="underline underline-offset-4 hover:text-primary"
				>
					Terms of Service
				</Link>{" "}
				and{" "}
				<Link
					href="#"
					className="underline underline-offset-4 hover:text-primary"
				>
					Privacy Policy
				</Link>
				.
			</FieldDescription>
		</div>
	);
}

export default LoginForm;

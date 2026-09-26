"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Shield, KeyRound, Bug, Loader2, CheckCircle2 } from "lucide-react";
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
import { signupSchema, SignupInput } from "@/lib/auth-service/validation";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import apiClient from "@/lib/api-client/api-client.service";

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { signup } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [formError, setFormError] = useState<string | null>(null);

	const inviteTokenParam = searchParams.get("inviteToken") || searchParams.get("token");
	const emailParam = searchParams.get("email");
	const firstNameParam = searchParams.get("firstName");
	const lastNameParam = searchParams.get("lastName");

	const isInvitedUser = Boolean(inviteTokenParam);
	const [fetchedInvite, setFetchedInvite] = useState<{
		firstName: string;
		lastName: string;
		email: string;
		organizationName: string;
	} | null>(null);

	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<SignupInput>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			firstName: firstNameParam || "",
			lastName: lastNameParam || "",
			email: emailParam || "",
			password: "",
			inviteToken: inviteTokenParam || undefined,
		},
	});

	useEffect(() => {
		if (firstNameParam) setValue("firstName", firstNameParam);
		if (lastNameParam) setValue("lastName", lastNameParam);
		if (emailParam) setValue("email", emailParam);

		if (inviteTokenParam) {
			setValue("inviteToken", inviteTokenParam);

			apiClient
				.get<{
					email: string;
					firstName: string;
					lastName: string;
					organizationName: string;
				}>(`/api/auth/invite-details?token=${encodeURIComponent(inviteTokenParam)}`)
				.then((res) => {
					if (res.success && res.data && !Array.isArray(res.data)) {
						setFetchedInvite(res.data);
						if (res.data.firstName) setValue("firstName", res.data.firstName);
						if (res.data.lastName) setValue("lastName", res.data.lastName);
						if (res.data.email) setValue("email", res.data.email);
					}
				})
				.catch(() => {});
		}
	}, [searchParams, setValue, firstNameParam, lastNameParam, emailParam, inviteTokenParam]);

	const onSubmit = async (data: SignupInput) => {
		setFormError(null);
		const idempotencyKey = generateIdempotencyKey("signup");
		const signupPayload: SignupInput = {
			firstName: isInvitedUser
				? (fetchedInvite?.firstName || firstNameParam || data.firstName)
				: data.firstName,
			lastName: isInvitedUser
				? (fetchedInvite?.lastName || lastNameParam || data.lastName)
				: data.lastName,
			email: isInvitedUser
				? (fetchedInvite?.email || emailParam || data.email)
				: data.email,
			password: data.password,
			inviteToken: inviteTokenParam || data.inviteToken,
		};
		const result = await signup(signupPayload, idempotencyKey);
		if (result.success) {
			router.push(`/auth/verify-email?email=${encodeURIComponent(signupPayload.email)}`);
		} else if (result.error) {
			setFormError(result.error);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0 border-border bg-card shadow-2xl">
				<CardContent className="grid p-0 md:grid-cols-2">
					<form
						onSubmit={handleSubmit(onSubmit)}
						className="p-6 md:p-8 flex flex-col justify-between"
					>
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold tracking-tight text-foreground">
									Create an account
								</h1>
								<p className="text-balance text-sm text-muted-foreground">
									{isInvitedUser
										? "Set your password to complete your account & join your team"
										: "Get started with TestLoom automation"}
								</p>
							</div>

							{isInvitedUser && (
								<div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-medium text-emerald-400 flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4 shrink-0" />
									<span>
										Joining {fetchedInvite?.organizationName || "organization"} as <strong>{fetchedInvite?.email || emailParam}</strong>
									</span>
								</div>
							)}

							{formError && (
								<div
									role="alert"
									className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive"
								>
									{formError}
								</div>
							)}

							<div className="grid grid-cols-2 gap-4">
								<Field data-invalid={!!errors.firstName}>
									<FieldLabel htmlFor="firstName">
										First Name
									</FieldLabel>
									<Input
										id="firstName"
										placeholder={isInvitedUser ? "" : "John"}
										disabled={isInvitedUser || isSubmitting}
										className={cn(isInvitedUser && "bg-muted text-muted-foreground cursor-not-allowed opacity-90")}
										{...register("firstName")}
									/>
									<FieldError
										errors={[
											{
												message:
													errors.firstName?.message,
											},
										]}
									/>
								</Field>

								<Field data-invalid={!!errors.lastName}>
									<FieldLabel htmlFor="lastName">
										Last Name
									</FieldLabel>
									<Input
										id="lastName"
										placeholder={isInvitedUser ? "" : "Doe"}
										disabled={isInvitedUser || isSubmitting}
										className={cn(isInvitedUser && "bg-muted text-muted-foreground cursor-not-allowed opacity-90")}
										{...register("lastName")}
									/>
									<FieldError
										errors={[
											{
												message:
													errors.lastName?.message,
											},
										]}
									/>
								</Field>
							</div>

							<Field data-invalid={!!errors.email}>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder={isInvitedUser ? "" : "name@example.com"}
									disabled={isInvitedUser || isSubmitting}
									className={cn(isInvitedUser && "bg-muted text-muted-foreground cursor-not-allowed opacity-90")}
									{...register("email")}
								/>
								<FieldError
									errors={[
										{ message: errors.email?.message },
									]}
								/>
							</Field>

							<Field data-invalid={!!errors.password}>
								<FieldLabel htmlFor="password">
									Create Password
								</FieldLabel>
								<Input
									id="password"
									type="password"
									placeholder="••••••••"
									disabled={isSubmitting}
									autoFocus={isInvitedUser}
									{...register("password")}
								/>
								<FieldError
									errors={[
										{ message: errors.password?.message },
									]}
								/>
							</Field>

							<Field>
								<Button
									type="submit"
									className="w-full"
									disabled={isSubmitting}
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Creating account...
										</>
									) : (
										"Sign up & Join Team"
									)}
								</Button>
							</Field>

							<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card" />

							<FieldDescription className="text-center">
								Already have an account?{" "}
								<Link
									href={
										inviteTokenParam
											? `/auth/login?inviteToken=${encodeURIComponent(inviteTokenParam)}&email=${encodeURIComponent(emailParam || "")}`
											: "/auth/login"
									}
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									Log in
								</Link>
							</FieldDescription>
						</FieldGroup>
					</form>

					{/* Right Side Prominent Logo Visual Panel */}
					<div className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden bg-muted/30 border-l border-border">
						{/* Ambient Background Radial Glow Effects */}
						<div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
						<div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

						{/* Large Centered Logo Hero Graphic */}
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

export default SignupForm;

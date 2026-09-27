"use client";

import * as React from "react";
import { useProjects } from "@/components/context/projects-context";
import { FormDialog } from "@/components/shared/form-dialog";
import { Label } from "@/components/ui/label";
import {
	AlertTriangle,
	Building2,
	CheckCircle2,
	Clock,
	Globe,
	Loader2,
	Monitor,
	ShieldCheck,
	User,
	XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
	calculateTimeoutMs,
	TimeoutUnit,
} from "@/lib/projects-service/validation";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PingUrlResult } from "@/lib/projects-service/types";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";

interface CreateProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
	open,
	onOpenChange,
}: CreateProjectDialogProps) {
	const { createProject, pingUrl } = useProjects();

	const [name, setName] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [baseUrl, setBaseUrl] = React.useState("");
	const [ownershipType, setOwnershipType] = React.useState<
		"PERSONAL" | "COMPANY"
	>("PERSONAL");
	const [viewportWidth, setViewportWidth] = React.useState(1280);
	const [viewportHeight, setViewportHeight] = React.useState(800);
	const [headless, setHeadless] = React.useState(true);

	// Time-based timeout state (number + unit selector)
	const [timeoutValue, setTimeoutValue] = React.useState(30);
	const [timeoutUnit, setTimeoutUnit] =
		React.useState<TimeoutUnit>("seconds");

	// Mandatory Ping Test state
	const [isPinging, setIsPinging] = React.useState(false);
	const [pingResult, setPingResult] = React.useState<PingUrlResult | null>(
		null,
	);

	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const resetForm = () => {
		setName("");
		setDescription("");
		setBaseUrl("");
		setOwnershipType("PERSONAL");
		setViewportWidth(1280);
		setViewportHeight(800);
		setHeadless(true);
		setTimeoutValue(30);
		setTimeoutUnit("seconds");
		setPingResult(null);
		setErrorMessage(null);
	};

	const handleTestPing = async () => {
		if (!baseUrl || !baseUrl.startsWith("http")) {
			setErrorMessage("Please enter a valid HTTP/HTTPS base URL first");
			return;
		}
		setErrorMessage(null);
		setIsPinging(true);
		const result = await pingUrl(baseUrl);
		setPingResult(result);
		setIsPinging(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			setErrorMessage("Project name is required");
			return;
		}
		if (!baseUrl.trim() || !baseUrl.startsWith("http")) {
			setErrorMessage(
				"A valid Base URL (e.g. https://staging.shop.com) is required",
			);
			return;
		}

		// MANDATORY PING CHECK REQUIREMENT
		if (!pingResult || !pingResult.isReachable) {
			setErrorMessage(
				"Target URL ping verification required! Click 'Ping Test' and verify the target server is online before creating the project.",
			);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		const idempotencyKey = generateIdempotencyKey("create_project");
		const computedTimeoutMs = calculateTimeoutMs(timeoutValue, timeoutUnit);

		const result = await createProject(
			{
				name: name.trim(),
				description: description.trim() || undefined,
				baseUrl: baseUrl.trim(),
				ownershipType,
				defaultViewportWidth: viewportWidth,
				defaultViewportHeight: viewportHeight,
				headless,
				timeoutMs: computedTimeoutMs,
			},
			idempotencyKey,
		);

		setIsSubmitting(false);

		if (result.success) {
			toast.add({
				title: "Project Created",
				description: `Project "${name.trim()}" created successfully.`,
				type: "success",
			});
			resetForm();
			onOpenChange(false);
		} else {
			const errText = result.error || "Failed to create project";
			toast.add({
				title: "Creation Failed",
				description: errText,
				type: "error",
			});
			setErrorMessage(errText);
		}
	};

	const isPingSuccessful = pingResult?.isReachable === true;

	return (
		<FormDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Create New Project"
			description="Register a web application under test with mandatory URL ping verification."
			icon={<Globe className="h-5 w-5 text-primary" />}
			onSubmit={handleSubmit}
			submitLabel="Create Project"
			isSubmitting={isSubmitting}
			submitDisabled={!isPingSuccessful}
		>
			{errorMessage && (
				<div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-start gap-2">
					<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
					<span>{errorMessage}</span>
				</div>
			)}

			{/* Project Name */}
			<div className="space-y-1.5">
				<Label htmlFor="create-project-name">
					Project Name <span className="text-destructive">*</span>
				</Label>
				<Input
					id="create-project-name"
					placeholder="e.g. E-Commerce Staging Store"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
			</div>

			{/* Base URL & Ping Test Button */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<Label htmlFor="create-project-url">
						Target Base URL{" "}
						<span className="text-destructive">*</span>
					</Label>
					<Button
						type="button"
						variant={isPingSuccessful ? "secondary" : "default"}
						size="sm"
						onClick={handleTestPing}
						disabled={isPinging || !baseUrl}
						className="h-7 text-xs gap-1.5 font-medium"
					>
						{isPinging ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							<ShieldCheck className="h-3.5 w-3.5" />
						)}
						{isPingSuccessful ? "Ping Passed ✓" : "Run Ping Test *"}
					</Button>
				</div>
				<Input
					id="create-project-url"
					placeholder="https://staging.app.com"
					value={baseUrl}
					onChange={(e) => {
						setBaseUrl(e.target.value);
						setPingResult(null);
					}}
					required
				/>

				{/* Mandatory Ping Status Feedback */}
				{!pingResult ? (
					<p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
						<ShieldCheck className="h-3 w-3 text-primary" />
						Target URL must be ping verified before saving.
					</p>
				) : (
					<div
						className={`p-2.5 rounded-md text-xs border flex items-center justify-between ${
							pingResult.isReachable
								? "bg-primary/10 border-primary/20 text-primary"
								: "bg-destructive/10 border-destructive/20 text-destructive"
						}`}
					>
						<span className="flex items-center gap-1.5 font-medium">
							{pingResult.isReachable ? (
								<CheckCircle2 className="h-4 w-4" />
							) : (
								<XCircle className="h-4 w-4" />
							)}
							{pingResult.isReachable
								? `Target online (${pingResult.statusCode || 200} OK) — Ping Verified`
								: `Unreachable: ${pingResult.error || "Connection timed out"}`}
						</span>
						{pingResult.responseTimeMs && (
							<span className="font-mono text-[11px] opacity-80">
								{pingResult.responseTimeMs}ms
							</span>
						)}
					</div>
				)}
			</div>

			{/* Description */}
			<div className="space-y-1.5">
				<Label htmlFor="create-project-desc">Description</Label>
				<Textarea
					id="create-project-desc"
					placeholder="Summary of flows and routes tested in this workspace..."
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={2}
				/>
			</div>

			{/* Step Timeout Selection (Number + Unit Picker) */}
			<div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/30">
				<Label className="flex items-center gap-1.5 text-xs font-semibold">
					<Clock className="h-3.5 w-3.5 text-primary" /> Step Wait
					Timeout
				</Label>
				<p className="text-[11px] text-muted-foreground">
					Maximum wait time per automated step before failover.
				</p>

				<div className="grid grid-cols-2 gap-3 pt-1">
					<div>
						<Label
							htmlFor="timeout-val"
							className="text-xs text-muted-foreground"
						>
							Duration
						</Label>
						<Input
							id="timeout-val"
							type="number"
							min={1}
							max={600}
							value={timeoutValue}
							onChange={(e) =>
								setTimeoutValue(
									Math.max(1, parseInt(e.target.value) || 1),
								)
							}
							required
						/>
					</div>
					<div>
						<Label
							htmlFor="timeout-unit"
							className="text-xs text-muted-foreground"
						>
							Time Unit
						</Label>
						<Select
							value={timeoutUnit}
							onValueChange={(val) => {
								if (val) setTimeoutUnit(val as TimeoutUnit);
							}}
						>
							<SelectTrigger id="timeout-unit">
								<SelectValue placeholder="Select unit" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="seconds">
									Seconds (s)
								</SelectItem>
								<SelectItem value="minutes">
									Minutes (m)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			{/* Viewport Width & Height */}
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<Label htmlFor="viewport-w" className="text-xs">
						Viewport Width (px)
					</Label>
					<Input
						id="viewport-w"
						type="number"
						value={viewportWidth}
						onChange={(e) =>
							setViewportWidth(parseInt(e.target.value) || 1280)
						}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="viewport-h" className="text-xs">
						Viewport Height (px)
					</Label>
					<Input
						id="viewport-h"
						type="number"
						value={viewportHeight}
						onChange={(e) =>
							setViewportHeight(parseInt(e.target.value) || 800)
						}
					/>
				</div>
			</div>

			{/* Headless Browser Execution Mode */}
			<div className="flex items-center justify-between space-x-2 p-3 rounded-lg border border-border bg-muted/30">
				<div className="space-y-0.5">
					<Label
						htmlFor="create-headless-mode"
						className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
					>
						<Monitor className="h-3.5 w-3.5 text-primary" />{" "}
						Headless Browser Execution
					</Label>
					<p className="text-[11px] text-muted-foreground">
						Run Playwright test scripts in background headless mode
						(recommended for CI/CD).
					</p>
				</div>
				<Checkbox
					id="create-headless-mode"
					checked={headless}
					onCheckedChange={(checked) => setHeadless(Boolean(checked))}
				/>
			</div>

			{/* Ownership Type */}
			<div className="space-y-1.5">
				<Label className="text-xs">Project Ownership</Label>
				<div className="grid grid-cols-2 gap-3">
					<Button
						type="button"
						variant={
							ownershipType === "PERSONAL" ? "default" : "outline"
						}
						className="justify-start gap-2 h-9 text-xs"
						onClick={() => setOwnershipType("PERSONAL")}
					>
						<User className="h-3.5 w-3.5" /> Personal Project
					</Button>
					<Button
						type="button"
						variant={
							ownershipType === "COMPANY" ? "default" : "outline"
						}
						className="justify-start gap-2 h-9 text-xs"
						onClick={() => setOwnershipType("COMPANY")}
					>
						<Building2 className="h-3.5 w-3.5" /> Organization
					</Button>
				</div>
			</div>
		</FormDialog>
	);
}

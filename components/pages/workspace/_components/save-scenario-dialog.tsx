"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import {
	RecordedStep,
	TestScenarioWithSteps,
} from "@/lib/scenarios-service/types";
import { useScenarios } from "@/components/context/scenarios-context";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import { FormDialog } from "@/components/shared/form-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Save, Layers, Tag, Pencil } from "lucide-react";

interface SaveScenarioDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string;
	baseUrl?: string;
	currentUrl?: string;
	existingScenario?: TestScenarioWithSteps | null;
	steps: RecordedStep[];
	onSuccess: (scenarioId: string) => void;
}

interface FormValues {
	title: string;
	description?: string;
	relativeRoute?: string;
	status?: "DRAFT" | "READY" | "DEPRECATED";
	tags?: string[];
}

export function SaveScenarioDialog({
	open,
	onOpenChange,
	projectId,
	baseUrl,
	currentUrl,
	existingScenario,
	steps,
	onSuccess,
}: SaveScenarioDialogProps) {
	const { createScenario, updateScenario, saveScenarioSteps } =
		useScenarios();
	const [tagInput, setTagInput] = React.useState("");
	const [tagsList, setTagsList] = React.useState<string[]>([
		"smoke",
		"recorded",
	]);

	const isEditing = Boolean(existingScenario && existingScenario.id);

	// Compute auto-extracted relative route from currentUrl & baseUrl
	const computedRelativeRoute = React.useMemo(() => {
		if (existingScenario?.relativeRoute) return existingScenario.relativeRoute;
		if (currentUrl && baseUrl) {
			try {
				const baseObj = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
				const currObj = new URL(currentUrl.startsWith("http") ? currentUrl : `https://${currentUrl}`);
				if (currObj.origin === baseObj.origin) {
					return currObj.pathname || "/";
				}
			} catch {
				if (currentUrl.startsWith(baseUrl)) {
					const rel = currentUrl.substring(baseUrl.length);
					return rel.startsWith("/") ? rel : `/${rel}`;
				}
			}
		}
		return "/";
	}, [existingScenario, currentUrl, baseUrl]);

	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors, isSubmitting },
		reset,
	} = useForm<FormValues>({
		defaultValues: {
			title: "",
			description: "",
			relativeRoute: computedRelativeRoute,
			status: "READY",
			tags: ["smoke", "recorded"],
		},
	});

	// Populate form values when opening or when existingScenario / computedRelativeRoute changes
	React.useEffect(() => {
		if (open) {
			if (existingScenario) {
				setValue("title", existingScenario.title || "");
				setValue("description", existingScenario.description || "");
				setValue(
					"relativeRoute",
					existingScenario.relativeRoute || computedRelativeRoute || "/",
				);
				setValue("status", existingScenario.status || "READY");
				const initTags =
					existingScenario.tags && existingScenario.tags.length > 0
						? existingScenario.tags
						: ["smoke", "recorded"];
				setTagsList(initTags);
				setValue("tags", initTags);
			} else {
				reset({
					title: "",
					description: "",
					relativeRoute: computedRelativeRoute || "/",
					status: "READY",
					tags: ["smoke", "recorded"],
				});
				setTagsList(["smoke", "recorded"]);
			}
		}
	}, [open, existingScenario, computedRelativeRoute, setValue, reset]);

	const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			const newTag = tagInput.trim().toLowerCase();
			if (newTag && !tagsList.includes(newTag)) {
				const updated = [...tagsList, newTag];
				setTagsList(updated);
				setValue("tags", updated);
				setTagInput("");
			}
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		const updated = tagsList.filter((t) => t !== tagToRemove);
		setTagsList(updated);
		setValue("tags", updated);
	};

	const onSubmit = async (values: FormValues) => {
		try {
			const payload = {
				projectId,
				title: values.title.trim(),
				description: values.description?.trim() || undefined,
				relativeRoute: values.relativeRoute?.trim() || "/",
				status: values.status || "READY",
				tags: tagsList,
				steps,
			};

			let targetScenarioId = existingScenario?.id;
			let result;

			if (isEditing && targetScenarioId) {
				// Update existing scenario metadata via context with idempotency key
				const idempotencyKey =
					generateIdempotencyKey("update_scenario");
				result = await updateScenario(
					projectId,
					targetScenarioId,
					payload,
					idempotencyKey,
				);
			} else {
				// Create new scenario via context with idempotency key
				const idempotencyKey =
					generateIdempotencyKey("create_scenario");
				result = await createScenario(
					projectId,
					payload,
					idempotencyKey,
				);
				if (result.success && result.data?.id) {
					targetScenarioId = result.data.id;
				}
			}

			if (result.success && targetScenarioId) {
				// Ensure steps are saved in bulk via context with idempotency key
				const stepsIdempotencyKey = generateIdempotencyKey(
					"save_scenario_steps",
				);
				await saveScenarioSteps(
					projectId,
					targetScenarioId,
					steps,
					stepsIdempotencyKey,
				);

				toast.add({
					title: isEditing ? "Scenario Updated" : "Scenario Created",
					description: `Successfully ${isEditing ? "updated" : "saved"} scenario "${values.title.trim()}".`,
					type: "success",
				});

				reset();
				onOpenChange(false);
				onSuccess(targetScenarioId);
			} else {
				toast.add({
					title: "Save Failed",
					description:
						result.error ||
						"Failed to save scenario. Please try again.",
					type: "error",
				});
			}
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Failed to save scenario. Please try again.";
			toast.add({
				title: "Save Failed",
				description: msg,
				type: "error",
			});
		}
	};

	return (
		<FormDialog
			open={open}
			onOpenChange={onOpenChange}
			title={isEditing ? "Update Test Scenario" : "Save Test Scenario"}
			description={
				isEditing
					? `Update "${existingScenario?.title}" along with its ${steps.length} test steps.`
					: `Persist this recorded scenario along with its ${steps.length} test steps directly into the database.`
			}
			icon={
				isEditing ? (
					<Pencil className="h-4 w-4 text-primary" />
				) : (
					<Save className="h-4 w-4 text-primary" />
				)
			}
			onSubmit={handleSubmit(onSubmit)}
			submitLabel={
				isEditing
					? "Update & Persist Scenario"
					: "Save & Persist Scenario"
			}
			isSubmitting={isSubmitting}
			submitDisabled={steps.length === 0}
			maxWidth="2xl"
		>
			<Field>
				<FieldLabel htmlFor="title" className="text-xs font-semibold">
					Scenario Title <span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					id="title"
					{...register("title", { required: "Title is required" })}
					placeholder="e.g. User Login & Password Reset Flow"
					className="h-9 text-xs"
				/>
				{errors.title && (
					<FieldError>{errors.title.message}</FieldError>
				)}
			</Field>

			<Field>
				<FieldLabel
					htmlFor="description"
					className="text-xs font-semibold"
				>
					Description (Optional)
				</FieldLabel>
				<Textarea
					id="description"
					{...register("description")}
					placeholder="Brief summary of what this end-to-end scenario validates..."
					className="text-xs min-h-[70px]"
				/>
				{errors.description && (
					<FieldError>{errors.description.message}</FieldError>
				)}
			</Field>

			<div className="grid grid-cols-2 gap-3">
				<Field>
					<FieldLabel
						htmlFor="relativeRoute"
						className="text-xs font-semibold"
					>
						Starting Route
					</FieldLabel>
					<Input
						id="relativeRoute"
						{...register("relativeRoute")}
						placeholder="/"
						className="h-9 text-xs font-mono"
					/>
				</Field>

				<Field>
					<FieldLabel
						htmlFor="status"
						className="text-xs font-semibold"
					>
						Status
					</FieldLabel>
					<select
						id="status"
						{...register("status")}
						className="h-9 text-xs font-medium bg-background border border-input rounded-md px-3 w-full"
					>
						<option value="READY">READY (Active)</option>
						<option value="DRAFT">DRAFT</option>
						<option value="DEPRECATED">DEPRECATED</option>
					</select>
				</Field>
			</div>

			{/* Tags */}
			<Field>
				<FieldLabel className="text-xs font-semibold flex items-center gap-1">
					<Tag className="h-3 w-3 text-muted-foreground" /> Tags &
					Labels
				</FieldLabel>
				<Input
					value={tagInput}
					onChange={(e) => setTagInput(e.target.value)}
					onKeyDown={handleAddTag}
					placeholder="Type tag and press Enter (e.g. auth, smoke)..."
					className="h-8 text-xs mb-2"
				/>
				<div className="flex flex-wrap gap-1.5 min-h-[28px]">
					{tagsList.map((tag) => (
						<Badge
							key={tag}
							variant="secondary"
							className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
							onClick={() => handleRemoveTag(tag)}
						>
							#{tag} &times;
						</Badge>
					))}
				</div>
			</Field>

			{/* Step Summary */}
			<div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
				<div className="flex items-center justify-between text-xs font-semibold">
					<span className="flex items-center gap-1.5">
						<Layers className="h-3.5 w-3.5 text-primary" /> Recorded
						Steps Summary
					</span>
					<Badge variant="outline" className="text-[10px] font-mono">
						{steps.length} Steps
					</Badge>
				</div>
				<p className="text-[11px] text-muted-foreground">
					All steps will be saved in sequence (step 1 to{" "}
					{steps.length}) for this scenario.
				</p>
			</div>
		</FormDialog>
	);
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api-client/api-client.service";
import {
	RecordedStep,
	TestScenarioWithSteps,
} from "@/lib/scenarios-service/types";
import {
	saveDraftScenario,
	clearDraftScenario,
} from "@/lib/indexeddb-service/indexeddb.service";
import { StepItemCard } from "./_components/step-item-card";
import { SaveScenarioDialog } from "./_components/save-scenario-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { WorkspaceSkeleton } from "./_components/workspace-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";
import {
	Play,
	Square,
	Save,
	Trash2,
	ArrowLeft,
	Sparkles,
	Layers,
	Database,
	CheckCircle2,
	Radio,
	Globe,
	Monitor,
	ExternalLink,
	Zap,
	Loader2,
	Pencil,
	RotateCcw,
	AlertTriangle,
} from "lucide-react";
import { useScenarios } from "@/components/context/scenarios-context";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface WorkspacePageProps {
	projectId: string;
}

interface ProjectData {
	id: string;
	name: string;
	baseUrl: string;
	defaultViewportWidth?: number;
	defaultViewportHeight?: number;
}

interface RecorderResponse {
	sessionId?: string;
	isRecording?: boolean;
	isClosed?: boolean;
	currentUrl?: string;
	pageTitle?: string;
	steps?: RecordedStep[];
}

export function WorkspacePage({ projectId }: WorkspacePageProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const scenarioId = searchParams?.get("scenarioId") || null;

	const [project, setProject] = React.useState<ProjectData | null>(null);
	const [loadedScenario, setLoadedScenario] =
		React.useState<TestScenarioWithSteps | null>(null);
	const [isLoadingProject, setIsLoadingProject] = React.useState(true);
	const [isStartingRecording, setIsStartingRecording] = React.useState(false);
	const [isRecording, setIsRecording] = React.useState(false);
	const [isReplaying, setIsReplaying] = React.useState(false);
	const [replayMessage, setReplayMessage] = React.useState<string | null>(
		null,
	);
	const [currentUrl, setCurrentUrl] = React.useState("");
	const [viewportWidth, setViewportWidth] = React.useState<number>(1280);
	const [viewportHeight, setViewportHeight] = React.useState<number>(800);
	const [pageTitle, setPageTitle] = React.useState("");
	const [steps, setSteps] = React.useState<RecordedStep[]>([]);
	const [isDraftRestored, setIsDraftRestored] = React.useState(false);

	// Recording Insertion Target State
	const [recordingInsertIndex, setRecordingInsertIndex] = React.useState<
		number | null
	>(null);
	const baseStepsBeforeRef = React.useRef<RecordedStep[]>([]);
	const baseStepsAfterRef = React.useRef<RecordedStep[]>([]);
	const savedStepsSnapshotRef = React.useRef<string>("");

	// Helper to compute a unique signature for comparing step changes
	const getStepsSignature = React.useCallback((stepList: RecordedStep[]) => {
		return JSON.stringify(
			stepList.map((s) => ({
				id: s.id,
				order: s.stepOrder,
				type: s.actionType,
				key: s.primaryKey,
				val: s.inputConfig?.value,
				url: s.inputConfig?.url,
				sel: s.selectorMetadata?.cssSelector,
			})),
		);
	}, []);

	const hasStepChanges = React.useMemo(() => {
		if (!loadedScenario) return steps.length > 0;
		return getStepsSignature(steps) !== savedStepsSnapshotRef.current;
	}, [loadedScenario, steps, getStepsSignature]);

	// Dialog States
	const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);

	const sessionId = `studio-proj-${projectId}`;

	// Record From Step N: Replay steps 1..N in Chromium and pause at step N DOM state for live interaction & step insertion
	const handleRecordFromStep = async (targetIndex: number) => {
		if (!project || isStartingRecording) return;
		try {
			setIsStartingRecording(true);
			setRecordingInsertIndex(targetIndex);

			// Snapshot existing step boundaries before target index
			baseStepsBeforeRef.current = steps.slice(0, targetIndex + 1);
			baseStepsAfterRef.current = steps.slice(targetIndex + 1);

			await apiClient.post<RecorderResponse>(
				`/api/projects/${projectId}/recorder`,
				{
					action: "record_from_step",
					sessionId,
					targetIndex,
					steps,
				},
			);

			setIsRecording(true);
		} catch {
			setIsRecording(false);
		} finally {
			setIsStartingRecording(false);
		}
	};

	// 1. Load project details & existing scenario (if scenarioId is passed) or IndexedDB draft on mount
	React.useEffect(() => {
		let isMounted = true;

		async function initWorkspace() {
			try {
				const res = await apiClient.get<ProjectData>(
					`/api/projects/${projectId}`,
				);
				if (isMounted && res.data && !Array.isArray(res.data)) {
					const projData = res.data as ProjectData;
					setProject(projData);
					setCurrentUrl(projData.baseUrl || "");
					if (projData.defaultViewportWidth) {
						setViewportWidth(projData.defaultViewportWidth);
					}
					if (projData.defaultViewportHeight) {
						setViewportHeight(projData.defaultViewportHeight);
					}

					// Check if editing a defined existing scenario
					if (scenarioId) {
						try {
							const scRes =
								await apiClient.get<TestScenarioWithSteps>(
									`/api/projects/${projectId}/scenarios/${scenarioId}`,
								);
							if (
								isMounted &&
								scRes.data &&
								!Array.isArray(scRes.data)
							) {
								const scData =
									scRes.data as TestScenarioWithSteps;
								setLoadedScenario(scData);
								if (
									scData.steps &&
									Array.isArray(scData.steps)
								) {
									setSteps(scData.steps);
									savedStepsSnapshotRef.current =
										JSON.stringify(
											scData.steps.map((s) => ({
												id: s.id,
												order: s.stepOrder,
												type: s.actionType,
												key: s.primaryKey,
												val: s.inputConfig?.value,
												url: s.inputConfig?.url,
												sel: s.selectorMetadata
													?.cssSelector,
											})),
										);
								}
								if (
									scData.relativeRoute &&
									scData.relativeRoute !== "/"
								) {
									const fullUrl = projData.baseUrl.endsWith(
										"/",
									)
										? `${projData.baseUrl}${scData.relativeRoute.replace(/^\//, "")}`
										: `${projData.baseUrl}${scData.relativeRoute}`;
									setCurrentUrl(fullUrl);
								}
							}
						} catch {
							// Scenario fetch error fallback
						}
					} else {
						// New Scenario triggered -> Always clear IndexedDB draft & start with clean canvas!
						await clearDraftScenario(projectId);
						if (isMounted) {
							setSteps([]);
							setIsDraftRestored(false);
						}
					}
				}
			} catch {
				// Handled
			} finally {
				if (isMounted) setIsLoadingProject(false);
			}
		}

		initWorkspace();

		return () => {
			isMounted = false;
		};
	}, [projectId, scenarioId]);

	// 2. Real-time SSE stream & fallback polling when recording is active
	React.useEffect(() => {
		let eventSource: EventSource | null = null;
		let fallbackInterval: ReturnType<typeof setInterval> | null = null;

		const handleUpdateData = (data: RecorderResponse) => {
			if (data.currentUrl) setCurrentUrl(data.currentUrl);
			if (data.pageTitle) setPageTitle(data.pageTitle);

			if (Array.isArray(data.steps)) {
				const liveSessionSteps = data.steps;
				const mergedSteps = [
					...baseStepsBeforeRef.current,
					...liveSessionSteps,
					...baseStepsAfterRef.current,
				];

				const reordered = mergedSteps.map((s, idx) => ({
					...s,
					stepOrder: idx + 1,
				}));

				setSteps(reordered);

				saveDraftScenario({
					projectId,
					baseUrl: project?.baseUrl || "",
					currentUrl: data.currentUrl || "",
					viewport: { width: viewportWidth, height: viewportHeight },
					steps: reordered,
					updatedAt: Date.now(),
				});
			}

			if (data.isClosed) {
				setIsRecording(false);
			}
		};

		if (isRecording) {
			const streamUrl = `/api/projects/${projectId}/recorder/stream?sessionId=${sessionId}`;

			try {
				eventSource = new EventSource(streamUrl);

				eventSource.addEventListener("steps", (e: MessageEvent) => {
					try {
						const data = JSON.parse(e.data);
						handleUpdateData(data);
					} catch {}
				});

				eventSource.addEventListener("status", (e: MessageEvent) => {
					try {
						const data = JSON.parse(e.data);
						if (data.isClosed) setIsRecording(false);
					} catch {}
				});

				eventSource.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						handleUpdateData(data);
					} catch {}
				};

				eventSource.onerror = () => {
					if (!fallbackInterval) {
						fallbackInterval = setInterval(async () => {
							try {
								const res =
									await apiClient.get<RecorderResponse>(
										`/api/projects/${projectId}/recorder?sessionId=${sessionId}`,
									);
								if (res.data && !Array.isArray(res.data)) {
									handleUpdateData(
										res.data as RecorderResponse,
									);
								}
							} catch {}
						}, 1000);
					}
				};
			} catch {
				fallbackInterval = setInterval(async () => {
					try {
						const res = await apiClient.get<RecorderResponse>(
							`/api/projects/${projectId}/recorder?sessionId=${sessionId}`,
						);
						if (res.data && !Array.isArray(res.data)) {
							handleUpdateData(res.data as RecorderResponse);
						}
					} catch {}
				}, 1000);
			}
		}

		return () => {
			if (eventSource) eventSource.close();
			if (fallbackInterval) clearInterval(fallbackInterval);
		};
	}, [
		isRecording,
		projectId,
		sessionId,
		project?.baseUrl,
		viewportWidth,
		viewportHeight,
	]);

	const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = React.useState(false);

	const proceedStartRecording = async (initialSteps: RecordedStep[]) => {
		if (!project || isStartingRecording || isRecording) return;
		try {
			setIsStartingRecording(true);

			baseStepsBeforeRef.current = [...initialSteps];
			baseStepsAfterRef.current = [];
			setRecordingInsertIndex(null);

			const targetUrl = currentUrl || project.baseUrl;

			await apiClient.post<RecorderResponse>(
				`/api/projects/${projectId}/recorder`,
				{
					action: "start",
					sessionId,
					url: targetUrl,
					viewport: {
						width: viewportWidth,
						height: viewportHeight,
					},
				},
			);

			// Connect SSE stream ONLY AFTER session creation completes cleanly
			setIsRecording(true);
		} catch {
			setIsRecording(false);
		} finally {
			setIsStartingRecording(false);
		}
	};

	// Direct 1-Click Start Recording Session
	const handleStartRecording = async () => {
		if (!project || isStartingRecording || isRecording) return;

		// If user has unsaved draft steps and is starting a new recording from scratch (not inserting after a step), prompt confirmation dialog
		if (steps.length > 0 && !loadedScenario && recordingInsertIndex === null) {
			setIsDiscardConfirmOpen(true);
			return;
		}

		await proceedStartRecording(steps);
	};

	// Confirm Discard Draft and Start Recording Fresh
	const handleConfirmDiscardAndStart = async () => {
		setIsDiscardConfirmOpen(false);
		await clearDraftScenario(projectId);
		setSteps([]);
		setIsDraftRestored(false);
		await proceedStartRecording([]);
	};

	// Stop Recording Session
	const handleStopRecording = async () => {
		try {
			await apiClient.post(`/api/projects/${projectId}/recorder`, {
				action: "stop",
				sessionId,
			});
			setIsRecording(false);
		} catch {
			setIsRecording(false);
		}
	};

	// Replay Recorded Steps in Chromium Browser
	const handleReplayScenario = async () => {
		if (steps.length === 0 || isReplaying) return;
		try {
			setIsReplaying(true);
			setReplayMessage("Replaying test steps in Chromium...");
			const res = await apiClient.post<RecorderResponse>(
				`/api/projects/${projectId}/recorder`,
				{
					action: "replay",
					sessionId,
					steps,
				},
			);

			if (res.data && !Array.isArray(res.data)) {
				const data = res.data as RecorderResponse;
				if (data.currentUrl) setCurrentUrl(data.currentUrl);
				if (data.pageTitle) setPageTitle(data.pageTitle);
			}
			setReplayMessage("Replay finished cleanly!");
			setTimeout(() => setReplayMessage(null), 4000);
		} catch {
			setReplayMessage("Replay failed.");
			setTimeout(() => setReplayMessage(null), 4000);
		} finally {
			setIsReplaying(false);
		}
	};

	// Clear Steps
	const handleClearDraft = async () => {
		setSteps([]);
		setRecordingInsertIndex(null);
		setIsDraftRestored(false);
		await clearDraftScenario(projectId);
	};

	// Handle Manual Add Step
	const handleAddCustomStep = (
		newStep: RecordedStep,
		insertIndex: number,
	) => {
		const updated = [...steps];
		const targetIdx = Math.max(0, Math.min(insertIndex, updated.length));
		updated.splice(targetIdx, 0, newStep);

		const reordered = updated.map((step, idx) => ({
			...step,
			stepOrder: idx + 1,
		}));
		setSteps(reordered);

		saveDraftScenario({
			projectId,
			baseUrl: project?.baseUrl || "",
			currentUrl,
			viewport: { width: viewportWidth, height: viewportHeight },
			steps: reordered,
			updatedAt: Date.now(),
		});
	};

	// Step reordering
	const handleMoveStep = (fromIndex: number, toIndex: number) => {
		if (toIndex < 0 || toIndex >= steps.length) return;
		const updated = [...steps];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(toIndex, 0, moved);

		const reordered = updated.map((step, idx) => ({
			...step,
			stepOrder: idx + 1,
		}));
		setSteps(reordered);

		saveDraftScenario({
			projectId,
			baseUrl: project?.baseUrl || "",
			currentUrl,
			viewport: { width: viewportWidth, height: viewportHeight },
			steps: reordered,
			updatedAt: Date.now(),
		});
	};

	// Step deletion
	const handleDeleteStep = (indexToDelete: number) => {
		const updated = steps.filter((_, idx) => idx !== indexToDelete);
		const reordered = updated.map((step, idx) => ({
			...step,
			stepOrder: idx + 1,
		}));
		setSteps(reordered);

		if (recordingInsertIndex === indexToDelete) {
			setRecordingInsertIndex(null);
		}

		saveDraftScenario({
			projectId,
			baseUrl: project?.baseUrl || "",
			currentUrl,
			viewport: { width: viewportWidth, height: viewportHeight },
			steps: reordered,
			updatedAt: Date.now(),
		});
	};

	// Step locator & description update
	const handleUpdateStep = (indexToUpdate: number, updatedFields: Partial<RecordedStep>) => {
		const updated = steps.map((step, idx) => {
			if (idx === indexToUpdate) {
				return {
					...step,
					...updatedFields,
					selectorMetadata: {
						...step.selectorMetadata,
						...updatedFields.selectorMetadata,
					},
					inputConfig: {
						...step.inputConfig,
						...updatedFields.inputConfig,
					},
				};
			}
			return step;
		});
		setSteps(updated);

		saveDraftScenario({
			projectId,
			baseUrl: project?.baseUrl || "",
			currentUrl,
			viewport: { width: viewportWidth, height: viewportHeight },
			steps: updated,
			updatedAt: Date.now(),
		});
	};

	// Saving & Updating Steps State
	const [isSavingSteps, setIsSavingSteps] = React.useState(false);
	const [statusFeedbackMessage, setStatusFeedbackMessage] = React.useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);

	const { saveScenarioSteps } = useScenarios();

	// Primary Save Action: Direct 1-Click Update Steps for loaded scenario, or Open Save Dialog for new scenario
	const handlePrimarySaveAction = async () => {
		if (steps.length === 0 || isSavingSteps) return;

		if (loadedScenario && loadedScenario.id) {
			try {
				setIsSavingSteps(true);
				const idempotencyKey = generateIdempotencyKey(
					"save_scenario_steps",
				);
				const result = await saveScenarioSteps(
					projectId,
					loadedScenario.id,
					steps,
					idempotencyKey,
				);

				if (result.success) {
					savedStepsSnapshotRef.current = getStepsSignature(steps);
					await clearDraftScenario(projectId);
					if (isRecording) {
						await handleStopRecording();
					}
					toast.add({
						title: "Steps Updated",
						description: `Successfully updated ${steps.length} test ${steps.length === 1 ? "step" : "steps"}.`,
						type: "success",
					});
					setStatusFeedbackMessage({
						text: `Successfully updated ${steps.length} test ${steps.length === 1 ? "step" : "steps"}!`,
						type: "success",
					});
					setTimeout(() => setStatusFeedbackMessage(null), 4000);
				} else {
					toast.add({
						title: "Update Failed",
						description:
							result.error ||
							"Failed to update test steps. Please try again.",
						type: "error",
					});
					setStatusFeedbackMessage({
						text:
							result.error ||
							"Failed to update test steps. Please try again.",
						type: "error",
					});
					setTimeout(() => setStatusFeedbackMessage(null), 4000);
				}
			} catch {
				toast.add({
					title: "Update Failed",
					description:
						"Failed to update test steps. Please try again.",
					type: "error",
				});
				setStatusFeedbackMessage({
					text: "Failed to update test steps. Please try again.",
					type: "error",
				});
				setTimeout(() => setStatusFeedbackMessage(null), 4000);
			} finally {
				setIsSavingSteps(false);
			}
		} else {
			setSaveDialogOpen(true);
		}
	};

	// Handle Save Scenario Success
	const handleSaveSuccess = async (savedScenarioId?: string) => {
		await clearDraftScenario(projectId);
		if (isRecording) {
			await handleStopRecording();
		}

		const targetId = savedScenarioId || loadedScenario?.id;

		if (loadedScenario && targetId) {
			// If editing an existing scenario in studio workspace, reload updated scenario details and stay in workspace
			try {
				const scRes = await apiClient.get<TestScenarioWithSteps>(
					`/api/projects/${projectId}/scenarios/${targetId}`,
				);
				if (scRes.data && !Array.isArray(scRes.data)) {
					const scData = scRes.data as TestScenarioWithSteps;
					setLoadedScenario(scData);
					if (scData.steps && Array.isArray(scData.steps)) {
						setSteps(scData.steps);
					}
				}
			} catch {
				// Fallback
			}
		} else {
			// If creating a brand new scenario, navigate to project details
			router.push(`/dashboard/projects/${projectId}`);
		}
	};

	if (isLoadingProject) {
		return <WorkspaceSkeleton />;
	}

	return (
		<div className="flex flex-col h-[calc(100vh-7rem)] bg-background space-y-4 text-foreground overflow-hidden">
			{/* Top Navigation Header */}
			<header className="px-3 py-3 border border-border bg-card rounded-xl flex items-center justify-between gap-4 shrink-0 z-30 shadow-xs">
				<div className="flex items-center gap-3 min-w-0">
					<Link
						href={`/dashboard/projects/${projectId}`}
						title="Back to Project Details"
					>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>

					<div className="space-y-0.5 truncate">
						<div className="flex items-center gap-2">
							<h1 className="text-sm font-bold text-foreground truncate">
								{loadedScenario
									? loadedScenario.title
									: project?.name ||
										"TestLoom Studio Workspace"}
							</h1>
							{loadedScenario ? (
								<div className="flex items-center gap-1.5">
									<Badge
										variant="outline"
										className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1 font-mono"
									>
										<Pencil className="h-3 w-3" /> SCENARIO
										LOADED
									</Badge>
								</div>
							) : isRecording ? (
								<Badge
									variant="outline"
									className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1 font-mono animate-pulse"
								>
									<Radio className="h-3 w-3 text-primary" />{" "}
									REC LIVE
								</Badge>
							) : isReplaying ? (
								<Badge
									variant="outline"
									className="bg-secondary text-secondary-foreground border-border text-[10px] gap-1 font-mono animate-pulse"
								>
									<RotateCcw className="h-3 w-3 animate-spin text-primary" />{" "}
									REPLAYING
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="text-[10px] text-muted-foreground"
								>
									IDLE
								</Badge>
							)}
						</div>
					</div>
				</div>

				{/* Action Controls */}
				<div className="flex items-center gap-2">
					{isDraftRestored && steps.length > 0 && !loadedScenario && (
						<div className="flex items-center gap-1.5 bg-muted/60 border border-border px-2 py-0.5 rounded-lg hidden sm:flex">
							<Badge
								variant="secondary"
								className="text-[10px] gap-1 border-0"
							>
								<Database className="h-3 w-3 text-primary" /> Draft
								Restored
							</Badge>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleClearDraft}
								className="h-5 text-[10px] text-destructive hover:bg-destructive/10 px-1.5 font-medium rounded-md"
								title="Discard restored draft and start fresh"
							>
								<Trash2 className="h-3 w-3 mr-1" /> Discard
							</Button>
						</div>
					)}

					{!isRecording ? (
						<Button
							size="sm"
							onClick={handleStartRecording}
							disabled={
								isReplaying ||
								isStartingRecording ||
								isSavingSteps
							}
							className="h-9 text-xs font-semibold gap-1.5 shadow-xs"
						>
							{isStartingRecording ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Play className="h-3.5 w-3.5 fill-current" />
							)}
							<span>
								{isStartingRecording
									? "Starting Browser..."
									: "Start Recording"}
							</span>
						</Button>
					) : (
						<Button
							size="sm"
							variant="outline"
							onClick={handleStopRecording}
							className="h-9 text-xs font-semibold gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
						>
							<Square className="h-3.5 w-3.5 fill-current" /> Stop
							Recording
						</Button>
					)}

					<Button
						size="sm"
						variant="outline"
						onClick={handleReplayScenario}
						disabled={
							steps.length === 0 ||
							isReplaying ||
							isRecording ||
							isSavingSteps
						}
						className="h-9 text-xs font-semibold gap-1.5 border-border hover:bg-accent hover:text-accent-foreground"
					>
						{isReplaying ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<RotateCcw className="h-3.5 w-3.5" />
						)}
						<span>Replay Test Steps</span>
					</Button>

					{loadedScenario && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => setSaveDialogOpen(true)}
							className="h-9 text-xs font-semibold gap-1.5 border-border hover:bg-accent hover:text-accent-foreground"
							title="Edit Scenario Title, Description, Route & Status"
						>
							<Pencil className="h-3.5 w-3.5 text-primary" />
							<span>Edit Scenario</span>
						</Button>
					)}

					<Button
						size="sm"
						onClick={handlePrimarySaveAction}
						disabled={
							!hasStepChanges || isReplaying || isSavingSteps
						}
						className="h-9 text-xs font-semibold gap-1.5"
					>
						{isSavingSteps ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : loadedScenario ? (
							<CheckCircle2 className="h-3.5 w-3.5" />
						) : (
							<Save className="h-3.5 w-3.5" />
						)}
						<span>
							{isSavingSteps
								? "Updating Steps..."
								: loadedScenario
									? hasStepChanges
										? `Update Steps (${steps.length})`
										: "Steps Up to Date"
									: `Save Scenario (${steps.length})`}
						</span>
					</Button>
				</div>
			</header>

			{/* Main Studio 2-Column Layout with Independent Column Scrolling */}
			<main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
				{/* Left Column: Live Browser Session Info & Workflow (Independent Scroll Area) */}
				<ScrollArea className="lg:col-span-5 xl:col-span-4 h-full pr-1">
					<div className="flex flex-col gap-4 pb-2">
						{/* Active Session Status Card */}
						<div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
							<div className="flex items-center justify-between border-b border-border pb-3">
								<div className="flex items-center gap-2">
									<Monitor className="h-4 w-4 text-primary" />
									<h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
										Live Playwright Browser
									</h2>
								</div>
								{isRecording ? (
									<Badge
										variant="outline"
										className="bg-primary/10 text-primary border-primary/20 text-[11px] gap-1.5 font-semibold"
									>
										<span className="h-2 w-2 rounded-full bg-primary animate-ping" />
										Recording Active
									</Badge>
								) : isReplaying ? (
									<Badge
										variant="outline"
										className="bg-secondary text-secondary-foreground border-border text-[11px] gap-1.5 font-semibold"
									>
										<span className="h-2 w-2 rounded-full bg-primary animate-ping" />
										Replaying Steps
									</Badge>
								) : (
									<Badge
										variant="outline"
										className="text-[11px] text-muted-foreground"
									>
										Session Ready
									</Badge>
								)}
							</div>

							<div className="space-y-3">
								<div className="space-y-1.5">
									<div className="flex items-center justify-between">
										<label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
											Target Website URL / Route
										</label>
										<span className="text-[10px] text-primary font-medium">
											Editable
										</span>
									</div>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Globe className="h-4 w-4 text-primary shrink-0" />
										</InputGroupAddon>
										<InputGroupInput
											type="text"
											value={currentUrl}
											onChange={(e) => {
												const val = e.target.value;
												if (val.startsWith("/")) {
													const base = project?.baseUrl || "";
													const full = base.endsWith("/") ? `${base}${val.substring(1)}` : `${base}${val}`;
													setCurrentUrl(full);
												} else {
													setCurrentUrl(val);
												}
											}}
											placeholder={project?.baseUrl || "http://localhost:3000"}
											className="font-mono text-xs"
											title="Target Base URL / Route (e.g. http://localhost:3000/auth/login or /dashboard)"
										/>
										{currentUrl && (
											<InputGroupAddon align="inline-end">
												<a
													href={currentUrl}
													target="_blank"
													rel="noreferrer"
													className="text-muted-foreground hover:text-primary transition-colors"
													title="Open in new browser tab"
												>
													<ExternalLink className="h-3.5 w-3.5" />
												</a>
											</InputGroupAddon>
										)}
									</InputGroup>
								</div>

								{pageTitle && (
									<div className="space-y-1">
										<label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
											Active Page Title
										</label>
										<p className="text-xs font-medium text-foreground truncate p-2.5 rounded-lg border border-border bg-muted/20">
											{pageTitle}
										</p>
									</div>
								)}

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
									<div className="p-2.5 rounded-lg border border-border bg-muted/10 space-y-1.5">
										<label className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider block">
											Screen Resolution
										</label>
										<Select
											value={`${viewportWidth}x${viewportHeight}`}
											onValueChange={(val) => {
												if (!val) return;
												const [w, h] = val.split("x").map(Number);
												if (w && h) {
													setViewportWidth(w);
													setViewportHeight(h);
												}
											}}
										>
											<SelectTrigger size="sm" className="w-full h-8 text-xs font-mono font-medium bg-background">
												<SelectValue placeholder="Select Screen Size" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="1920x1080">1920 × 1080 (Full HD)</SelectItem>
												<SelectItem value="1280x800">1280 × 800 (Laptop)</SelectItem>
												<SelectItem value="1440x900">1440 × 900 (MacBook Pro)</SelectItem>
												<SelectItem value="1536x864">1536 × 864 (Standard Desktop)</SelectItem>
												<SelectItem value="1366x768">1366 × 768 (HD Laptop)</SelectItem>
												<SelectItem value="768x1024">768 × 1024 (Tablet)</SelectItem>
												<SelectItem value="375x812">375 × 812 (Mobile)</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="p-2.5 rounded-lg border border-border bg-muted/10 space-y-1">
										<span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider block">
											Engine
										</span>
										<p className="font-bold text-foreground font-mono text-xs pt-1">
											Chromium Headful
										</p>
									</div>
								</div>
							</div>

							{/* Direct Primary Action Buttons */}
							<div className="space-y-2">
								{!isRecording ? (
									<Button
										onClick={handleStartRecording}
										disabled={
											isReplaying || isStartingRecording
										}
										className="w-full h-10 text-xs font-semibold gap-2 shadow-xs"
									>
										{isStartingRecording ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Play className="h-4 w-4 fill-current" />
										)}
										<span>
											{isStartingRecording
												? "Starting Playwright Browser..."
												: "Start Recording"}
										</span>
									</Button>
								) : (
									<Button
										variant="outline"
										onClick={handleStopRecording}
										className="w-full h-10 text-xs font-semibold gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
									>
										<Square className="h-4 w-4 fill-current" />{" "}
										Stop Recording
									</Button>
								)}

								{steps.length > 0 && (
									<Button
										variant="outline"
										onClick={handleReplayScenario}
										disabled={isReplaying || isRecording}
										className="w-full h-9 text-xs font-semibold gap-2 border-border hover:bg-accent hover:text-accent-foreground"
									>
										{isReplaying ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<RotateCcw className="h-3.5 w-3.5" />
										)}
										<span>
											Replay Recorded Steps (
											{steps.length})
										</span>
									</Button>
								)}
							</div>

							{replayMessage && (
								<div className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs text-foreground font-medium flex items-center gap-2">
									<RotateCcw className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
									<span>{replayMessage}</span>
								</div>
							)}

							{statusFeedbackMessage && (
								<div
									className={cn(
										"p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all",
										statusFeedbackMessage.type === "success"
											? "bg-primary/10 border-primary/30 text-primary"
											: "bg-destructive/10 border-destructive/30 text-destructive",
									)}
								>
									<CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
									<span>{statusFeedbackMessage.text}</span>
								</div>
							)}
						</div>

						{/* Interactive Recording Instructions Card */}
						<div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
							<div className="flex items-center gap-2 text-primary">
								<Zap className="h-4 w-4" />
								<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
									Workspace Workflow
								</h3>
							</div>
							<ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
								<li className="flex items-start gap-2">
									<span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
										1
									</span>
									<span>
										Click{" "}
										<strong>
											&quot;Start Recording&quot;
										</strong>{" "}
										to open Chromium and record clicks,
										typing, and navigation.
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
										2
									</span>
									<span>
										New live actions stream automatically
										and append at the end (or after your
										selected step).
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
										3
									</span>
									<span>
										Click{" "}
										<strong>
											&quot;Replay Test Steps&quot;
										</strong>{" "}
										to test and verify step execution in the
										browser.
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
										4
									</span>
									<span>
										Click{" "}
										<strong>
											&quot;Save Scenario&quot;
										</strong>{" "}
										to save or update the scenario and steps
										in PostgreSQL.
									</span>
								</li>
							</ul>
						</div>
					</div>
				</ScrollArea>

				{/* Right Column: Live Recorded Steps Timeline (Independent Scroll Container) */}
				<div className="lg:col-span-7 xl:col-span-8 flex flex-col rounded-xl border border-border bg-card shadow-xs h-full min-h-0 overflow-hidden">
					<div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
						<div className="flex items-center gap-2">
							<Layers className="h-4 w-4 text-primary" />
							<h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
								{loadedScenario
									? `Steps: ${loadedScenario.title}`
									: "Recorded Steps Timeline"}
							</h2>
						</div>
						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className="text-[10px] font-mono"
							>
								{steps.length}{" "}
								{steps.length === 1 ? "step" : "steps"}
							</Badge>
							{steps.length > 0 && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={handleClearDraft}
									className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive p-1.5"
									title="Clear steps"
								>
									<Trash2 className="h-3.5 w-3.5" />
									<span>Clear</span>
								</Button>
							)}
						</div>
					</div>

					<div className="flex-1 overflow-hidden p-4 bg-muted/5 min-h-0">
						{steps.length === 0 ? (
							<div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl">
								<div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
									<Sparkles className="h-6 w-6" />
								</div>
								<h3 className="text-sm font-bold text-foreground">
									No Steps Recorded Yet
								</h3>
								<p className="text-xs text-muted-foreground mt-1.5 max-w-[320px] leading-relaxed">
									Click{" "}
									<strong>&quot;Start Recording&quot;</strong>{" "}
									to launch Chromium. Interact directly with
									the website inside the opened browser window
									to record clicks, typing, navigation, and
									form actions.
								</p>
								{!isRecording && (
									<Button
										size="sm"
										onClick={handleStartRecording}
										className="mt-4 text-xs font-semibold gap-1.5"
									>
										<Play className="h-3.5 w-3.5 fill-current" />{" "}
										Start Recording
									</Button>
								)}
							</div>
						) : (
							<ScrollArea className="h-full pr-3">
								<div className="relative space-y-3 py-2 px-1">
									{/* Continuous Vertical Stepper Line */}
									{steps.length > 1 && (
										<div className="absolute left-[18px] top-5 bottom-5 w-0.5 bg-border/70 z-0" />
									)}

									{steps.map((step, idx) => (
										<StepItemCard
											key={step.id || `step-${idx}`}
											step={step}
											index={idx}
											totalSteps={steps.length}
											isSelectedForRecording={
												recordingInsertIndex === idx
											}
											onSelectForRecording={() =>
												handleRecordFromStep(idx)
											}
											onMoveUp={() =>
												handleMoveStep(idx, idx - 1)
											}
											onMoveDown={() =>
												handleMoveStep(idx, idx + 1)
											}
											onDelete={() =>
												handleDeleteStep(idx)
											}
											onUpdateStep={(updated) =>
												handleUpdateStep(idx, updated)
											}
										/>
									))}
								</div>
							</ScrollArea>
						)}
					</div>

					<div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2 shrink-0">
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
							<CheckCircle2 className="h-3.5 w-3.5 text-primary" />
							<span>
								{recordingInsertIndex !== null
									? `Recording Target: Inserting live after Step #${recordingInsertIndex + 1}`
									: "Live recording target: Appending at end of timeline"}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={handleReplayScenario}
								disabled={
									steps.length === 0 ||
									isReplaying ||
									isRecording
								}
								className="h-8 text-xs font-semibold gap-1.5 border-border hover:bg-accent hover:text-accent-foreground"
							>
								{isReplaying ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<RotateCcw className="h-3.5 w-3.5" />
								)}
								<span>Replay Test Steps</span>
							</Button>

							<Button
								size="sm"
								onClick={handlePrimarySaveAction}
								disabled={
									!hasStepChanges ||
									isReplaying ||
									isSavingSteps
								}
								className="h-8 text-xs font-semibold gap-1.5 shrink-0"
							>
								{isSavingSteps ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : loadedScenario ? (
									<CheckCircle2 className="h-3.5 w-3.5" />
								) : (
									<Save className="h-3.5 w-3.5" />
								)}
								<span>
									{isSavingSteps
										? "Updating Steps..."
										: loadedScenario
											? hasStepChanges
												? `Update Steps (${steps.length})`
												: "Steps Up to Date"
											: `Save Scenario (${steps.length})`}
								</span>
							</Button>
						</div>
					</div>
				</div>
			</main>

			<SaveScenarioDialog
				open={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				projectId={projectId}
				baseUrl={project?.baseUrl}
				currentUrl={currentUrl}
				existingScenario={loadedScenario}
				steps={steps}
				onSuccess={handleSaveSuccess}
			/>

			<ConfirmDialog
				open={isDiscardConfirmOpen}
				onOpenChange={setIsDiscardConfirmOpen}
				icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
				title="Discard Unsaved Draft & Start Recording?"
				description="Starting a new browser recording session will clear your previous unsaved draft steps from IndexedDB. Are you sure you want to discard the draft and record fresh?"
				confirmLabel="Clear Draft & Start Recording"
				cancelLabel="Cancel"
				confirmVariant="destructive"
				onConfirm={handleConfirmDiscardAndStart}
			/>
		</div>
	);
}

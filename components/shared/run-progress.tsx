"use client";

import * as React from "react";
import {
	Ban,
	Check,
	CheckCircle2,
	Circle,
	FolderKanban,
	Globe,
	Loader2,
	Minus,
	Monitor,
	RotateCcw,
	Square,
	Timer,
	WifiOff,
	Wrench,
	X,
	XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useExecutions } from "@/components/context/executions-context";
import type {
	ExecutionRunSnapshot,
	RunStatus,
	RunStepState,
	RunStepStatus,
} from "@/lib/scenarios-service/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

interface StepEventPayload {
	index: number;
	step: RunStepState;
	passedSteps: number;
	failedSteps: number;
	healedSteps: number;
	currentUrl: string;
	pageTitle: string;
}

const NODE_STYLES: Record<RunStepStatus, string> = {
	PENDING: "border-border bg-background text-muted-foreground",
	RUNNING: "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
	PASSED: "border-primary bg-primary text-primary-foreground",
	HEALED: "border-chart-3 bg-chart-3 text-primary-foreground",
	FAILED: "border-destructive bg-destructive text-primary-foreground",
	SKIPPED: "border-border bg-muted text-muted-foreground",
};

const STEP_STATUS_LABEL: Record<RunStepStatus, string> = {
	PENDING: "Waiting",
	RUNNING: "Running",
	PASSED: "Passed",
	HEALED: "Healed",
	FAILED: "Failed",
	SKIPPED: "Skipped",
};

function formatElapsed(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return minutes > 0
		? `${minutes}m ${String(seconds).padStart(2, "0")}s`
		: `${seconds}s`;
}

function formatDuration(ms: number): string {
	return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Follows GET /api/executions/:id/stream and keeps a live snapshot of the run. The stream sends a
 * full snapshot on every (re)connect, so EventSource's automatic reconnect is safe, and it is closed
 * as soon as the run completes.
 */
function useExecutionRun(
	executionId: string | null,
	onComplete?: (snapshot: ExecutionRunSnapshot) => void,
): { snapshot: ExecutionRunSnapshot | null; isReconnecting: boolean } {
	// State is keyed by execution id so switching runs never shows the previous run's data
	const [state, setState] = React.useState<{
		executionId: string | null;
		snapshot: ExecutionRunSnapshot | null;
		isReconnecting: boolean;
	}>({ executionId: null, snapshot: null, isReconnecting: false });

	const onCompleteRef = React.useRef(onComplete);
	React.useEffect(() => {
		onCompleteRef.current = onComplete;
	});

	React.useEffect(() => {
		if (!executionId) return;

		const update = (
			fn: (
				prev: ExecutionRunSnapshot | null,
			) => ExecutionRunSnapshot | null,
		) =>
			setState((prev) => ({
				executionId,
				snapshot: fn(
					prev.executionId === executionId ? prev.snapshot : null,
				),
				isReconnecting: false,
			}));

		const parse = <T,>(event: Event): T | null => {
			try {
				return JSON.parse((event as MessageEvent<string>).data) as T;
			} catch {
				return null;
			}
		};

		const source = new EventSource(
			`/api/executions/${executionId}/stream`,
		);

		source.addEventListener("snapshot", (event) => {
			const data = parse<ExecutionRunSnapshot>(event);
			if (data) update(() => data);
		});

		source.addEventListener("step", (event) => {
			const data = parse<StepEventPayload>(event);
			if (!data) return;
			update((prev) =>
				prev
					? {
							...prev,
							steps: prev.steps.map((step) =>
								step.index === data.index ? data.step : step,
							),
							passedSteps: data.passedSteps,
							failedSteps: data.failedSteps,
							healedSteps: data.healedSteps,
							currentUrl: data.currentUrl,
							pageTitle: data.pageTitle,
						}
					: prev,
			);
		});

		source.addEventListener("frame", (event) => {
			const data = parse<{ frame: string }>(event);
			if (data)
				update((prev) =>
					prev ? { ...prev, frame: data.frame } : prev,
				);
		});

		source.addEventListener("complete", (event) => {
			const data = parse<ExecutionRunSnapshot>(event);
			if (data) {
				update(() => data);
				onCompleteRef.current?.(data);
			}
			source.close();
		});

		source.onerror = () => {
			// readyState CONNECTING means the browser is retrying on its own
			if (source.readyState === EventSource.CONNECTING) {
				setState((prev) =>
					prev.executionId === executionId
						? { ...prev, isReconnecting: true }
						: prev,
				);
			}
		};

		return () => source.close();
	}, [executionId]);

	const isCurrent = state.executionId === executionId;
	return {
		snapshot: isCurrent ? state.snapshot : null,
		isReconnecting: isCurrent && state.isReconnecting,
	};
}

function RunStatusBadge({ status }: { status: RunStatus }) {
	switch (status) {
		case "PASSED":
			return (
				<Badge variant="success" className="gap-1">
					<CheckCircle2 className="h-3 w-3" /> Passed
				</Badge>
			);
		case "FAILED":
			return (
				<Badge variant="destructive" className="gap-1">
					<XCircle className="h-3 w-3" /> Failed
				</Badge>
			);
		case "CANCELLED":
			return (
				<Badge variant="outline" className="gap-1">
					<Ban className="h-3 w-3" /> Cancelled
				</Badge>
			);
		case "RUNNING":
			return (
				<Badge variant="default" className="gap-1">
					<Loader2 className="h-3 w-3 animate-spin" /> Running
				</Badge>
			);
		default:
			return <Badge variant="secondary">Queued</Badge>;
	}
}

function RunStat({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
			<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
				{label}
			</p>
			<p className="text-base font-semibold text-foreground tabular-nums">
				{value}
			</p>
		</div>
	);
}

function StepNodeIcon({ status }: { status: RunStepStatus }) {
	const className = "h-3.5 w-3.5";
	switch (status) {
		case "RUNNING":
			return <Loader2 className={cn(className, "animate-spin")} />;
		case "PASSED":
			return <Check className={className} />;
		case "HEALED":
			return <Wrench className={className} />;
		case "FAILED":
			return <X className={className} />;
		case "SKIPPED":
			return <Minus className={className} />;
		default:
			return <Circle className="h-2 w-2" />;
	}
}

/** Vertical delivery-style timeline: one node per step, joined by a line that fills as steps complete. */
function StepTracker({ steps }: { steps: RunStepState[] }) {
	const runningRef = React.useRef<HTMLLIElement | null>(null);
	const runningIndex = steps.find((step) => step.status === "RUNNING")?.index;

	// Keep the running step in view, at the bottom edge, as the run moves down the list
	React.useEffect(() => {
		runningRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
	}, [runningIndex]);

	return (
		<ol className="relative" aria-label="Run progress">
			{steps.map((step, position) => {
				const isLast = position === steps.length - 1;
				const isDone =
					step.status === "PASSED" || step.status === "HEALED";
				const isMuted =
					step.status === "PENDING" || step.status === "SKIPPED";

				return (
					<li
						key={step.index}
						ref={step.status === "RUNNING" ? runningRef : undefined}
						className="relative flex gap-3 pb-5 last:pb-0"
						aria-current={
							step.status === "RUNNING" ? "step" : undefined
						}
					>
						{!isLast && (
							<span
								aria-hidden="true"
								className={cn(
									"absolute left-[13px] top-7 bottom-0 w-0.5 transition-colors duration-500",
									isDone ? "bg-primary" : "bg-border",
								)}
							/>
						)}

						<span
							className={cn(
								"relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
								NODE_STYLES[step.status],
							)}
						>
							<StepNodeIcon status={step.status} />
						</span>

						<div className="min-w-0 flex-1 pt-0.5 space-y-1">
							<div className="flex items-center gap-2 flex-wrap">
								<span
									className={cn(
										"text-sm font-medium truncate",
										isMuted
											? "text-muted-foreground"
											: "text-foreground",
									)}
								>
									{step.description}
								</span>
								<Badge
									variant="outline"
									className="text-[10px] uppercase shrink-0"
								>
									{step.actionType}
								</Badge>
								{step.durationMs !== null && (
									<span className="text-[11px] font-mono text-muted-foreground shrink-0">
										{formatDuration(step.durationMs)}
									</span>
								)}
							</div>

							<p className="text-[11px] text-muted-foreground">
								{step.status === "RUNNING" ? (
									<span className="text-primary font-medium">
										In progress...
									</span>
								) : (
									STEP_STATUS_LABEL[step.status]
								)}
							</p>

							{step.status === "HEALED" &&
								step.healedSelector && (
									<p className="text-[11px] text-muted-foreground">
										Primary locator failed. Recovered with{" "}
										<span className="font-medium text-foreground">
											{step.healedPriority}
										</span>
										:{" "}
										<code className="font-mono break-all">
											{step.healedSelector}
										</code>
									</p>
								)}

							{step.status === "FAILED" && (
								<div className="space-y-2">
									{step.error && (
										<p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5 break-words">
											{step.error}
										</p>
									)}
									{step.screenshot && (
										// eslint-disable-next-line @next/next/no-img-element -- data URL captured at failure time
										<img
											src={step.screenshot}
											alt={`Page at the moment step ${step.index + 1} failed`}
											className="max-h-40 rounded-md border border-border"
										/>
									)}
								</div>
							)}
						</div>
					</li>
				);
			})}
		</ol>
	);
}

interface RunProgressBodyProps {
	snapshot: ExecutionRunSnapshot | null;
	isReconnecting: boolean;
	isCancelling: boolean;
	queueLabel?: string;
	onCancel: () => void;
	onClose: () => void;
	onRerun?: () => void;
}

/** Header, progress bar, live browser view, counters, step tracker and actions. */
function RunProgressBody({
	snapshot,
	isReconnecting,
	isCancelling,
	queueLabel,
	onCancel,
	onClose,
	onRerun,
}: RunProgressBodyProps) {
	const [now, setNow] = React.useState(() => Date.now());
	const isLive =
		snapshot?.status === "RUNNING" || snapshot?.status === "PENDING";

	// Tick once a second while running so the elapsed time stays live
	React.useEffect(() => {
		if (!isLive) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [isLive]);

	const total = snapshot?.totalSteps ?? 0;
	const finished = snapshot
		? snapshot.steps.filter(
				(step) =>
					step.status !== "PENDING" && step.status !== "RUNNING",
			).length
		: 0;
	const runningStep = snapshot?.steps.find(
		(step) => step.status === "RUNNING",
	);
	const percent = total > 0 ? Math.round((finished / total) * 100) : 0;
	const elapsedMs = snapshot
		? (snapshot.durationMs ??
			(snapshot.startedAt
				? now - new Date(snapshot.startedAt).getTime()
				: 0))
		: 0;

	return (
		<div className="flex flex-col h-full min-h-0">
			<div className="border-b border-border p-4 pr-12 space-y-1.5 shrink-0">
				{snapshot ? (
					<>
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="font-heading text-base font-medium text-foreground truncate">
								{snapshot.scenarioTitle}
							</h2>
							<RunStatusBadge
								status={
									isCancelling ? "PENDING" : snapshot.status
								}
							/>
							{queueLabel && (
								<Badge variant="secondary">{queueLabel}</Badge>
							)}
							{isCancelling && (
								<span className="text-xs text-muted-foreground">
									Cancelling after current step...
								</span>
							)}
						</div>
						<div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<FolderKanban className="h-3.5 w-3.5 text-primary" />{" "}
								{snapshot.projectName}
							</span>
							<span className="flex items-center gap-1 font-mono truncate max-w-[320px]">
								<Globe className="h-3.5 w-3.5 text-primary shrink-0" />{" "}
								{snapshot.currentUrl}
							</span>
						</div>
					</>
				) : (
					<>
						<h2 className="font-heading text-base font-medium text-foreground">
							Starting run
						</h2>
						<p className="text-sm text-muted-foreground">
							Connecting to the live run...
						</p>
					</>
				)}
			</div>

			{!snapshot ? (
				<div className="flex-1 p-4 space-y-4">
					<Skeleton className="h-3 w-full" />
					<Skeleton className="aspect-video w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			) : (
				<div className="flex-1 min-h-0 flex flex-col">
					<div className="p-4 pb-3 space-y-5 shrink-0">
						{isReconnecting && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-md px-3 py-2">
								<WifiOff className="h-3.5 w-3.5" /> Connection
								lost. Reconnecting...
							</div>
						)}

						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="font-medium text-foreground">
									{isLive
										? runningStep
											? `Step ${runningStep.index + 1} of ${total}`
											: `Starting browser (${total} steps)`
										: `${finished} of ${total} steps completed`}
								</span>
								<span className="flex items-center gap-1 text-muted-foreground font-mono tabular-nums">
									<Timer className="h-3.5 w-3.5" />{" "}
									{formatElapsed(elapsedMs)}
								</span>
							</div>
							<Progress
								value={percent}
								aria-label="Run progress"
							/>
						</div>

						<div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
							<div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card text-[11px] text-muted-foreground">
								<Monitor className="h-3.5 w-3.5 text-primary" />
								<span className="truncate font-mono flex-1">
									{snapshot.pageTitle || snapshot.currentUrl}
								</span>
								{isLive && (
									<span className="flex items-center gap-1 text-primary font-semibold">
										<span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />{" "}
										LIVE
									</span>
								)}
							</div>
							<div className="aspect-video max-h-[30vh] flex items-center justify-center bg-background">
								{snapshot.frame ? (
									// eslint-disable-next-line @next/next/no-img-element -- streamed JPEG data URL
									<img
										src={snapshot.frame}
										alt="Live view of the browser running this scenario"
										className="h-full w-full object-contain"
									/>
								) : isLive ? (
									<div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
										<Loader2 className="h-5 w-5 animate-spin text-primary" />
										Launching browser...
									</div>
								) : (
									<p className="text-xs text-muted-foreground">
										Live view is only available while a run
										is active.
									</p>
								)}
							</div>
						</div>

						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							<RunStat
								label="Passed"
								value={snapshot.passedSteps}
							/>
							<RunStat
								label="Failed"
								value={snapshot.failedSteps}
							/>
							<RunStat
								label="Healed"
								value={
									<span className="inline-flex items-center gap-1">
										<Wrench className="h-3.5 w-3.5 text-muted-foreground" />{" "}
										{snapshot.healedSteps}
									</span>
								}
							/>
							<RunStat label="Total" value={total} />
						</div>

						{snapshot.errorMessage && !isLive && (
							<div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 break-words">
								{snapshot.errorMessage}
							</div>
						)}

					</div>

					<div className="flex-1 min-h-40 flex flex-col px-4 pb-4">
						<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
							Steps
						</h3>
						<ScrollArea className="flex-1 min-h-0 mt-3">
							<div className="pr-3">
								<StepTracker steps={snapshot.steps} />
							</div>
						</ScrollArea>
					</div>
				</div>
			)}

			<div className="border-t border-border p-4 flex items-center justify-end gap-2 shrink-0">
				{isLive ? (
					<Button
						variant="outline"
						size="sm"
						onClick={onCancel}
						disabled={isCancelling}
						className="gap-1.5 cursor-pointer"
					>
						<Square className="h-3.5 w-3.5" />{" "}
						{isCancelling ? "Cancelling..." : "Cancel run"}
					</Button>
				) : (
					snapshot &&
					onRerun && (
						<Button
							variant="outline"
							size="sm"
							onClick={onRerun}
							className="gap-1.5 cursor-pointer"
						>
							<RotateCcw className="h-3.5 w-3.5" /> Run again
						</Button>
					)
				)}
				<Button size="sm" onClick={onClose} className="cursor-pointer">
					{isLive ? "Hide" : "Close"}
				</Button>
			</div>
		</div>
	);
}

interface RunProgressProps {
	/** Run to follow. Pass null when there is none. */
	executionId: string | null;
	/** Visibility. The run keeps being followed while hidden, so onComplete always fires. */
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called once when the run finishes, whether or not the panel is visible. */
	onComplete?: (snapshot: ExecutionRunSnapshot) => void;
	/** Shows a "Run again" button on a finished run. */
	onRerun?: () => void;
	/** Badge for runs that are part of a queue, e.g. "Scenario 2 of 5". */
	queueLabel?: string;
}

/**
 * Right-hand sheet with live progress of a scenario run: progress bar, streamed browser view, counters
 * and a delivery-style step tracker, with cancel and re-run. Needs an ExecutionsProvider above it.
 */
export function RunProgress({
	executionId,
	open,
	onOpenChange,
	onComplete,
	onRerun,
	queueLabel,
}: RunProgressProps) {
	const { snapshot, isReconnecting } = useExecutionRun(
		executionId,
		onComplete,
	);
	const { cancelExecution } = useExecutions();

	// Remember which run is being cancelled so the state never leaks into the next run
	const [cancellingId, setCancellingId] = React.useState<string | null>(null);
	const isLive =
		snapshot?.status === "RUNNING" || snapshot?.status === "PENDING";
	const isCancelling =
		isLive && cancellingId !== null && cancellingId === executionId;

	const handleCancel = async () => {
		if (!executionId) return;
		setCancellingId(executionId);
		const result = await cancelExecution(executionId);
		if (!result.success) {
			setCancellingId(null);
			toast.add({
				title: "Could not cancel",
				description: result.error || "The run could not be cancelled.",
				type: "error",
			});
		}
	};

	const body = (
		<RunProgressBody
			snapshot={snapshot}
			isReconnecting={isReconnecting}
			isCancelling={isCancelling}
			queueLabel={queueLabel}
			onCancel={handleCancel}
			onClose={() => onOpenChange(false)}
			onRerun={onRerun}
		/>
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-3xl gap-0 p-0">
				<SheetTitle className="sr-only">
					Scenario run progress
				</SheetTitle>
				<SheetDescription className="sr-only">
					Live progress, browser view and step results for the running
					scenario.
				</SheetDescription>
				{body}
			</SheetContent>
		</Sheet>
	);
}

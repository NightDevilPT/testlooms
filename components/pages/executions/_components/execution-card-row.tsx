"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FolderKanban,
  Globe,
  Eye,
} from "lucide-react";
import { TestExecutionItem } from "@/components/context/executions-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ExecutionCardRowProps {
  execution: TestExecutionItem;
  onInspect: (execution: TestExecutionItem) => void;
}

export function ExecutionCardRow({ execution, onInspect }: ExecutionCardRowProps) {
  const getStatusBadge = (status: TestExecutionItem["status"]) => {
    switch (status) {
      case "PASSED":
        return (
          <Badge variant="success" className="shrink-0 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Passed
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="shrink-0 font-medium">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Failed
          </Badge>
        );
      case "RUNNING":
        return (
          <Badge variant="info" className="shrink-0 font-medium">
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Running
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="shrink-0 font-medium">
            <Clock className="h-3.5 w-3.5 mr-1" /> Pending
          </Badge>
        );
    }
  };

  const getTriggerBadge = (trigger: TestExecutionItem["triggerType"]) => {
    switch (trigger) {
      case "SCHEDULED":
        return <Badge variant="outline">Scheduled</Badge>;
      case "CI_CD":
        return <Badge variant="info">CI / CD</Badge>;
      default:
        return <Badge variant="secondary">Manual Trigger</Badge>;
    }
  };

  const formatDuration = (ms?: number | null) => {
    if (!ms) return "--";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const title = execution.scenario?.title || execution.workflow?.title || "Test Execution Run";

  return (
    <div className="group rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:border-border/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Icon + Title + Project info */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
            execution.status === "PASSED"
              ? "bg-primary/10 text-primary"
              : execution.status === "FAILED"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          <FileCheck2 className="h-5 w-5" />
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-base truncate">
              {title}
            </span>
            {getStatusBadge(execution.status)}
            {getTriggerBadge(execution.triggerType)}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {execution.project && (
              <Link
                href={`/dashboard/projects/${execution.projectId}`}
                className="flex items-center gap-1 font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                {execution.project.name}
              </Link>
            )}
            {execution.scenario?.relativeRoute && (
              <>
                <span>•</span>
                <span className="font-mono text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3 text-primary" />
                  {execution.scenario.relativeRoute}
                </span>
              </>
            )}
            <span>•</span>
            <span className="font-mono">{formatDuration(execution.durationMs)} duration</span>
          </div>
        </div>
      </div>

      {/* Middle Stats: Step Breakdown */}
      <div className="flex items-center gap-5 text-xs text-muted-foreground shrink-0 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-5">
        <div className="text-center md:text-left space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Step Status</p>
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="text-primary">{execution.passedSteps} passed</span>
            {execution.failedSteps > 0 && (
              <span className="text-destructive">, {execution.failedSteps} failed</span>
            )}
            {execution.healedSteps > 0 && (
              <span className="text-muted-foreground font-mono text-[11px]">({execution.healedSteps} healed)</span>
            )}
          </div>
        </div>

        <div className="text-center md:text-left space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Executed At</p>
          <p className="text-xs text-foreground font-mono">
            {new Date(execution.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Right Action: Inspect Logs */}
      <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-border pt-3 md:pt-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onInspect(execution)}
          className="h-8 text-xs gap-1.5 font-medium border-border hover:bg-accent cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5 text-primary" /> Inspect Step Results
        </Button>
      </div>
    </div>
  );
}

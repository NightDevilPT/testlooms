"use client";

import * as React from "react";
import { FormDialog } from "@/components/shared/form-dialog";
import { TestExecutionItem, useExecutions } from "@/components/context/executions-context";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileCheck2,
  FolderKanban,
  Globe,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface ExecutionDetailDialogProps {
  execution: TestExecutionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExecutionDetailDialog({ execution, open, onOpenChange }: ExecutionDetailDialogProps) {
  const { fetchExecutionById, selectedExecution, isDetailLoading } = useExecutions();

  React.useEffect(() => {
    if (open && execution?.id) {
      fetchExecutionById(execution.id);
    }
  }, [open, execution, fetchExecutionById]);

  const active = selectedExecution || execution;

  if (!active) return null;

  const stepResults = active.stepResults || [];

  const getActionBadgeVariant = (actionType: string): any => {
    const lower = actionType.toLowerCase();
    if (["click", "type", "select", "assert", "scroll", "upload", "keypress"].includes(lower)) {
      return lower;
    }
    return "secondary";
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-primary" />
          <span>Execution Replay Results</span>
        </div>
      }
      description={
        <span>
          Read-only audit telemetry for execution run <code className="font-mono text-xs">{active.id}</code>
        </span>
      }
      maxWidth="3xl"
      cancelLabel="Close Inspection"
      footerActions={
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="px-4 py-2 text-xs font-medium bg-muted hover:bg-accent text-foreground rounded-lg border border-border transition-colors cursor-pointer"
        >
          Close Log Inspection
        </button>
      }
    >
      <div className="space-y-5">
        {/* Execution Summary Panel */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground text-base">
                {active.scenario?.title || active.workflow?.title || "Test Execution"}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                {active.project && (
                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                    <FolderKanban className="h-3.5 w-3.5 text-primary" /> {active.project.name}
                  </span>
                )}
                {active.scenario?.relativeRoute && (
                  <>
                    <span>•</span>
                    <span className="font-mono flex items-center gap-1">
                      <Globe className="h-3 w-3 text-primary" /> {active.scenario.relativeRoute}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {active.status === "PASSED" && (
                <Badge variant="success">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Passed
                </Badge>
              )}
              {active.status === "FAILED" && (
                <Badge variant="destructive">
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Failed
                </Badge>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {active.errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Execution Error Log:
              </p>
              <p className="font-mono text-[11px] leading-relaxed break-words">{active.errorMessage}</p>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-border/60">
            <div>
              <span className="text-muted-foreground">Total Steps:</span>
              <p className="font-semibold text-foreground">{active.totalSteps}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Passed Steps:</span>
              <p className="font-semibold text-primary">{active.passedSteps}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Failed Steps:</span>
              <p className="font-semibold text-destructive">{active.failedSteps}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Duration:</span>
              <p className="font-semibold text-foreground font-mono">
                {active.durationMs ? `${(active.durationMs / 1000).toFixed(2)}s` : "--"}
              </p>
            </div>
          </div>
        </div>

        {/* Step Results List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Step Execution Breakdown ({stepResults.length})
          </h4>

          {isDetailLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading detailed step logs...
            </div>
          ) : stepResults.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              No individual step logs recorded for this execution.
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {stepResults.map((stepRes) => (
                <div
                  key={stepRes.id}
                  className="p-3 rounded-lg border border-border bg-card space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary font-mono">
                        Step #{stepRes.stepOrder}
                      </span>
                      <Badge variant={getActionBadgeVariant(stepRes.actionType)} className="uppercase font-semibold">
                        {stepRes.actionType}
                      </Badge>
                      <span className="text-foreground font-medium">
                        {stepRes.step?.description || stepRes.step?.primaryKey || `Action ${stepRes.actionType}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {stepRes.durationMs && (
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {stepRes.durationMs}ms
                        </span>
                      )}
                      {stepRes.status === "PASSED" ? (
                        <Badge variant="success">Passed</Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </div>
                  </div>

                  {/* Healed Selector Note */}
                  {stepRes.healedSelector && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded border border-border font-mono">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                      Self-healed selector: {stepRes.healedSelector}
                    </div>
                  )}

                  {/* Failure Reason */}
                  {stepRes.failureReason && (
                    <div className="p-2 rounded bg-destructive/10 text-destructive text-[11px] font-mono break-words">
                      Reason: {stepRes.failureReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FormDialog>
  );
}

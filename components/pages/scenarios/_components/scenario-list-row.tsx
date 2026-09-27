"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Globe,
  Tag,
  Play,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TestScenarioWithSteps, ScenarioStatusType } from "@/lib/scenarios-service/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useScenarios } from "@/components/context/scenarios-context";
import { toast } from "@/components/ui/toast";

interface ScenarioListRowProps {
  scenario: TestScenarioWithSteps;
}

export function ScenarioListRow({ scenario }: ScenarioListRowProps) {
  const { runScenario } = useScenarios();
  const [isRunning, setIsRunning] = React.useState(false);
  const [showSteps, setShowSteps] = React.useState(false);
  const [lastRunStatus, setLastRunStatus] = React.useState<"PASSED" | "FAILED" | null>(null);

  const getStatusBadge = (status: ScenarioStatusType) => {
    switch (status) {
      case "READY":
        return (
          <Badge variant="success" className="shrink-0">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge variant="warning" className="shrink-0">
            <Clock className="h-3 w-3 mr-1" /> Draft
          </Badge>
        );
      case "DEPRECATED":
        return (
          <Badge variant="outline" className="shrink-0">
            <AlertTriangle className="h-3 w-3 mr-1" /> Deprecated
          </Badge>
        );
    }
  };

  const getActionBadgeVariant = (actionType: string): any => {
    const lower = actionType.toLowerCase();
    if (["click", "type", "select", "assert", "scroll", "upload", "keypress"].includes(lower)) {
      return lower;
    }
    return "secondary";
  };

  const handleRunTest = async () => {
    setIsRunning(true);
    setLastRunStatus(null);
    try {
      const res = await runScenario(scenario.projectId, scenario.id);
      if (res.success) {
        setLastRunStatus("PASSED");
        toast.add({
          title: "Execution Passed",
          description: `Scenario "${scenario.title}" executed successfully!`,
          type: "success",
        });
      } else {
        setLastRunStatus("FAILED");
        toast.add({
          title: "Execution Failed",
          description: res.error || "Scenario execution encountered errors.",
          type: "error",
        });
      }
    } catch {
      setLastRunStatus("FAILED");
      toast.add({
        title: "Execution Error",
        description: "Failed to trigger scenario execution.",
        type: "error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const stepCount = scenario.steps?.length ?? scenario.stepCount ?? 0;

  return (
    <div className="group rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:border-border/80 transition-all space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title, Status, & Project info */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="h-5 w-5" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/dashboard/projects/${scenario.projectId}/workspace?scenarioId=${scenario.id}`}
                className="font-semibold text-foreground text-base truncate group-hover:text-primary transition-colors cursor-pointer"
              >
                {scenario.title}
              </Link>
              {getStatusBadge(scenario.status)}
              {lastRunStatus === "PASSED" && (
                <Badge variant="success">Passed</Badge>
              )}
              {lastRunStatus === "FAILED" && (
                <Badge variant="destructive">Failed</Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {scenario.project && (
                <span className="flex items-center gap-1 font-medium text-foreground/80">
                  <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                  {scenario.project.name}
                </span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1 font-mono">
                <Globe className="h-3 w-3 text-primary shrink-0" />
                {scenario.relativeRoute || "/"}
              </span>
              {scenario.tags && scenario.tags.length > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                    <Tag className="h-2.5 w-2.5" />
                    {scenario.tags.join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle Stats: Step Count & Read-only Toggle */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-5">
          <button
            type="button"
            onClick={() => setShowSteps(!showSteps)}
            className="text-left space-y-0.5 hover:text-primary transition-colors cursor-pointer"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              Steps {showSteps ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </p>
            <div className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground text-sm">{stepCount}</span>
            </div>
          </button>
        </div>

        {/* Right Actions: Run Test & Studio */}
        <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-border pt-3 md:pt-0">
          <Button
            size="sm"
            variant="default"
            onClick={handleRunTest}
            disabled={isRunning}
            className="h-8 text-xs gap-1.5 font-medium cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running...
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" /> Run Test
              </>
            )}
          </Button>

          <Link
            href={`/dashboard/projects/${scenario.projectId}/workspace?scenarioId=${scenario.id}`}
          >
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 font-medium border-border">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Studio <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Read-Only Collapsible Steps Drawer */}
      {showSteps && scenario.steps && scenario.steps.length > 0 && (
        <div className="pt-2 border-t border-border/60 space-y-1.5 max-h-48 overflow-y-auto p-2.5 rounded-lg bg-muted/40 text-xs">
          {scenario.steps.map((step, idx) => (
            <div
              key={step.id || idx}
              className="flex items-start gap-2 p-1.5 rounded bg-background/80 border border-border/40 font-mono text-[11px]"
            >
              <span className="font-bold text-primary shrink-0">{idx + 1}.</span>
              <Badge variant={getActionBadgeVariant(step.actionType)} className="uppercase shrink-0">
                {step.actionType}
              </Badge>
              <span className="truncate text-foreground/90 font-sans flex-1">
                {step.description || step.primaryKey}
              </span>
              {step.inputConfig?.value && (
                <span className="text-muted-foreground truncate font-mono max-w-[140px]">
                  "{step.inputConfig.value}"
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

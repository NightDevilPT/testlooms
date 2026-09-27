"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TestScenarioWithSteps } from "@/lib/scenarios-service/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Layers,
  Play,
  Trash2,
  Clock,
  Tag,
  CheckCircle2,
  AlertCircle,
  Archive,
} from "lucide-react";

interface ScenarioCardProps {
  projectId: string;
  scenario: TestScenarioWithSteps;
  orderIndex?: number;
  isRunning?: boolean;
  onRunClick?: (scenario: TestScenarioWithSteps) => void;
  onDeleteClick: (scenario: TestScenarioWithSteps) => void;
}

export function ScenarioCard({
  projectId,
  scenario,
  orderIndex,
  isRunning = false,
  onRunClick,
  onDeleteClick,
}: ScenarioCardProps) {
  const router = useRouter();

  const handleOpenWorkspace = () => {
    router.push(`/dashboard/projects/${projectId}/workspace?scenarioId=${scenario.id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "READY":
        return (
          <Badge
            variant="outline"
            className="text-xs gap-1 border-primary/20 text-primary bg-primary/10 font-medium"
          >
            <CheckCircle2 className="h-3 w-3 text-primary" /> Ready
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge
            variant="outline"
            className="text-xs gap-1 border-border text-muted-foreground bg-muted font-medium"
          >
            <AlertCircle className="h-3 w-3 text-muted-foreground" /> Draft
          </Badge>
        );
      case "DEPRECATED":
        return (
          <Badge
            variant="outline"
            className="text-xs gap-1 border-border text-muted-foreground bg-muted/50 font-medium"
          >
            <Archive className="h-3 w-3" /> Deprecated
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs font-medium">
            {status}
          </Badge>
        );
    }
  };

  const formattedDate = new Date(scenario.updatedAt || scenario.createdAt).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Card Header: Order Badge, Title & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              {orderIndex !== undefined && (
                <Badge variant="outline" className="font-mono text-[10px] bg-muted/60 text-muted-foreground border-border shrink-0">
                  Order #{orderIndex}
                </Badge>
              )}
              <h4 className="text-base font-semibold text-foreground truncate" title={scenario.title}>
                {scenario.title}
              </h4>
            </div>
            {scenario.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {scenario.description}
              </p>
            )}
          </div>
          <div className="shrink-0">{getStatusBadge(scenario.status)}</div>
        </div>

        {/* Metadata Badges (Route & Step Count) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60 font-mono truncate max-w-[220px]">
            <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
            {scenario.relativeRoute || "/"}
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg border border-border/40">
            <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {scenario.steps?.length || scenario.stepCount || 0} Steps
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {formattedDate}
          </span>
        </div>

        {/* Tags */}
        {scenario.tags && scenario.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {scenario.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[11px] font-normal px-2 py-0.5 bg-muted/80 text-muted-foreground border-border/50 gap-1"
              >
                <Tag className="h-2.5 w-2.5 text-muted-foreground" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
        <Button
          size="sm"
          disabled={isRunning}
          onClick={() => onRunClick && onRunClick(scenario)}
          className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          title="Run scenario & record DB test execution"
        >
          {isRunning ? (
            <>
              <Clock className="h-3.5 w-3.5 animate-spin" /> Running...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" /> Run Test
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleOpenWorkspace}
          className="h-8 text-xs gap-1.5 font-medium flex-1"
        >
          Studio Workspace
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onDeleteClick(scenario)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border"
          title="Delete Scenario"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

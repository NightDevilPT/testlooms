"use client";

import * as React from "react";
import { useExecutions, TestExecutionItem } from "@/components/context/executions-context";
import { useProjects } from "@/components/context/projects-context";
import { ExecutionCardRow } from "./_components/execution-card-row";
import { ExecutionsSkeleton } from "./_components/executions-skeleton";
import { ExecutionDetailDialog } from "./_components/execution-detail-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileCheck2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FolderKanban,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

export function ExecutionsContent() {
  const {
    executions,
    metrics,
    isLoading,
    error,
    page,
    totalPages,
    totalItems,
    setPage,
    fetchExecutions,
  } = useExecutions();
  const { projects } = useProjects();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [projectIdFilter, setProjectIdFilter] = React.useState<string>("ALL");
  const [triggerFilter, setTriggerFilter] = React.useState<string>("ALL");
  const [inspectingExecution, setInspectingExecution] = React.useState<TestExecutionItem | null>(null);

  // 350ms search debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch executions with backend filtering & pagination
  const loadExecutions = React.useCallback(
    (targetPage: number) => {
      fetchExecutions({
        page: targetPage,
        pageSize: 12,
        search: debouncedSearch || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        projectId: projectIdFilter !== "ALL" ? projectIdFilter : undefined,
        triggerType: triggerFilter !== "ALL" ? triggerFilter : undefined,
      });
    },
    [fetchExecutions, debouncedSearch, statusFilter, projectIdFilter, triggerFilter]
  );

  React.useEffect(() => {
    loadExecutions(page);
  }, [loadExecutions, page]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleProjectChange = (projId: string) => {
    setProjectIdFilter(projId);
    setPage(1);
  };

  const handleTriggerChange = (trigger: string) => {
    setTriggerFilter(trigger);
    setPage(1);
  };

  // Backend Metrics
  const totalExecutionsCount = metrics?.totalExecutions ?? totalItems;
  const passedCount = metrics?.passedCount ?? 0;
  const failedCount = metrics?.failedCount ?? 0;
  const passRate = metrics?.passRate ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Read-Only Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-primary" /> Test Executions & Replay Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only execution monitoring dashboard for automated test runs and step audit telemetry.
          </p>
        </div>
      </div>

      {/* Analytics Metric Cards (Backend Powered) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Executions</p>
            <p className="text-2xl font-bold text-foreground">{totalExecutionsCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Passed Runs</p>
            <p className="text-2xl font-bold text-foreground">{passedCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Failed Runs</p>
            <p className="text-2xl font-bold text-foreground">{failedCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pass Success Rate</p>
            <p className="text-2xl font-bold text-foreground font-mono">
              {passRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
        {/* Search Input with Debounce */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search executions by scenario, project, or error log..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 bg-background border-border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Pills & Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <Button
              size="sm"
              variant={statusFilter === "ALL" ? "default" : "ghost"}
              onClick={() => handleStatusChange("ALL")}
              className="h-7 text-xs font-medium px-2.5 cursor-pointer"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "PASSED" ? "default" : "ghost"}
              onClick={() => handleStatusChange("PASSED")}
              className="h-7 text-xs font-medium px-2.5 gap-1 cursor-pointer"
            >
              Passed ({passedCount})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "FAILED" ? "default" : "ghost"}
              onClick={() => handleStatusChange("FAILED")}
              className="h-7 text-xs font-medium px-2.5 gap-1 text-destructive cursor-pointer"
            >
              Failed ({failedCount})
            </Button>
          </div>

          {/* Project Filter */}
          {projects.length > 0 && (
            <Select value={projectIdFilter} onValueChange={(val) => handleProjectChange(val || "ALL")}>
              <SelectTrigger className="w-[180px] h-9 text-xs bg-background border-border">
                <FolderKanban className="h-3.5 w-3.5 text-primary mr-1" />
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="cursor-pointer text-xs">
                  All Projects
                </SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="cursor-pointer text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Trigger Type Filter */}
          <Select value={triggerFilter} onValueChange={(val) => handleTriggerChange(val || "ALL")}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-background border-border">
              <Zap className="h-3.5 w-3.5 text-primary mr-1" />
              <SelectValue placeholder="All Triggers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="cursor-pointer text-xs">
                All Triggers
              </SelectItem>
              <SelectItem value="MANUAL" className="cursor-pointer text-xs">
                Manual Trigger
              </SelectItem>
              <SelectItem value="SCHEDULED" className="cursor-pointer text-xs">
                Scheduled Cron
              </SelectItem>
              <SelectItem value="CI_CD" className="cursor-pointer text-xs">
                CI / CD Pipeline
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Executions Main Content Area */}
      {isLoading ? (
        <ExecutionsSkeleton />
      ) : executions.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FileCheck2 className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              {debouncedSearch ? "No matching executions found" : "No test executions recorded yet"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? `No execution runs matched your search query "${debouncedSearch}". Try clearing filters or searching for another project.`
                : "Test executions triggered manually or via CI/CD pipelines will automatically display here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {executions.map((execution) => (
              <ExecutionCardRow
                key={execution.id}
                execution={execution}
                onInspect={(e) => setInspectingExecution(e)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Showing Page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalItems} Total Executions)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="gap-1 h-8 text-xs cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="gap-1 h-8 text-xs cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execution Step Results Inspection Modal */}
      <ExecutionDetailDialog
        execution={inspectingExecution}
        open={!!inspectingExecution}
        onOpenChange={(open) => !open && setInspectingExecution(null)}
      />
    </div>
  );
}

export function ExecutionsPageContent() {
  return <ExecutionsContent />;
}

export default ExecutionsPageContent;

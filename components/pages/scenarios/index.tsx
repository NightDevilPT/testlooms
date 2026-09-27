"use client";

import * as React from "react";
import { useScenarios } from "@/components/context/scenarios-context";
import { useProjects } from "@/components/context/projects-context";
import { ScenarioListRow } from "./_components/scenario-list-row";
import { ScenariosSkeleton } from "./_components/scenarios-skeleton";
import { ScenarioStatusType } from "@/lib/scenarios-service/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Layers,
  Search,
  CheckCircle2,
  Clock,
  FolderKanban,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function ScenariosContent() {
  const {
    scenarios,
    metrics,
    isLoading,
    error,
    page,
    totalPages,
    totalItems,
    setPage,
    fetchAllScenarios,
  } = useScenarios();
  const { projects } = useProjects();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | ScenarioStatusType>("ALL");
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("ALL");
  const [sortBy, setSortBy] = React.useState<"updated" | "title" | "steps">("updated");

  // 350ms search debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch scenarios with backend filtering & pagination
  const loadScenarios = React.useCallback(
    (targetPage: number) => {
      fetchAllScenarios({
        page: targetPage,
        pageSize: 12,
        search: debouncedSearch || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        projectId: selectedProjectId !== "ALL" ? selectedProjectId : undefined,
        sortBy,
      });
    },
    [fetchAllScenarios, debouncedSearch, statusFilter, selectedProjectId, sortBy]
  );

  React.useEffect(() => {
    loadScenarios(page);
  }, [loadScenarios, page]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleStatusChange = (status: "ALL" | ScenarioStatusType) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    setPage(1);
  };

  const handleSortChange = (sort: "updated" | "title" | "steps") => {
    setSortBy(sort);
    setPage(1);
  };

  // Backend Metrics
  const totalScenariosCount = metrics?.totalScenarios ?? totalItems;
  const readyCount = metrics?.readyCount ?? 0;
  const draftCount = metrics?.draftCount ?? 0;
  const totalStepsCount = metrics?.totalStepsCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Read-Only Header Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Test Scenarios & Suites
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only overview of recorded Playwright test scenarios with instant one-click test execution.
          </p>
        </div>
      </div>

      {/* Analytics Metric Cards (Backend Powered) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Scenarios</p>
            <p className="text-2xl font-bold text-foreground">{totalScenariosCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Ready (Production)</p>
            <p className="text-2xl font-bold text-foreground">{readyCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Draft Recordings</p>
            <p className="text-2xl font-bold text-foreground">{draftCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Recorded Test Steps</p>
            <p className="text-2xl font-bold text-foreground">{totalStepsCount}</p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sort Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
        {/* Search Bar with Debounce */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scenarios by title, description, or route..."
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
              variant={statusFilter === "READY" ? "default" : "ghost"}
              onClick={() => handleStatusChange("READY")}
              className="h-7 text-xs font-medium px-2.5 gap-1 cursor-pointer"
            >
              Ready
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "DRAFT" ? "default" : "ghost"}
              onClick={() => handleStatusChange("DRAFT")}
              className="h-7 text-xs font-medium px-2.5 gap-1 cursor-pointer"
            >
              Draft
            </Button>
          </div>

          {/* Project Filter */}
          {projects.length > 0 && (
            <Select value={selectedProjectId} onValueChange={(val) => handleProjectChange(val || "ALL")}>
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

          {/* Sort Selector */}
          <Select value={sortBy} onValueChange={(val: any) => handleSortChange(val || "updated")}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-background border-border">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated" className="cursor-pointer text-xs">
                Recently Updated
              </SelectItem>
              <SelectItem value="title" className="cursor-pointer text-xs">
                Title (A-Z)
              </SelectItem>
              <SelectItem value="steps" className="cursor-pointer text-xs">
                Most Steps
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

      {/* Main List Content Area */}
      {isLoading ? (
        <ScenariosSkeleton />
      ) : scenarios.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Layers className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              {debouncedSearch ? "No matching scenarios found" : "No test scenarios available"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? `No scenarios matched your search query "${debouncedSearch}". Try clearing filters or selecting another project.`
                : "Scenarios recorded inside your project workspaces will automatically appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabular List View Only */}
          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <ScenarioListRow key={scenario.id} scenario={scenario} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Showing Page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalItems} Total Scenarios)
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
    </div>
  );
}

export function ScenariosPageContent() {
  return <ScenariosContent />;
}

export default ScenariosPageContent;

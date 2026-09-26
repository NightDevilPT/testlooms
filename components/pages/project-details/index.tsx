"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client/api-client.service";
import {
  ProjectItem,
  EnvironmentProfileItem,
  EnvironmentVariableEntry,
} from "@/lib/projects-service/types";
import { decomposeTimeoutMs } from "@/lib/projects-service/validation";
import { ProjectDetailsSkeleton } from "./_components/project-details-skeleton";
import { EditProjectDialog } from "@/components/pages/projects/_components/edit-project-dialog";
import { DeleteProjectDialog } from "@/components/pages/projects/_components/delete-project-dialog";
import { AddVariableDialog } from "./_components/add-variable-dialog";
import { EditVariableDialog } from "./_components/edit-variable-dialog";
import { DeleteVariableDialog } from "./_components/delete-variable-dialog";
import { FailureEnvelope } from "@/lib/response-service/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Globe,
  Monitor,
  Clock,
  User,
  Building2,
  Pencil,
  Trash2,
  ExternalLink,
  Plus,
  Play,
  Layers,
  FileCheck2,
  Activity,
  SlidersHorizontal,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";

export function ProjectDetailsPageComponent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = React.useState<ProjectItem | null>(null);
  const [envProfiles, setEnvProfiles] = React.useState<EnvironmentProfileItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingProfiles, setIsLoadingProfiles] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Project Settings Dialogs
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Environment Variable Dialogs & States
  const [addVarOpen, setAddVarOpen] = React.useState(false);
  const [editVarOpen, setEditVarOpen] = React.useState(false);
  const [deleteVarOpen, setDeleteVarOpen] = React.useState(false);
  const [targetVariable, setTargetVariable] = React.useState<EnvironmentVariableEntry | null>(null);

  // Secret Visibility Map (key: variable key)
  const [revealedSecrets, setRevealedSecrets] = React.useState<Record<string, boolean>>({});

  // Copy Feedback State Maps
  const [copiedKeyMap, setCopiedKeyMap] = React.useState<Record<string, boolean>>({});
  const [copiedValueMap, setCopiedValueMap] = React.useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = React.useState<"scenarios" | "runs" | "variables">("scenarios");

  const fetchProjectDetails = React.useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ProjectItem>(`/api/projects/${projectId}`);
      if (response.success && response.data) {
        setProject(response.data as ProjectItem);
      } else {
        const failure = response as FailureEnvelope;
        setError(failure.error?.message || "Project not found");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load project details";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchEnvProfiles = React.useCallback(async () => {
    if (!projectId) return;
    setIsLoadingProfiles(true);
    try {
      const response = await apiClient.get<EnvironmentProfileItem[]>(
        `/api/projects/${projectId}/env-profiles`
      );
      if (response.success && Array.isArray(response.data)) {
        setEnvProfiles(response.data as EnvironmentProfileItem[]);
      }
    } catch {
      // Silent error fallback
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    fetchProjectDetails();
    fetchEnvProfiles();
  }, [fetchProjectDetails, fetchEnvProfiles]);

  const toggleSecretVisibility = (varKey: string) => {
    setRevealedSecrets((prev) => ({
      ...prev,
      [varKey]: !prev[varKey],
    }));
  };

  const handleCopyKey = (keyName: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(keyName);
      setCopiedKeyMap((prev) => ({ ...prev, [keyName]: true }));
      setTimeout(() => {
        setCopiedKeyMap((prev) => ({ ...prev, [keyName]: false }));
      }, 2000);
    }
  };

  const handleCopyValue = (keyName: string, val: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopiedValueMap((prev) => ({ ...prev, [keyName]: true }));
      setTimeout(() => {
        setCopiedValueMap((prev) => ({ ...prev, [keyName]: false }));
      }, 2000);
    }
  };

  // Derive the main environment profile and variables array
  const mainProfile = envProfiles.length > 0 ? envProfiles[0] : null;
  const variablesList: EnvironmentVariableEntry[] = React.useMemo(() => {
    if (!mainProfile || !mainProfile.variables) return [];
    if (Array.isArray(mainProfile.variables)) {
      return mainProfile.variables as EnvironmentVariableEntry[];
    }
    if (typeof mainProfile.variables === "object") {
      return Object.entries(mainProfile.variables).map(([k, v]) => ({
        key: k,
        value: String(v),
        isSecret: false,
      }));
    }
    return [];
  }, [mainProfile]);

  if (isLoading) {
    return <ProjectDetailsSkeleton />;
  }

  if (error || !project) {
    return (
      <div className="space-y-4 text-center py-16">
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive max-w-lg mx-auto text-sm">
          {error || "Project not found or accessible."}
        </div>
        <Link href="/dashboard/projects">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const { value: timeoutVal, unit: timeoutUnit } = decomposeTimeoutMs(project.timeoutMs);
  const formattedTimeout = `${timeoutVal}${timeoutUnit === "seconds" ? "s" : "m"}`;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Main Project Header Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>
              <Badge
                variant="outline"
                className="text-xs font-normal border-border bg-muted/50 text-muted-foreground"
              >
                {project.ownershipType === "COMPANY" ? (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-primary" /> Organization
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 text-primary" /> Personal
                  </span>
                )}
              </Badge>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>

          {/* Primary Actions (Create Scenario CTA) */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => {
                router.push(`/dashboard/projects/${project.id}/workspace`);
              }}
              className="gap-2 font-medium"
            >
              <Plus className="h-4 w-4" /> Create Scenario
            </Button>
          </div>
        </div>

        {/* Configuration Summary Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground border-t border-border">
          <span className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/60 text-foreground font-mono">
            <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
            {project.baseUrl}
            <a
              href={project.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-muted-foreground hover:text-primary transition-colors"
              title="Open URL in new tab"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </span>

          <span className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            Viewport: {project.defaultViewportWidth}x{project.defaultViewportHeight}
          </span>

          <span className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Step Wait: {formattedTimeout}
          </span>

          <span className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
            Mode: {project.headless ? "Headless (Background)" : "Headed (Visible UI)"}
          </span>
        </div>
      </div>

      {/* Telemetry Dashboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Test Scenarios</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {project._count?.scenarios || 0}
          </p>
          <p className="text-[11px] text-muted-foreground">Automated browser flows</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Test Workflows</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {project._count?.workflows || 0}
          </p>
          <p className="text-[11px] text-muted-foreground">Chained test suites</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Executions</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {project._count?.executions || 0}
          </p>
          <p className="text-[11px] text-muted-foreground">Runs across environments</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Environment Variables</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {variablesList.length}
          </p>
          <p className="text-[11px] text-muted-foreground">AES encrypted keys & secrets</p>
        </div>
      </div>

      {/* Tabbed Workspace Section */}
      <div className="rounded-xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-3 flex items-center gap-2 bg-muted/30">
          <Button
            size="sm"
            variant={activeTab === "scenarios" ? "default" : "ghost"}
            onClick={() => setActiveTab("scenarios")}
            className="h-8 text-xs gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" /> Scenarios ({project._count?.scenarios || 0})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "runs" ? "default" : "ghost"}
            onClick={() => setActiveTab("runs")}
            className="h-8 text-xs gap-1.5"
          >
            <FileCheck2 className="h-3.5 w-3.5" /> Execution History ({project._count?.executions || 0})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "variables" ? "default" : "ghost"}
            onClick={() => setActiveTab("variables")}
            className="h-8 text-xs gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Environment Variables ({variablesList.length})
          </Button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "scenarios" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Recorded Scenarios</h3>
                  <p className="text-xs text-muted-foreground">
                    Automated Playwright browser recording scripts for {project.name}.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/dashboard/projects/${project.id}/workspace`)}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Record New Scenario
                </Button>
              </div>

              {/* Placeholder Empty Scenarios Card */}
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-background text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Layers className="h-6 w-6" />
                </div>
                <div className="max-w-md space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">No Scenarios Recorded Yet</h4>
                  <p className="text-xs text-muted-foreground">
                    Launch the visual browser recorder to capture click, type, and assertion steps against <code className="font-mono bg-muted px-1 py-0.5 rounded">{project.baseUrl}</code>.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/dashboard/projects/${project.id}/workspace`)}
                  className="gap-1.5 text-xs mt-2"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Open Playwright Studio Recorder
                </Button>
              </div>
            </div>
          )}

          {activeTab === "runs" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Recent Test Runs</h3>
                <p className="text-xs text-muted-foreground">
                  History of manual, scheduled, and CI/CD execution runs for this project.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-background text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <p className="text-xs text-muted-foreground">
                  No execution runs recorded yet. Executions will appear here after triggering test scenarios.
                </p>
              </div>
            </div>
          )}

          {activeTab === "variables" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Environment Variables</h3>
                  <p className="text-xs text-muted-foreground">
                    Manage key-value environment variables with AES-256-GCM encryption & secure variable masking.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAddVarOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Environment Variable
                </Button>
              </div>

              {isLoadingProfiles ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading environment variables...
                </div>
              ) : variablesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-background text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <SlidersHorizontal className="h-6 w-6" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">No Environment Variables Configured</h4>
                    <p className="text-xs text-muted-foreground">
                      Add key-value environment variables (e.g. <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">API_SECRET_KEY</code>) for test executions.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setAddVarOpen(true)}
                    className="gap-1.5 text-xs mt-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Environment Variable
                  </Button>
                </div>
              ) : (
                /* Environment Variables Table */
                <div className="rounded-xl border border-border bg-background overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border font-medium select-none">
                      <tr>
                        <th className="py-3 px-4 w-[30%]">Env Name</th>
                        <th className="py-3 px-4 w-[40%]">Env Value</th>
                        <th className="py-3 px-4 w-[15%]">Secured</th>
                        <th className="py-3 px-4 w-[15%] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {variablesList.map((entry) => {
                        const isRevealed = revealedSecrets[entry.key] || false;
                        const isKeyCopied = copiedKeyMap[entry.key] || false;
                        const isValueCopied = copiedValueMap[entry.key] || false;

                        return (
                          <tr key={entry.key} className="hover:bg-muted/30 transition-colors group">
                            {/* 1. Env Name Column with Copy Button */}
                            <td className="py-3.5 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground truncate max-w-[220px]" title={entry.key}>
                                  {entry.key}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyKey(entry.key)}
                                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                                  title="Copy Variable Key"
                                >
                                  {isKeyCopied ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* 2. Env Value Column with Eye Toggle & Copy Button */}
                            <td className="py-3.5 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                {entry.isSecret ? (
                                  <div className="inline-flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2.5 py-1 rounded border border-border/50 max-w-[280px]">
                                    {isRevealed ? (
                                      <span className="text-foreground truncate">{entry.value || "(empty)"}</span>
                                    ) : (
                                      <span className="tracking-widest font-bold text-[11px]">••••••••</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => toggleSecretVisibility(entry.key)}
                                      className="text-muted-foreground hover:text-foreground p-0.5 shrink-0 transition-colors"
                                      title={isRevealed ? "Hide Secret" : "Reveal Secret"}
                                    >
                                      {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-foreground bg-muted/50 px-2.5 py-1 rounded border border-border/50 max-w-[280px] truncate">
                                    {entry.value || "(empty)"}
                                  </span>
                                )}

                                {/* Copy Value Button */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyValue(entry.key, entry.value)}
                                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                                  title="Copy Value"
                                >
                                  {isValueCopied ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* 3. Secured (Icons) Column */}
                            <td className="py-3.5 px-4 align-middle font-sans">
                              {entry.isSecret ? (
                                <Badge
                                  variant="outline"
                                  className="text-[11px] gap-1 border-amber-500/30 text-amber-600 bg-amber-500/10 dark:text-amber-400 font-medium"
                                >
                                  <Lock className="h-3 w-3" /> Secret
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[11px] gap-1 border-border text-muted-foreground bg-muted/40 font-medium"
                                >
                                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> Plain
                                </Badge>
                              )}
                            </td>

                            {/* 4. Actions Column */}
                            <td className="py-3.5 px-4 align-middle text-right font-sans">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTargetVariable(entry);
                                    setEditVarOpen(true);
                                  }}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Variable"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTargetVariable(entry);
                                    setDeleteVarOpen(true);
                                  }}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Delete Variable"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Project Settings Dialog Modals */}
      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) fetchProjectDetails();
        }}
      />

      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) router.push("/dashboard/projects");
        }}
      />

      {/* Add, Edit, Delete Variable Dialogs */}
      <AddVariableDialog
        projectId={project.id}
        envProfile={mainProfile}
        existingVariables={variablesList}
        open={addVarOpen}
        onOpenChange={setAddVarOpen}
        onSuccess={fetchEnvProfiles}
      />

      <EditVariableDialog
        projectId={project.id}
        envProfile={mainProfile}
        existingVariables={variablesList}
        targetVariable={targetVariable}
        open={editVarOpen}
        onOpenChange={setEditVarOpen}
        onSuccess={fetchEnvProfiles}
      />

      <DeleteVariableDialog
        projectId={project.id}
        envProfile={mainProfile}
        existingVariables={variablesList}
        targetVariable={targetVariable}
        open={deleteVarOpen}
        onOpenChange={setDeleteVarOpen}
        onSuccess={fetchEnvProfiles}
      />
    </div>
  );
}

export default ProjectDetailsPageComponent;

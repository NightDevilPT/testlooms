"use client";

import * as React from "react";
import { ProjectsProvider, useProjects } from "@/components/context/projects-context";
import { ProjectCard } from "./_components/project-card";
import { ProjectsSkeleton } from "./_components/projects-skeleton";
import { CreateProjectDialog } from "./_components/create-project-dialog";
import { EditProjectDialog } from "./_components/edit-project-dialog";
import { DeleteProjectDialog } from "./_components/delete-project-dialog";
import { ProjectItem } from "@/lib/projects-service/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  Plus,
  Search,
  SlidersHorizontal,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Layers,
} from "lucide-react";

function ProjectsContent() {
  const {
    projects,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    ownershipFilter,
    setOwnershipFilter,
    page,
    totalPages,
    totalItems,
    setPage,
  } = useProjects();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<ProjectItem | null>(null);
  const [deletingProject, setDeletingProject] = React.useState<ProjectItem | null>(null);

  return (
    <div className="space-y-6">
      {/* Page Title & Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" /> Projects & Workspaces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage target web application profiles, base execution URLs, and resolution viewports.
          </p>
        </div>

        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Create New Project
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, description, or target URL..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-background border-border"
          />
        </div>

        {/* Ownership Filter Pills */}
        <div className="flex items-center gap-1.5 shrink-0 bg-muted p-1 rounded-lg border border-border">
          <Button
            size="sm"
            variant={ownershipFilter === "ALL" ? "default" : "ghost"}
            onClick={() => {
              setOwnershipFilter("ALL");
              setPage(1);
            }}
            className="h-8 text-xs font-medium"
          >
            All ({totalItems})
          </Button>
          <Button
            size="sm"
            variant={ownershipFilter === "PERSONAL" ? "default" : "ghost"}
            onClick={() => {
              setOwnershipFilter("PERSONAL");
              setPage(1);
            }}
            className="h-8 text-xs font-medium gap-1"
          >
            <User className="h-3.5 w-3.5" /> Personal
          </Button>
          <Button
            size="sm"
            variant={ownershipFilter === "COMPANY" ? "default" : "ghost"}
            onClick={() => {
              setOwnershipFilter("COMPANY");
              setPage(1);
            }}
            className="h-8 text-xs font-medium gap-1"
          >
            <Building2 className="h-3.5 w-3.5" /> Organization
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Main Grid View */}
      {isLoading ? (
        <ProjectsSkeleton />
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FolderPlus className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              {searchQuery ? "No matching projects found" : "No projects configured yet"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? `No projects matched your search query "${searchQuery}". Try clearing filters or searching for another target URL.`
                : "Create your first web testing project to start recording Playwright automation flows."}
            </p>
          </div>
          {!searchQuery && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Your First Project
            </Button>
          )}
        </div>
      ) : (
        /* Grid of Projects */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setEditingProject(p)}
                onDelete={(p) => setDeletingProject(p)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Showing Page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalItems} Total Projects)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="gap-1 h-8 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="gap-1 h-8 text-xs"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditProjectDialog
        project={editingProject}
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
      />

      <DeleteProjectDialog
        project={deletingProject}
        open={!!deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
      />
    </div>
  );
}

export function ProjectsPageContent() {
  return <ProjectsContent />;
}

export default ProjectsPageContent;

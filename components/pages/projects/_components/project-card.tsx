"use client";

import * as React from "react";
import Link from "next/link";
import {
  Globe,
  User,
  Building2,
  Monitor,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Layers,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { ProjectItem } from "@/lib/projects-service/types";
import { decomposeTimeoutMs } from "@/lib/projects-service/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardProps {
  project: ProjectItem;
  onEdit: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const { value: timeoutVal, unit: timeoutUnit } = decomposeTimeoutMs(project.timeoutMs);
  const formattedTimeout = `${timeoutVal}${timeoutUnit === "seconds" ? "s" : "m"}`;

  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="font-semibold text-foreground text-lg truncate group-hover:text-primary transition-colors cursor-pointer"
              >
                {project.name}
              </Link>
              <Badge
                variant="outline"
                className="text-xs shrink-0 font-normal border-border bg-muted/50 text-muted-foreground"
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
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 transition-colors cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = `/dashboard/projects/${project.id}`;
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4 text-primary" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(project)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" /> Edit Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(project)}
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Target Base URL Badge */}
        <div className="flex items-center gap-2 text-xs bg-muted/60 p-2.5 rounded-lg border border-border/60 text-muted-foreground truncate">
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate font-mono">{project.baseUrl}</span>
          <a
            href={project.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto hover:text-primary shrink-0 transition-colors"
            title="Open URL in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Configuration Pills */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            {project.defaultViewportWidth}x{project.defaultViewportHeight}
          </span>
          <span className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {formattedTimeout} step timeout
          </span>
          <span className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
            {project.headless ? "Headless" : "Headed (UI)"}
          </span>
        </div>
      </div>

      {/* Footer Meta Stats & Navigation CTA */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <strong className="text-foreground font-semibold">
              {project._count?.scenarios || 0}
            </strong>{" "}
            Scenarios
          </span>
          <span className="flex items-center gap-1">
            <FileCheck2 className="h-3.5 w-3.5 text-primary" />
            <strong className="text-foreground font-semibold">
              {project._count?.executions || 0}
            </strong>{" "}
            Runs
          </span>
        </div>

        <Link href={`/dashboard/projects/${project.id}`}>
          <Button size="sm" variant="default" className="h-8 text-xs gap-1.5 font-medium">
            Open <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

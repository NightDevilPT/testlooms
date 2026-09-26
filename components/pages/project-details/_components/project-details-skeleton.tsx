"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Banner Skeleton */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-1/3 rounded-md bg-muted" />
            <Skeleton className="h-4 w-1/2 rounded-md bg-muted/60" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-md bg-muted" />
            <Skeleton className="h-9 w-32 rounded-md bg-muted" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Skeleton className="h-6 w-48 rounded-full bg-muted" />
          <Skeleton className="h-6 w-32 rounded-full bg-muted" />
          <Skeleton className="h-6 w-28 rounded-full bg-muted" />
        </div>
      </div>

      {/* Metrics Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md bg-muted" />
              <Skeleton className="h-8 w-8 rounded-lg bg-muted shrink-0" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md bg-muted" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-10 w-64 rounded-lg bg-muted" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg bg-muted/50" />
          ))}
        </div>
      </div>
    </div>
  );
}

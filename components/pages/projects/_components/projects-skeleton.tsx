"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4 rounded-md bg-muted" />
              <Skeleton className="h-4 w-full rounded-md bg-muted/60" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md bg-muted shrink-0" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3 rounded-md bg-muted" />
            <Skeleton className="h-4 w-1/2 rounded-md bg-muted" />
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full bg-muted" />
              <Skeleton className="h-6 w-16 rounded-full bg-muted" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceSkeleton() {
  return (
    <div className="space-y-4 p-6 min-h-screen bg-background">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        <div className="lg:col-span-8 border border-border rounded-xl p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-full w-full rounded-lg min-h-[400px]" />
        </div>

        <div className="lg:col-span-4 border border-border rounded-xl p-4 bg-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>

          <div className="space-y-3 flex-1 overflow-hidden">
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </div>

          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

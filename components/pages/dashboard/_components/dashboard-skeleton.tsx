import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function DashboardSkeleton() {
  return (
    <div className="w-full px-1 space-y-6 animate-in fade-in duration-300">
      {/* Top Header Controls Bar Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Top Row: 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border bg-card shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-2 w-2/3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle Row: Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Execution Bar Chart Skeleton (2 Columns) */}
        <Card className="lg:col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-1.5 w-1/2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </CardHeader>
          <Separator />
          <CardContent className="p-6">
            <div className="h-64 flex items-end justify-between gap-4 pt-6 pb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full px-1">
                    <Skeleton className="w-1/2 rounded-t" style={{ height: `${(i % 3) * 25 + 30}%` }} />
                    <Skeleton className="w-1/2 rounded-t" style={{ height: `${(i % 2) * 20 + 15}%` }} />
                  </div>
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scenario Health Status Donut Chart Skeleton (1 Column) */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-center h-48">
              <Skeleton className="h-36 w-36 rounded-full" />
            </div>
            <div className="space-y-3 pt-2 border-t border-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Test Executions Table Skeleton */}
      <Card className="border-border bg-card w-full shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="space-y-1.5 w-1/3">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardSkeleton;

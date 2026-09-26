"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function AcceptInviteSkeleton() {
  return (
    <Card className="overflow-hidden p-0 border-border bg-card shadow-2xl w-full max-w-4xl mx-auto">
      <CardContent className="grid p-0 md:grid-cols-2">
        <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>
        <div className="hidden md:flex flex-col justify-center items-center p-10 bg-muted/30 border-l border-border space-y-4">
          <Skeleton className="h-24 w-24 rounded-3xl" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

export default AcceptInviteSkeleton;

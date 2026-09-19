"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ColorToggle } from "@/components/shared/color-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background text-foreground p-8 flex flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <ColorToggle />
      </div>

      <div className="flex items-center gap-4">
        <Button>Primary Button</Button>
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm shadow-xs transition-colors">
          bg-primary DIV
        </div>
      </div>
    </main>
  );
}
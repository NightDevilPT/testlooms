"use client";

import * as React from "react";
import { Moon, Sun, Check } from "lucide-react";
import { useTheme } from "@/components/context/theme-context";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon">
            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme mode</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => setMode("light")} className="justify-between">
          Light
          {mode === "light" && <Check className="h-4 w-4 text-primary font-bold" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("dark")} className="justify-between">
          Dark
          {mode === "dark" && <Check className="h-4 w-4 text-primary font-bold" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("system")} className="justify-between">
          System
          {mode === "system" && <Check className="h-4 w-4 text-primary font-bold" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ModeToggle = ThemeToggle;

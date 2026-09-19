"use client";

import * as React from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "@/components/context/theme-context";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ColorToggle() {
  const { color, setColor, availableColors } = useTheme();
  const currentColor = availableColors.find((c) => c.value === color);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="gap-2">
            <span
              className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs shrink-0"
              style={{ backgroundColor: currentColor?.previewBg || "#f97316" }}
            />
            <span className="hidden sm:inline font-medium text-xs">{currentColor?.name || "Theme Color"}</span>
            <Palette className="h-4 w-4 text-muted-foreground ml-0.5" />
            <span className="sr-only">Toggle theme color</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {availableColors.map((c) => (
          <DropdownMenuItem
            key={c.value}
            onClick={() => setColor(c.value)}
            className="justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs"
                style={{ backgroundColor: c.previewBg }}
              />
              {c.name}
            </span>
            {color === c.value && <Check className="h-4 w-4 text-primary font-bold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

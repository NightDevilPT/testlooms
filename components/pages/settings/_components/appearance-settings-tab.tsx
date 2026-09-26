"use client";

import React from "react";
import { useTheme, ThemeMode, ColorTheme } from "@/components/context/theme-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Sun, Moon, Laptop, Check, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/toast";

export function AppearanceSettingsTab() {
  const { mode, setMode, color, setColor, availableColors } = useTheme();

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    const labels: Record<ThemeMode, string> = {
      light: "Light Mode",
      dark: "Dark Mode",
      system: "System Default",
    };
    toast.add({
      title: "Theme Mode Updated",
      description: `Interface mode set to ${labels[newMode]}. Saved to local storage.`,
      type: "info",
    });
  };

  const handleColorChange = (newColor: ColorTheme, colorName: string) => {
    setColor(newColor);
    toast.add({
      title: "Accent Theme Updated",
      description: `Brand accent set to ${colorName}. Saved to local storage.`,
      type: "success",
    });
  };

  const currentColorObj = availableColors.find((c) => c.value === color) || availableColors[0];

  return (
    <div className="w-full space-y-6">
      {/* Real-time Theme Live Preview Banner */}
      <Card className="border border-border bg-card shadow-xs overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Live Theme Preview
            </CardTitle>
            <Badge variant="outline" className="gap-1 text-xs">
              Active: <span className="font-bold text-primary">{currentColorObj.name}</span>
            </Badge>
          </div>
          <CardDescription className="text-xs">
            See how your chosen theme mode and accent color look on real TestLoom components.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
                  TL
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">TestLoom Automation</h4>
                  <p className="text-[10px] text-muted-foreground">Workspace Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="default" size="sm" className="h-8 text-xs gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Primary Action
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Secondary
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-xs">
                Primary Badge
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Secondary Badge
              </Badge>
              <Badge variant="outline" className="text-xs text-primary border-primary">
                Accent Outline
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interface Mode Selection Card */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            Interface Theme Mode
          </CardTitle>
          <CardDescription>
            Select how TestLoom renders interface backgrounds and contrast across light and dark environments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Light Mode Box */}
            <button
              type="button"
              onClick={() => handleModeChange("light")}
              className={`group flex flex-col items-center justify-between p-4 rounded-xl border text-center transition-all cursor-pointer ${
                mode === "light"
                  ? "border-primary bg-primary/10 ring-2 ring-ring shadow-xs"
                  : "border-border bg-background hover:bg-muted/50"
              }`}
            >
              <div className="w-full space-y-2 mb-3">
                <div className="h-16 w-full rounded-lg bg-muted/60 border border-border p-2 flex flex-col justify-between">
                  <div className="h-2 w-12 bg-foreground/20 rounded-xs" />
                  <div className="flex gap-1">
                    <div className="h-2 w-4 bg-primary rounded-xs" />
                    <div className="h-2 w-8 bg-foreground/10 rounded-xs" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-center">
                <div className="flex items-center justify-center gap-1.5 font-semibold text-sm text-foreground">
                  <Sun className="h-4 w-4 text-primary" />
                  Light Mode
                </div>
                <p className="text-xs text-muted-foreground">High-contrast bright interface</p>
              </div>
              {mode === "light" && (
                <Badge variant="default" className="mt-3 gap-1 text-[10px] uppercase font-bold">
                  <Check className="h-3 w-3" /> Active
                </Badge>
              )}
            </button>

            {/* Dark Mode Box */}
            <button
              type="button"
              onClick={() => handleModeChange("dark")}
              className={`group flex flex-col items-center justify-between p-4 rounded-xl border text-center transition-all cursor-pointer ${
                mode === "dark"
                  ? "border-primary bg-primary/10 ring-2 ring-ring shadow-xs"
                  : "border-border bg-background hover:bg-muted/50"
              }`}
            >
              <div className="w-full space-y-2 mb-3">
                <div className="h-16 w-full rounded-lg bg-card border border-border p-2 flex flex-col justify-between">
                  <div className="h-2 w-12 bg-muted-foreground/30 rounded-xs" />
                  <div className="flex gap-1">
                    <div className="h-2 w-4 bg-primary rounded-xs" />
                    <div className="h-2 w-8 bg-muted-foreground/15 rounded-xs" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-center">
                <div className="flex items-center justify-center gap-1.5 font-semibold text-sm text-foreground">
                  <Moon className="h-4 w-4 text-primary" />
                  Dark Mode
                </div>
                <p className="text-xs text-muted-foreground">Sleek, low-light enterprise theme</p>
              </div>
              {mode === "dark" && (
                <Badge variant="default" className="mt-3 gap-1 text-[10px] uppercase font-bold">
                  <Check className="h-3 w-3" /> Active
                </Badge>
              )}
            </button>

            {/* System Mode Box */}
            <button
              type="button"
              onClick={() => handleModeChange("system")}
              className={`group flex flex-col items-center justify-between p-4 rounded-xl border text-center transition-all cursor-pointer ${
                mode === "system"
                  ? "border-primary bg-primary/10 ring-2 ring-ring shadow-xs"
                  : "border-border bg-background hover:bg-muted/50"
              }`}
            >
              <div className="w-full space-y-2 mb-3">
                <div className="h-16 w-full rounded-lg bg-accent/40 border border-border p-2 flex flex-col justify-between">
                  <div className="h-2 w-12 bg-foreground/20 rounded-xs" />
                  <div className="flex gap-1">
                    <div className="h-2 w-4 bg-primary rounded-xs" />
                    <div className="h-2 w-8 bg-foreground/10 rounded-xs" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-center">
                <div className="flex items-center justify-center gap-1.5 font-semibold text-sm text-foreground">
                  <Laptop className="h-4 w-4 text-primary" />
                  System Default
                </div>
                <p className="text-xs text-muted-foreground">Syncs with operating system</p>
              </div>
              {mode === "system" && (
                <Badge variant="default" className="mt-3 gap-1 text-[10px] uppercase font-bold">
                  <Check className="h-3 w-3" /> Active
                </Badge>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Accent Color Palette Card */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Accent Color Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred brand color scheme. Updates buttons, active navigation, indicators, and focus rings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availableColors.map((c) => {
              const isActive = color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleColorChange(c.value, c.name)}
                  className={`group relative flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "border-primary bg-primary/10 ring-2 ring-ring shadow-xs"
                      : "border-border bg-background hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <span
                        className="h-6 w-6 rounded-full border border-border shadow-xs shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: c.previewBg }}
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">{c.value}</p>
                    </div>
                  </div>

                  {isActive ? (
                    <Badge variant="default" className="h-6 px-2 text-[10px] font-bold gap-1">
                      <Check className="h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <div
                      className="h-3 w-3 rounded-full opacity-30 group-hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: c.previewBg }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

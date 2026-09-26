"use client";

import * as React from "react";
import { useProjects } from "@/components/context/projects-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2, Clock, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Monitor } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectItem, PingUrlResult } from "@/lib/projects-service/types";
import { TimeoutUnit, calculateTimeoutMs, decomposeTimeoutMs } from "@/lib/projects-service/validation";

interface EditProjectDialogProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
  const { updateProject, pingUrl } = useProjects();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [viewportWidth, setViewportWidth] = React.useState(1280);
  const [viewportHeight, setViewportHeight] = React.useState(800);
  const [headless, setHeadless] = React.useState(true);

  // Time-based timeout state
  const [timeoutValue, setTimeoutValue] = React.useState(30);
  const [timeoutUnit, setTimeoutUnit] = React.useState<TimeoutUnit>("seconds");

  // Ping test state
  const [isPinging, setIsPinging] = React.useState(false);
  const [pingResult, setPingResult] = React.useState<PingUrlResult | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setBaseUrl(project.baseUrl);
      setViewportWidth(project.defaultViewportWidth);
      setViewportHeight(project.defaultViewportHeight);
      setHeadless(project.headless);

      const { value, unit } = decomposeTimeoutMs(project.timeoutMs);
      setTimeoutValue(value);
      setTimeoutUnit(unit);

      // Pre-mark as verified if unchanged
      setPingResult({
        url: project.baseUrl,
        isReachable: true,
        statusCode: 200,
      });
      setErrorMessage(null);
    }
  }, [project]);

  const handleTestPing = async () => {
    if (!baseUrl || !baseUrl.startsWith("http")) {
      setErrorMessage("Please enter a valid HTTP/HTTPS base URL first");
      return;
    }
    setErrorMessage(null);
    setIsPinging(true);
    const result = await pingUrl(baseUrl);
    setPingResult(result);
    setIsPinging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    if (!name.trim()) {
      setErrorMessage("Project name is required");
      return;
    }
    if (!baseUrl.trim() || !baseUrl.startsWith("http")) {
      setErrorMessage("A valid Base URL (e.g. https://staging.shop.com) is required");
      return;
    }

    // MANDATORY PING CHECK REQUIREMENT
    if (!pingResult || !pingResult.isReachable) {
      setErrorMessage("Target URL ping verification required! Run Ping Test to confirm target server is online.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Form submit button idempotency key generation
    const idempotencyKey = `idempotent-update-proj-${project.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const computedTimeoutMs = calculateTimeoutMs(timeoutValue, timeoutUnit);

    const result = await updateProject(
      project.id,
      {
        name: name.trim(),
        description: description.trim() || undefined,
        baseUrl: baseUrl.trim(),
        defaultViewportWidth: viewportWidth,
        defaultViewportHeight: viewportHeight,
        headless,
        timeoutMs: computedTimeoutMs,
      },
      idempotencyKey
    );

    setIsSubmitting(false);

    if (result.success) {
      onOpenChange(false);
    } else {
      setErrorMessage(result.error || "Failed to update project settings");
    }
  };

  const isPingSuccessful = pingResult?.isReachable === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Edit Project Settings
          </DialogTitle>
          <DialogDescription>
            Update web application URL, screen viewport, and timeout configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4 py-1">
              {errorMessage && (
                <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-project-name">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Base URL & Ping Test */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-project-url">
                    Target Base URL <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant={isPingSuccessful ? "secondary" : "default"}
                    size="sm"
                    onClick={handleTestPing}
                    disabled={isPinging || !baseUrl}
                    className="h-7 text-xs gap-1 font-medium"
                  >
                    {isPinging ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    {isPingSuccessful ? "Ping Passed ✓" : "Run Ping Test *"}
                  </Button>
                </div>
                <Input
                  id="edit-project-url"
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    setPingResult(null); // Reset verification on edit
                  }}
                  required
                />

                {pingResult && (
                  <div
                    className={`p-2.5 rounded-md text-xs border flex items-center justify-between ${
                      pingResult.isReachable
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-destructive/10 border-destructive/20 text-destructive"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {pingResult.isReachable ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {pingResult.isReachable
                        ? `Target online (${pingResult.statusCode || 200} OK)`
                        : `Unreachable: ${pingResult.error || "Connection timed out"}`}
                    </span>
                    {pingResult.responseTimeMs && (
                      <span className="font-mono text-[11px] opacity-80">
                        {pingResult.responseTimeMs}ms
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-project-desc">Description</Label>
                <Textarea
                  id="edit-project-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Time-Based Step Timeout */}
              <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/30">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Step Wait Timeout
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Maximum time allowed per automated Playwright step before error assertion.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label htmlFor="edit-timeout-val" className="text-xs text-muted-foreground">
                      Duration
                    </Label>
                    <Input
                      id="edit-timeout-val"
                      type="number"
                      min={1}
                      max={600}
                      value={timeoutValue}
                      onChange={(e) => setTimeoutValue(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-timeout-unit" className="text-xs text-muted-foreground">
                      Time Unit
                    </Label>
                    <Select
                      value={timeoutUnit}
                      onValueChange={(val) => {
                        if (val) setTimeoutUnit(val as TimeoutUnit);
                      }}
                    >
                      <SelectTrigger id="edit-timeout-unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seconds">Seconds (s)</SelectItem>
                        <SelectItem value="minutes">Minutes (m)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Viewport Width & Height */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-viewport-w" className="text-xs">
                    Viewport Width (px)
                  </Label>
                  <Input
                    id="edit-viewport-w"
                    type="number"
                    value={viewportWidth}
                    onChange={(e) => setViewportWidth(parseInt(e.target.value) || 1280)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-viewport-h" className="text-xs">
                    Viewport Height (px)
                  </Label>
                  <Input
                    id="edit-viewport-h"
                    type="number"
                    value={viewportHeight}
                    onChange={(e) => setViewportHeight(parseInt(e.target.value) || 800)}
                  />
                </div>
              </div>

              {/* Headless Browser Execution Mode */}
              <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border border-border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-headless-mode" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5 text-primary" /> Headless Browser Execution
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Run Playwright test scripts in background headless mode (recommended for CI/CD).
                  </p>
                </div>
                <Checkbox
                  id="edit-headless-mode"
                  checked={headless}
                  onCheckedChange={(checked) => setHeadless(Boolean(checked))}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isPingSuccessful}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

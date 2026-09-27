"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  RotateCcw,
  MousePointerClick,
  Type,
  CheckCircle2,
  Loader2,
  Monitor,
} from "lucide-react";

interface StudioCanvasPlayerProps {
  projectId: string;
  baseUrl: string;
  currentUrl: string;
  pageTitle: string;
  cachedFrame: string | null;
  isRecording: boolean;
  isLoading: boolean;
  viewport?: { width: number; height: number };
  onRefreshState: () => void;
}

export function StudioCanvasPlayer({
  projectId,
  baseUrl,
  currentUrl,
  pageTitle,
  cachedFrame,
  isRecording,
  isLoading,
  viewport = { width: 1280, height: 800 },
  onRefreshState,
}: StudioCanvasPlayerProps) {
  const [urlInput, setUrlInput] = React.useState(currentUrl || baseUrl);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [actionMode, setActionMode] = React.useState<"click" | "type" | "assert">("click");

  // Type & Assert state
  const [targetSelector, setTargetSelector] = React.useState("");
  const [typedValue, setTypedValue] = React.useState("");
  const [assertionType, setAssertionType] = React.useState<"ASSERT_VISIBLE" | "ASSERT_TEXT">("ASSERT_VISIBLE");
  const [expectedText, setExpectedText] = React.useState("");

  const canvasRef = React.useRef<HTMLDivElement>(null);

  const prevUrlRef = React.useRef(currentUrl);
  React.useEffect(() => {
    if (currentUrl && currentUrl !== prevUrlRef.current) {
      prevUrlRef.current = currentUrl;
      setUrlInput(currentUrl);
    }
  }, [currentUrl]);

  // Navigate URL
  const handleNavigate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setIsNavigating(true);
    try {
      await apiClient.post(`/api/projects/${projectId}/recorder`, {
        action: "navigate",
        url: urlInput.trim(),
      });
      onRefreshState();
    } catch {
      // Silent catch
    } finally {
      setIsNavigating(false);
    }
  };

  // Click at Canvas Coords
  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !isRecording) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = (viewport.width || 1280) / rect.width;
    const scaleY = (viewport.height || 800) / rect.height;

    const targetX = Math.round(clickX * scaleX);
    const targetY = Math.round(clickY * scaleY);

    try {
      await apiClient.post(`/api/projects/${projectId}/recorder`, {
        action: "click",
        x: targetX,
        y: targetY,
      });
      onRefreshState();
    } catch {
      // Silent catch
    }
  };

  // Perform Type action directly
  const handlePerformType = async () => {
    if (!targetSelector.trim() || !typedValue.trim()) return;
    try {
      await apiClient.post(`/api/projects/${projectId}/recorder`, {
        action: "type",
        selector: targetSelector.trim(),
        value: typedValue.trim(),
      });
      setTargetSelector("");
      setTypedValue("");
      onRefreshState();
    } catch {
      // Silent catch
    }
  };

  // Perform Assert action directly
  const handlePerformAssert = async () => {
    if (!targetSelector.trim()) return;
    try {
      await apiClient.post(`/api/projects/${projectId}/recorder`, {
        action: "assert",
        selector: targetSelector.trim(),
        assertionType,
        expectedValue: expectedText.trim() || undefined,
      });
      setTargetSelector("");
      setExpectedText("");
      onRefreshState();
    } catch {
      // Silent catch
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col h-full">
      {/* Top Browser Bar */}
      <form
        onSubmit={handleNavigate}
        className="p-3 bg-muted/40 border-b border-border flex items-center gap-2"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefreshState}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Refresh Live Browser View"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        <div className="relative flex-1">
          <Globe className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter URL to test (e.g. https://example.com)..."
            disabled={!isRecording || isNavigating}
            className="h-8 pl-8 pr-20 text-xs font-mono bg-background"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!isRecording || isNavigating}
            className="h-6 text-[10px] px-2.5 absolute right-1 top-1/2 -translate-y-1/2 font-semibold"
          >
            {isNavigating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Navigate"}
          </Button>
        </div>
      </form>

      {/* Mode Bar */}
      <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">Action Mode:</span>
          <Button
            type="button"
            variant={actionMode === "click" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActionMode("click")}
            className="h-7 text-xs gap-1.5"
          >
            <MousePointerClick className="h-3.5 w-3.5" /> Click
          </Button>

          <Button
            type="button"
            variant={actionMode === "type" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActionMode("type")}
            className="h-7 text-xs gap-1.5"
          >
            <Type className="h-3.5 w-3.5" /> Type Text
          </Button>

          <Button
            type="button"
            variant={actionMode === "assert" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActionMode("assert")}
            className="h-7 text-xs gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Assert
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {pageTitle && (
            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[200px]">
              {pageTitle}
            </span>
          )}
          <Badge variant="outline" className="text-[10px] font-mono gap-1">
            <Monitor className="h-3 w-3" /> {viewport.width}x{viewport.height}
          </Badge>
        </div>
      </div>

      {/* Mode Action Inputs */}
      {actionMode === "type" && (
        <div className="p-3 bg-muted/30 border-b border-border flex flex-col sm:flex-row items-center gap-2 text-xs">
          <Input
            value={targetSelector}
            onChange={(e) => setTargetSelector(e.target.value)}
            placeholder="CSS Selector (e.g. #email or input[name='username'])"
            className="h-8 text-xs font-mono bg-background"
          />
          <Input
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder="Text to type..."
            className="h-8 text-xs font-mono bg-background"
          />
          <Button
            type="button"
            size="sm"
            onClick={handlePerformType}
            disabled={!targetSelector.trim() || !typedValue.trim()}
            className="h-8 text-xs shrink-0 font-semibold"
          >
            Record Type Step
          </Button>
        </div>
      )}

      {actionMode === "assert" && (
        <div className="p-3 bg-muted/30 border-b border-border flex flex-col sm:flex-row items-center gap-2 text-xs">
          <Input
            value={targetSelector}
            onChange={(e) => setTargetSelector(e.target.value)}
            placeholder="Target CSS Selector..."
            className="h-8 text-xs font-mono bg-background"
          />
          <select
            value={assertionType}
            onChange={(e) => setAssertionType(e.target.value as "ASSERT_VISIBLE" | "ASSERT_TEXT")}
            className="h-8 text-xs font-mono bg-background rounded-md border border-input px-2"
          >
            <option value="ASSERT_VISIBLE">Element Visible</option>
            <option value="ASSERT_TEXT">Contains Text</option>
          </select>
          {assertionType === "ASSERT_TEXT" && (
            <Input
              value={expectedText}
              onChange={(e) => setExpectedText(e.target.value)}
              placeholder="Expected text substring..."
              className="h-8 text-xs font-mono bg-background"
            />
          )}
          <Button
            type="button"
            size="sm"
            onClick={handlePerformAssert}
            disabled={!targetSelector.trim()}
            className="h-8 text-xs shrink-0 font-semibold"
          >
            Record Assert Step
          </Button>
        </div>
      )}

      {/* Viewport Frame Canvas */}
      <div className="relative flex-1 bg-muted/10 min-h-[420px] flex items-center justify-center p-2 overflow-hidden">
        {!isRecording ? (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Browser Session Not Active</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Click &quot;Start Recording&quot; above to launch the live Playwright browser session and record test steps interactively.
            </p>
          </div>
        ) : cachedFrame ? (
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="relative cursor-crosshair rounded-md overflow-hidden border border-border shadow-md max-w-full max-h-full"
            title="Click anywhere on the preview frame to record a click action"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cachedFrame}
              alt="Live Playwright Browser Stream"
              className="w-full h-auto object-contain select-none"
            />
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-mono">Connecting to Playwright Chromium session...</p>
          </div>
        )}
      </div>
    </div>
  );
}

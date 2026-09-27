"use client";

import * as React from "react";
import { RecordedStep } from "@/lib/scenarios-service/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  MousePointerClick,
  Type,
  ListFilter,
  CheckCircle2,
  Globe,
  ArrowUp,
  ArrowDown,
  Trash2,
  Layers,
  FileUp,
  Key,
  Info,
  Copy,
  Check,
  Code2,
  Hash,
  Compass,
  Crosshair,
  Radio,
  Pencil,
  Save,
} from "lucide-react";
import { cn } from "cn";

interface StepItemCardProps {
  step: RecordedStep;
  index: number;
  totalSteps: number;
  isSelectedForRecording?: boolean;
  onSelectForRecording?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onUpdateStep?: (updated: Partial<RecordedStep>) => void;
}

/**
 * Strips raw DOM element selector strings e.g. " (<main#nd-home-layout > main > section...)" from step descriptions
 */
function cleanDescription(desc?: string): string {
  if (!desc) return "";
  const parenIdx = desc.indexOf(" (");
  if (parenIdx !== -1) {
    const selectorPart = desc.slice(parenIdx);
    if (
      selectorPart.includes(">") ||
      selectorPart.includes("#") ||
      selectorPart.includes(":") ||
      selectorPart.includes(".") ||
      selectorPart.includes("<")
    ) {
      return desc.slice(0, parenIdx).trim();
    }
  }
  return desc.trim();
}

export function StepItemCard({
  step,
  index,
  totalSteps,
  isSelectedForRecording = false,
  onSelectForRecording,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdateStep,
}: StepItemCardProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Edit form local state
  const meta = step.selectorMetadata || {};
  const [editDescription, setEditDescription] = React.useState(step.description || "");
  const [editDefaultSelector, setEditDefaultSelector] = React.useState<"css" | "xpath" | "id" | "dataTestId" | "text">(
    meta.defaultSelector || "css"
  );
  const [editCssSelector, setEditCssSelector] = React.useState(meta.cssSelector || "");
  const [editXpathSelector, setEditXpathSelector] = React.useState(meta.xpathSelector || "");
  const [editElementId, setEditElementId] = React.useState(meta.id || "");
  const [editDataTestId, setEditDataTestId] = React.useState(meta.dataTestId || "");
  const [editTextMatch, setEditTextMatch] = React.useState(meta.text || "");
  const [editInputValue, setEditInputValue] = React.useState(step.inputConfig?.value || "");

  React.useEffect(() => {
    setEditDescription(step.description || "");
    setEditDefaultSelector(step.selectorMetadata?.defaultSelector || "css");
    setEditCssSelector(step.selectorMetadata?.cssSelector || "");
    setEditXpathSelector(step.selectorMetadata?.xpathSelector || "");
    setEditElementId(step.selectorMetadata?.id || "");
    setEditDataTestId(step.selectorMetadata?.dataTestId || "");
    setEditTextMatch(step.selectorMetadata?.text || "");
    setEditInputValue(step.inputConfig?.value || "");
  }, [step]);

  const handleCopy = (text: string, label: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSaveStepEdits = () => {
    if (!onUpdateStep) return;

    onUpdateStep({
      description: editDescription,
      primaryKey: editCssSelector || editXpathSelector || editElementId || step.primaryKey,
      selectorMetadata: {
        ...step.selectorMetadata,
        cssSelector: editCssSelector || undefined,
        xpathSelector: editXpathSelector || undefined,
        id: editElementId || undefined,
        dataTestId: editDataTestId || undefined,
        text: editTextMatch || undefined,
        defaultSelector: editDefaultSelector,
      },
      inputConfig: {
        ...step.inputConfig,
        value: editInputValue || step.inputConfig?.value,
      },
    });

    setIsEditDialogOpen(false);
  };

  const getActionBadge = () => {
    switch (step.actionType) {
      case "CLICK":
        return (
          <Badge variant="click">
            <MousePointerClick /> CLICK
          </Badge>
        );
      case "TYPE":
        return (
          <Badge variant="type">
            <Type /> TYPE
          </Badge>
        );
      case "SELECT":
        return (
          <Badge variant="select">
            <ListFilter /> SELECT
          </Badge>
        );
      case "ASSERT":
        return (
          <Badge variant="assert">
            <CheckCircle2 /> ASSERT
          </Badge>
        );
      case "SCROLL":
        return (
          <Badge variant="scroll">
            <Layers /> SCROLL
          </Badge>
        );
      case "UPLOAD_FILE":
        return (
          <Badge variant="upload">
            <FileUp /> UPLOAD
          </Badge>
        );
      case "KEYPRESS":
        return (
          <Badge variant="keypress">
            <Key /> KEYPRESS
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Globe /> ACTION
          </Badge>
        );
    }
  };

  const hasSelectors = Boolean(
    meta.cssSelector ||
      meta.xpathSelector ||
      meta.dataTestId ||
      meta.id ||
      meta.name ||
      meta.ariaLabel ||
      meta.text
  );

  const displayDescription = cleanDescription(step.description);

  return (
    <div className="relative flex items-center gap-3">
      {/* Stepper Node Circle */}
      <div
        className={cn(
          "relative z-10 h-7 w-7 rounded-full border border-border/80 bg-card text-foreground flex items-center justify-center font-mono text-xs font-semibold shrink-0 shadow-2xs select-none transition-all",
          isSelectedForRecording && "border-primary ring-2 ring-primary/40 bg-primary/10 text-primary font-bold"
        )}
      >
        {index + 1}
      </div>

      {/* Single Row Step Card */}
      <div
        className={cn(
          "flex-1 min-w-0 rounded-2xl border border-border/80 bg-card/80 hover:bg-card px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs transition-all",
          isSelectedForRecording && "border-primary/60 ring-1 ring-primary/20 bg-card"
        )}
      >
        {/* Left: Action Badge & Clean Description Text */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {getActionBadge()}
          <span
            className="font-medium text-foreground text-xs truncate"
            title={displayDescription || `Step ${index + 1}`}
          >
            {displayDescription || `Perform ${step.actionType} action`}
          </span>

          {isSelectedForRecording && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1 font-mono shrink-0 hidden sm:flex">
              <Radio className="h-3 w-3 animate-pulse" /> INSERT AFTER THIS STEP
            </Badge>
          )}
        </div>

        {/* Right: Controls & Edit Action */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Edit Step Button */}
          {onUpdateStep && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Edit step locators & default selector strategy"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Record After Button */}
          {onSelectForRecording && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSelectForRecording}
              className={cn(
                "h-7 text-[11px] gap-1 px-2 rounded-lg transition-colors",
                isSelectedForRecording
                  ? "bg-primary/15 text-primary border border-primary/30 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Record new browser steps starting right after this step"
            >
              <Radio className="h-3 w-3" />
              <span className="hidden md:inline">{isSelectedForRecording ? "Recording Here" : "Record After"}</span>
            </Button>
          )}

          {/* Detailed Path Info Popover Trigger */}
          <Popover>
            <PopoverTrigger>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                title="View recorded step paths & element info"
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>

            <PopoverContent side="left" align="start" className="w-80 md:w-96 p-4 space-y-3.5 shadow-md border-border bg-popover text-popover-foreground">
              <PopoverHeader className="pb-2 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold font-mono flex items-center justify-center">
                      {index + 1}
                    </span>
                    <PopoverTitle className="text-xs font-bold text-foreground">Element Details & Locators</PopoverTitle>
                  </div>
                  {getActionBadge()}
                </div>
              </PopoverHeader>

              <div className="space-y-3 text-xs">
                {/* Default Selector Strategy */}
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                  <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                    <Crosshair className="h-3.5 w-3.5" /> Primary Default Strategy: {meta.defaultSelector ? meta.defaultSelector.toUpperCase() : "CSS"}
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    This strategy is executed first. If element refactoring breaks it, TestLoom self-heals using fallback paths.
                  </p>
                </div>

                {/* Primary Key */}
                {step.primaryKey && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Crosshair className="h-3 w-3 text-primary" /> Primary Target Path
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-muted/50 p-2 rounded-lg border border-border/50 font-mono text-[11px] text-foreground">
                      <code className="break-all">{step.primaryKey}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(step.primaryKey, "primaryKey")}
                        className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                        title="Copy Primary Key"
                      >
                        {copiedKey === "primaryKey" ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* CSS Selector */}
                {meta.cssSelector && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Code2 className="h-3 w-3 text-primary" /> CSS Selector
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-muted/50 p-2 rounded-lg border border-border/50 font-mono text-[11px] text-foreground">
                      <code className="break-all text-foreground">{meta.cssSelector}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(meta.cssSelector!, "cssSelector")}
                        className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                        title="Copy CSS Selector"
                      >
                        {copiedKey === "cssSelector" ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* XPath Selector */}
                {meta.xpathSelector && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Compass className="h-3 w-3 text-primary" /> XPath Selector
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-muted/50 p-2 rounded-lg border border-border/50 font-mono text-[11px] text-foreground">
                      <code className="break-all text-foreground">{meta.xpathSelector}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(meta.xpathSelector!, "xpathSelector")}
                        className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                        title="Copy XPath"
                      >
                        {copiedKey === "xpathSelector" ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Additional Attributes Grid */}
                {hasSelectors && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {meta.dataTestId && (
                      <div className="p-2 rounded bg-muted/30 border border-border/40 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" /> Data Test ID
                        </span>
                        <p className="font-mono text-[11px] text-foreground truncate">{meta.dataTestId}</p>
                      </div>
                    )}
                    {meta.text && (
                      <div className="p-2 rounded bg-muted/30 border border-border/40 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">Element Text</span>
                        <p className="font-sans text-[11px] text-foreground truncate">&quot;{meta.text}&quot;</p>
                      </div>
                    )}
                    {meta.ariaLabel && (
                      <div className="p-2 rounded bg-muted/30 border border-border/40 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">ARIA Label</span>
                        <p className="font-sans text-[11px] text-foreground truncate">{meta.ariaLabel}</p>
                      </div>
                    )}
                    {meta.id && (
                      <div className="p-2 rounded bg-muted/30 border border-border/40 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">Element ID</span>
                        <p className="font-mono text-[11px] text-foreground truncate">#{meta.id}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Input / Assertion Configuration */}
                {step.inputConfig?.value && (
                  <div className="p-2 rounded bg-muted/50 border border-border/50 space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">Recorded Typed Value</span>
                    <p className="font-mono text-xs text-foreground font-medium">&quot;{step.inputConfig.value}&quot;</p>
                  </div>
                )}

                {step.assertionConfig?.expectedValue && (
                  <div className="p-2 rounded bg-muted/50 border border-border/50 space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Expected Assertion ({step.assertionConfig.assertionType || "ASSERT_TEXT"})
                    </span>
                    <p className="font-mono text-xs text-foreground font-medium">&quot;{step.assertionConfig.expectedValue}&quot;</p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Up, Down, Delete Controls */}
          {onMoveUp && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={onMoveUp}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              title="Move step up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}

          {onMoveDown && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === totalSteps - 1}
              onClick={onMoveDown}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              title="Move step down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          )}

          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
              title="Delete step"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Edit Step Locators & Primary Selector Dialog Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md md:max-w-lg p-5">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono flex items-center justify-center">
                {index + 1}
              </span>
              <DialogTitle className="text-base font-bold">Edit Step #{index + 1} Locators & Strategy</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Update element path definitions or select which default locator strategy TestLoom runs first.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-3 -mr-1">
            <div className="space-y-4 py-2 text-xs">
              {/* Step Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Step Description</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. When I click on submit button"
                  className="h-9 text-xs"
                />
              </div>

              {/* Default Selector Strategy Picker */}
              <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Crosshair className="h-4 w-4" /> Default Selector Strategy (Tried First)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Select which selector TestLoom tries first during test replay. If the website changes and this fails, self-healing fallbacks will execute.
                </p>
                <Select
                  value={editDefaultSelector}
                  onValueChange={(val) => {
                    if (val) setEditDefaultSelector(val as "css" | "xpath" | "id" | "dataTestId" | "text");
                  }}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                    <SelectValue placeholder="Select Default Strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="css">CSS Selector (Default Path)</SelectItem>
                    <SelectItem value="xpath">XPath Selector (Tree Path)</SelectItem>
                    <SelectItem value="id">Element ID (#id)</SelectItem>
                    <SelectItem value="dataTestId">Data Test ID (data-testid)</SelectItem>
                    <SelectItem value="text">Element Text Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CSS Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Code2 className="h-3.5 w-3.5 text-primary" /> CSS Selector Path
                </Label>
                <Input
                  value={editCssSelector}
                  onChange={(e) => setEditCssSelector(e.target.value)}
                  placeholder="e.g. button#submit-btn"
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* XPath Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5 text-primary" /> XPath Selector Path
                </Label>
                <Input
                  value={editXpathSelector}
                  onChange={(e) => setEditXpathSelector(e.target.value)}
                  placeholder="e.g. //*[@id='submit-btn']"
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Element ID & Data Test ID */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Element ID</Label>
                  <Input
                    value={editElementId}
                    onChange={(e) => setEditElementId(e.target.value)}
                    placeholder="submit-btn"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3 text-primary" /> Data Test ID
                  </Label>
                  <Input
                    value={editDataTestId}
                    onChange={(e) => setEditDataTestId(e.target.value)}
                    placeholder="submit-button"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Element Text Match */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Visual Text Match</Label>
                <Input
                  value={editTextMatch}
                  onChange={(e) => setEditTextMatch(e.target.value)}
                  placeholder="Submit Form"
                  className="h-9 text-xs"
                />
              </div>

              {/* Input Typed Value (If TYPE step) */}
              {step.actionType === "TYPE" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Typed Value</Label>
                  <Input
                    value={editInputValue}
                    onChange={(e) => setEditInputValue(e.target.value)}
                    placeholder="Input text"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveStepEdits}
              className="text-xs font-semibold gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Step Edits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


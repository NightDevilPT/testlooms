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
import { FormDialog } from "@/components/shared/form-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Sparkles,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "cn";
import { PatternBuilderDialog } from "@/components/shared/pattern-builder-dialog";
import {
  extractEnvKeyFromValue,
  isDynamicValue,
} from "@/lib/utils/pattern-generator";

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
  availableEnvVariables?: Array<{ key: string; value?: string; isSecret?: boolean }>;
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
  availableEnvVariables = [],
}: StepItemCardProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isPatternDialogOpen, setIsPatternDialogOpen] = React.useState(false);
  const [patternTargetField, setPatternTargetField] = React.useState<"input" | "assert">("input");

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
  const [editExpectedValue, setEditExpectedValue] = React.useState(
    step.assertionConfig?.expectedValue || ""
  );

  React.useEffect(() => {
    setEditDescription(step.description || "");
    setEditDefaultSelector(step.selectorMetadata?.defaultSelector || "css");
    setEditCssSelector(step.selectorMetadata?.cssSelector || "");
    setEditXpathSelector(step.selectorMetadata?.xpathSelector || "");
    setEditElementId(step.selectorMetadata?.id || "");
    setEditDataTestId(step.selectorMetadata?.dataTestId || "");
    setEditTextMatch(step.selectorMetadata?.text || "");
    setEditInputValue(step.inputConfig?.value || "");
    setEditExpectedValue(step.assertionConfig?.expectedValue || "");
  }, [step]);

  // Current effective value for TYPE or ASSERT action
  const stepValue =
    step.actionType === "TYPE"
      ? step.inputConfig?.value
      : step.actionType === "ASSERT"
      ? step.assertionConfig?.expectedValue
      : undefined;

  // Extract env key name if value is bound to environment variable (e.g. {{env.API_KEY}} or {{API_KEY}})
  const boundEnvKey = extractEnvKeyFromValue(stepValue);
  const matchedEnv = boundEnvKey
    ? availableEnvVariables.find(
        (ev) => ev.key.toLowerCase() === boundEnvKey.toLowerCase()
      )
    : null;

  // Function to assign an environment variable directly
  const handleAssignEnvKey = (key: string) => {
    const token = `{{env.${key}}}`;
    if (step.actionType === "TYPE") {
      setEditInputValue(token);
      onUpdateStep?.({
        inputConfig: {
          ...step.inputConfig,
          value: token,
        },
      });
    } else if (step.actionType === "ASSERT") {
      setEditExpectedValue(token);
      onUpdateStep?.({
        assertionConfig: {
          ...step.assertionConfig,
          expectedValue: token,
        },
      });
    }
  };

  // Function to unbind / clear env variable binding
  const handleUnbindEnvKey = () => {
    if (step.actionType === "TYPE") {
      setEditInputValue("");
      onUpdateStep?.({
        inputConfig: {
          ...step.inputConfig,
          value: "",
        },
      });
    } else if (step.actionType === "ASSERT") {
      setEditExpectedValue("");
      onUpdateStep?.({
        assertionConfig: {
          ...step.assertionConfig,
          expectedValue: "",
        },
      });
    }
  };

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
        value: editInputValue,
      },
      assertionConfig: step.assertionConfig
        ? {
            ...step.assertionConfig,
            expectedValue: editExpectedValue,
          }
        : undefined,
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

          {/* Prominent ENV WRAPPER if bound to Environment Variable */}
          {(step.actionType === "TYPE" || step.actionType === "ASSERT") && boundEnvKey && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs font-mono font-medium shadow-2xs"
                title={
                  matchedEnv
                    ? `Bound to Environment Variable: ${matchedEnv.key}${
                        matchedEnv.isSecret
                          ? " (Encrypted Secret)"
                          : ` (Value: "${matchedEnv.value}")`
                      }`
                    : `Bound to Environment Variable: ${boundEnvKey} (Not present in current environment profile)`
                }
              >
                <KeyRound className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold">{`{{env.${boundEnvKey}}}`}</span>
                {matchedEnv?.isSecret && (
                  <span className="text-[10px] text-muted-foreground shrink-0" title="Secret variable">
                    🔒
                  </span>
                )}
                {matchedEnv?.value && !matchedEnv.isSecret && (
                  <span className="text-[11px] text-muted-foreground font-sans truncate max-w-[140px] hidden sm:inline">
                    = &quot;{matchedEnv.value}&quot;
                  </span>
                )}
                {matchedEnv?.isSecret && (
                  <span className="text-[11px] text-muted-foreground font-sans hidden sm:inline">
                    = ••••••••
                  </span>
                )}
                {!matchedEnv && (
                  <span className="text-[10px] text-destructive/80 font-sans hidden sm:inline">
                    (unresolved)
                  </span>
                )}
              </div>

              {/* Direct Dropdown to switch or unbind */}
              {onUpdateStep && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                        title="Change or unbind environment variable"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-[200px]">
                    <DropdownMenuGroup>
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground select-none">
                        Environment Variables
                      </div>
                      {availableEnvVariables.map((ev) => (
                        <DropdownMenuItem
                          key={ev.key}
                          onClick={() => handleAssignEnvKey(ev.key)}
                          className={cn(
                            "text-xs font-mono cursor-pointer flex items-center justify-between",
                            ev.key.toLowerCase() === boundEnvKey.toLowerCase() && "font-bold text-primary"
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <KeyRound className="h-3 w-3 text-primary" />
                            {ev.key}
                          </span>
                          {ev.isSecret && <span className="text-[10px]">🔒</span>}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setPatternTargetField(step.actionType === "ASSERT" ? "assert" : "input");
                        setIsPatternDialogOpen(true);
                      }}
                      className="text-xs text-foreground cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3 w-3 text-primary" />
                      Open Pattern Builder...
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleUnbindEnvKey}
                      variant="destructive"
                      className="text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3 w-3" />
                      Unbind Environment Variable
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Dynamic Pattern Badge (if dynamic mask/token but not pure env variable) */}
          {(step.actionType === "TYPE" || step.actionType === "ASSERT") &&
            !boundEnvKey &&
            isDynamicValue(stepValue) && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-chart-2/40 bg-chart-2/10 text-chart-2 text-xs font-mono font-medium"
                  title={`Dynamic Pattern: ${stepValue}`}
                >
                  <Sparkles className="h-3 w-3 text-chart-2 shrink-0" />
                  <span className="truncate max-w-[160px]">{stepValue}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPatternTargetField(step.actionType === "ASSERT" ? "assert" : "input");
                    setIsPatternDialogOpen(true);
                  }}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Configure Pattern"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}

          {/* Static Typed Value with Direct Env Picker Button */}
          {step.actionType === "TYPE" && !boundEnvKey && !isDynamicValue(stepValue) && (
            <div className="flex items-center gap-1.5 shrink-0">
              {step.inputConfig?.value ? (
                <code
                  className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border truncate max-w-[180px] hidden md:inline-block"
                  title={step.inputConfig.value}
                >
                  val: &quot;{step.inputConfig.value}&quot;
                </code>
              ) : null}

              {/* Quick 1-Click Dropdown to Bind Env Variable */}
              {availableEnvVariables.length > 0 && onUpdateStep && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] font-medium gap-1 px-2 border-dashed text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer"
                        title="Bind Environment Variable to this step"
                      >
                        <KeyRound className="h-3 w-3 text-primary" />
                        <span>Bind Env</span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-[200px]">
                    <DropdownMenuGroup>
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground select-none">
                        Available Environment Variables
                      </div>
                      {availableEnvVariables.map((ev) => (
                        <DropdownMenuItem
                          key={ev.key}
                          onClick={() => handleAssignEnvKey(ev.key)}
                          className="text-xs font-mono cursor-pointer flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1.5">
                            <KeyRound className="h-3 w-3 text-primary" />
                            {ev.key}
                          </span>
                          {ev.isSecret && <span className="text-[10px]">🔒</span>}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setPatternTargetField("input");
                        setIsPatternDialogOpen(true);
                      }}
                      className="text-xs text-foreground cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3 w-3 text-primary" />
                      Dynamic Pattern Builder...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Static Assert Value with Direct Env Picker Button */}
          {step.actionType === "ASSERT" && !boundEnvKey && !isDynamicValue(stepValue) && (
            <div className="flex items-center gap-1.5 shrink-0">
              {step.assertionConfig?.expectedValue ? (
                <code
                  className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border truncate max-w-[180px] hidden md:inline-block"
                  title={step.assertionConfig.expectedValue}
                >
                  expect: &quot;{step.assertionConfig.expectedValue}&quot;
                </code>
              ) : null}

              {availableEnvVariables.length > 0 && onUpdateStep && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] font-medium gap-1 px-2 border-dashed text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer"
                        title="Bind Environment Variable to assertion"
                      >
                        <KeyRound className="h-3 w-3 text-primary" />
                        <span>Bind Env</span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-[200px]">
                    <DropdownMenuGroup>
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground select-none">
                        Available Environment Variables
                      </div>
                      {availableEnvVariables.map((ev) => (
                        <DropdownMenuItem
                          key={ev.key}
                          onClick={() => handleAssignEnvKey(ev.key)}
                          className="text-xs font-mono cursor-pointer flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1.5">
                            <KeyRound className="h-3 w-3 text-primary" />
                            {ev.key}
                          </span>
                          {ev.isSecret && <span className="text-[10px]">🔒</span>}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setPatternTargetField("assert");
                        setIsPatternDialogOpen(true);
                      }}
                      className="text-xs text-foreground cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3 w-3 text-primary" />
                      Dynamic Pattern Builder...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {isSelectedForRecording && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1 font-mono shrink-0 hidden sm:flex">
              <Radio className="h-3 w-3 animate-pulse" /> INSERT AFTER THIS STEP
            </Badge>
          )}
        </div>

        {/* Right: Controls & Edit Action */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Dynamic Pattern / Env Var Trigger for TYPE & ASSERT steps */}
          {(step.actionType === "TYPE" || step.actionType === "ASSERT") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPatternTargetField(step.actionType === "ASSERT" ? "assert" : "input");
                setIsPatternDialogOpen(true);
              }}
              className="h-7 w-7 p-0 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
              title="Attach Environment Variable or Dynamic Pattern"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Edit Step Button */}
          {onUpdateStep && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
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
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                  title="View recorded step paths & element info"
                >
                  <Info className="h-4 w-4" />
                </Button>
              }
            />

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

      {/* Edit Step Locators & Primary Selector Dialog Modal using FormDialog */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title={`Edit Step #${index + 1} Locators & Strategy`}
        description="Update element path definitions, default locator strategy, or bind environment variables."
        icon={<Crosshair className="h-5 w-5 text-primary" />}
        maxWidth="lg"
        submitLabel="Save Step Edits"
        cancelLabel="Cancel"
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveStepEdits();
        }}
      >
        <div className="space-y-4 text-xs">
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
            <div className="space-y-2 p-3 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Typed Value</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPatternTargetField("input");
                    setIsPatternDialogOpen(true);
                  }}
                  className="h-6 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 px-2 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Dynamic Pattern Builder
                </Button>
              </div>
              <Input
                value={editInputValue}
                onChange={(e) => setEditInputValue(e.target.value)}
                placeholder="e.g. user_{{timestamp:5}}@test.com or {{env.MY_VAR}}"
                className="h-9 text-xs font-mono"
              />
              
              {/* Quick Attach Available Environment Variables */}
              {availableEnvVariables.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-primary" /> Quick Env Var:
                  </span>
                  {availableEnvVariables.map((ev) => (
                    <button
                      key={ev.key}
                      type="button"
                      onClick={() => {
                        setEditInputValue((prev) =>
                          prev.trim() ? `${prev} {{env.${ev.key}}}` : `{{env.${ev.key}}}`
                        );
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 cursor-pointer flex items-center gap-1"
                      title={`Click to insert {{env.${ev.key}}}`}
                    >
                      <span>+ {ev.key}</span>
                      {ev.isSecret && <span className="text-[9px]">🔒</span>}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Supports character masks like <code className="font-mono text-primary">#####</code> and tokens like <code className="font-mono text-primary">{"{{timestamp:5}}"}</code> or <code className="font-mono text-primary">{"{{env.VARIABLE}}"}</code>.
              </p>
            </div>
          )}

          {/* Expected Value (If ASSERT step) */}
          {step.actionType === "ASSERT" && (
            <div className="space-y-2 p-3 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Expected Assertion Value</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPatternTargetField("assert");
                    setIsPatternDialogOpen(true);
                  }}
                  className="h-6 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 px-2 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Dynamic Pattern Builder
                </Button>
              </div>
              <Input
                value={editExpectedValue}
                onChange={(e) => setEditExpectedValue(e.target.value)}
                placeholder="e.g. Welcome {{env.USER_NAME}}"
                className="h-9 text-xs font-mono"
              />

              {/* Quick Attach Available Environment Variables for ASSERT */}
              {availableEnvVariables.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-primary" /> Quick Env Var:
                  </span>
                  {availableEnvVariables.map((ev) => (
                    <button
                      key={ev.key}
                      type="button"
                      onClick={() => {
                        setEditExpectedValue((prev) =>
                          prev.trim() ? `${prev} {{env.${ev.key}}}` : `{{env.${ev.key}}}`
                        );
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 cursor-pointer flex items-center gap-1"
                      title={`Click to insert {{env.${ev.key}}}`}
                    >
                      <span>+ {ev.key}</span>
                      {ev.isSecret && <span className="text-[9px]">🔒</span>}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Matches exact string or dynamic token values at test execution time.
              </p>
            </div>
          )}
        </div>
      </FormDialog>

      {/* Pattern Builder Dialog */}
      <PatternBuilderDialog
        open={isPatternDialogOpen}
        onOpenChange={setIsPatternDialogOpen}
        initialValue={
          patternTargetField === "input"
            ? editInputValue || step.inputConfig?.value || ""
            : editExpectedValue || step.assertionConfig?.expectedValue || ""
        }
        onApply={(patternValue) => {
          if (patternTargetField === "input") {
            setEditInputValue(patternValue);
            onUpdateStep?.({
              inputConfig: {
                ...step.inputConfig,
                value: patternValue,
              },
            });
          } else {
            setEditExpectedValue(patternValue);
            onUpdateStep?.({
              assertionConfig: {
                ...step.assertionConfig,
                expectedValue: patternValue,
              },
            });
          }
        }}
        availableEnvVariables={availableEnvVariables}
      />
    </div>
  );
}


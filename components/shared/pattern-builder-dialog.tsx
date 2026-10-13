"use client";

import * as React from "react";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  Clock,
  SlidersHorizontal,
  KeyRound,
  CheckCircle2,
  Type,
  Hash,
} from "lucide-react";
import {
  PatternBlock,
  PATTERN_PRESETS,
  resolveDynamicValue,
} from "@/lib/utils/pattern-generator";

interface PatternBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: string;
  onApply: (patternValue: string) => void;
  availableEnvVariables?: Array<{ key: string; value?: string; isSecret?: boolean }>;
}

function parsePatternToBlocks(patternStr: string): PatternBlock[] {
  const clean = patternStr.startsWith("pattern:")
    ? patternStr.substring(8)
    : patternStr;

  const tokenRegex = /(\{\{[^}]+\}\})/g;
  const parts = clean.split(tokenRegex);
  const result: PatternBlock[] = [];

  parts.forEach((part, index) => {
    if (!part) return;
    const id = `b-init-${index}-${Date.now()}`;

    if (part.startsWith("{{") && part.endsWith("}}")) {
      const inner = part.slice(2, -2).trim();
      if (inner.startsWith("date:")) {
        result.push({ id, type: "date", format: inner.substring(5) });
      } else if (inner.startsWith("timestamp:")) {
        const len = parseInt(inner.substring(10), 10);
        result.push({ id, type: "timestamp", length: isNaN(len) ? 4 : len });
      } else if (inner === "epochMs") {
        result.push({ id, type: "timestamp", length: 0 });
      } else if (inner.startsWith("random:")) {
        const len = parseInt(inner.substring(7), 10);
        result.push({ id, type: "randomNumber", length: isNaN(len) ? 4 : len });
      } else if (inner.startsWith("randomAlpha:")) {
        const len = parseInt(inner.substring(12), 10);
        result.push({ id, type: "randomLetters", length: isNaN(len) ? 2 : len });
      } else if (inner.startsWith("env.")) {
        result.push({ id, type: "envVariable", value: inner.substring(4) });
      } else if (inner.startsWith("ENV.")) {
        result.push({ id, type: "envVariable", value: inner.substring(4) });
      } else if (inner.startsWith("env:")) {
        result.push({ id, type: "envVariable", value: inner.substring(4) });
      } else {
        result.push({ id, type: "envVariable", value: inner });
      }
    } else {
      result.push({ id, type: "fixed", value: part });
    }
  });

  return result.length > 0
    ? result
    : [{ id: "b-1", type: "fixed", value: clean }];
}

export function PatternBuilderDialog({
  open,
  onOpenChange,
  initialValue = "",
  onApply,
  availableEnvVariables = [],
}: PatternBuilderDialogProps) {
  const [blocks, setBlocks] = React.useState<PatternBlock[]>([]);
  const [previewSample, setPreviewSample] = React.useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = React.useState<number>(0);
  const [activePresetId, setActivePresetId] = React.useState<string>("custom");

  // Load preset definitions into visual blocks
  const loadPreset = (presetId: string) => {
    switch (presetId) {
      case "pan":
        setBlocks([
          { id: "b-1", type: "randomLetters", length: 5 },
          { id: "b-2", type: "timestamp", length: 4 },
          { id: "b-3", type: "randomLetters", length: 1 },
        ]);
        break;
      case "cin":
        setBlocks([
          { id: "b-1", type: "fixed", value: "U72200DL2024PTC" },
          { id: "b-2", type: "timestamp", length: 6 },
        ]);
        break;
      case "phone_in":
        setBlocks([
          { id: "b-1", type: "fixed", value: "9" },
          { id: "b-2", type: "randomNumber", length: 9 },
        ]);
        break;
      case "email_unique":
        setBlocks([
          { id: "b-1", type: "fixed", value: "qa+" },
          { id: "b-2", type: "timestamp", length: 0 },
          { id: "b-3", type: "fixed", value: "@testloom.io" },
        ]);
        break;
      case "company":
        setBlocks([
          { id: "b-1", type: "fixed", value: "Company_" },
          { id: "b-2", type: "timestamp", length: 4 },
        ]);
        break;
      case "order_id":
        setBlocks([
          { id: "b-1", type: "fixed", value: "ORD-" },
          { id: "b-2", type: "date", format: "YYYY" },
          { id: "b-3", type: "fixed", value: "-" },
          { id: "b-4", type: "randomNumber", length: 6 },
        ]);
        break;
      default:
        break;
    }
  };

  // Initialize blocks when opening dialog
  React.useEffect(() => {
    if (!open) return;

    if (!initialValue || initialValue.trim().length === 0) {
      setBlocks([
        { id: "b-1", type: "fixed", value: "test_" },
        { id: "b-2", type: "timestamp", length: 4 },
      ]);
      setActivePresetId("custom");
      return;
    }

    const cleanPattern = initialValue.startsWith("pattern:")
      ? initialValue.substring(8)
      : initialValue;

    const matchedPreset = PATTERN_PRESETS.find(
      (p) => p.mask === initialValue || p.mask === `pattern:${cleanPattern}`
    );

    if (matchedPreset) {
      setActivePresetId(matchedPreset.id);
      loadPreset(matchedPreset.id);
      return;
    }

    // Parse existing pattern or tokens into blocks
    setActivePresetId("custom");
    setBlocks(parsePatternToBlocks(initialValue));
  }, [open, initialValue]);

  // Construct pattern string from blocks
  const constructPatternString = React.useCallback((): string => {
    if (blocks.length === 0) return "";

    let hasDynamicTokens = false;

    const parts = blocks.map((b) => {
      switch (b.type) {
        case "fixed":
          return b.value || "";
        case "date":
          hasDynamicTokens = true;
          return `{{date:${b.format || "YYYYMMDD"}}}`;
        case "timestamp":
          hasDynamicTokens = true;
          return b.length ? `{{timestamp:${b.length}}}` : "{{epochMs}}";
        case "randomNumber":
          hasDynamicTokens = true;
          return `{{random:${b.length || 4}}}`;
        case "randomLetters":
          hasDynamicTokens = true;
          return `{{randomAlpha:${b.length || 2}}}`;
        case "envVariable":
          return `{{env.${b.value || "VAR"}}}`;
        default:
          return "";
      }
    });

    const fullStr = parts.join("");
    return hasDynamicTokens ? `pattern:${fullStr}` : fullStr;
  }, [blocks]);

  // Re-evaluate live preview when blocks or refreshTrigger changes
  React.useEffect(() => {
    const patternStr = constructPatternString();
    if (!patternStr) {
      setPreviewSample("");
      return;
    }

    const envMap: Record<string, string> = {};
    availableEnvVariables.forEach((ev) => {
      envMap[ev.key] = ev.value || `[${ev.key}]`;
    });

    const sample = resolveDynamicValue(patternStr, envMap);
    setPreviewSample(sample);
  }, [constructPatternString, refreshTrigger, availableEnvVariables]);

  const handleAddBlock = (type: PatternBlock["type"], valueOverride?: string) => {
    const id = `b-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    let newBlock: PatternBlock;

    switch (type) {
      case "fixed":
        newBlock = { id, type: "fixed", value: valueOverride || "" };
        break;
      case "date":
        newBlock = { id, type: "date", format: "YYYYMMDD" };
        break;
      case "timestamp":
        newBlock = { id, type: "timestamp", length: 4 };
        break;
      case "randomNumber":
        newBlock = { id, type: "randomNumber", length: 4 };
        break;
      case "randomLetters":
        newBlock = { id, type: "randomLetters", length: 2 };
        break;
      case "envVariable":
        newBlock = {
          id,
          type: "envVariable",
          value: valueOverride || availableEnvVariables[0]?.key || "API_KEY",
        };
        break;
    }

    setBlocks((prev) => [...prev, newBlock]);
    setActivePresetId("custom");
  };

  const handleUpdateBlock = (id: string, updates: Partial<PatternBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    setActivePresetId("custom");
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setActivePresetId("custom");
  };

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalPattern = constructPatternString();
    onApply(finalPattern);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dynamic Value & Pattern Builder"
      description="Configure dynamic tokens (dates, random sequences, timestamps) or bind environment variables."
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      maxWidth="2xl"
      submitLabel="Apply Value"
      cancelLabel="Cancel"
      submitDisabled={blocks.length === 0}
      onSubmit={handleApply}
    >
      <div className="space-y-4">
        {/* Sleek Top Toolbar: Standard Template Selector (Replaces Bulky Card Grid) */}
        <div className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">Standard Format Template:</span>
          </div>

          <Select
            value={activePresetId}
            onValueChange={(val) => {
              if (!val) return;
              setActivePresetId(val);
              if (val !== "custom") {
                loadPreset(val);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[260px] h-8 text-xs font-medium">
              <SelectValue placeholder="Custom / Freeform Pattern" />
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false} className="min-w-[280px] w-auto">
              <SelectItem value="custom">Custom / Freeform Pattern</SelectItem>
              <SelectItem value="pan">Indian PAN Card (AAAAA9999A)</SelectItem>
              <SelectItem value="cin">Corporate CIN (21-digit)</SelectItem>
              <SelectItem value="phone_in">10-Digit Mobile (9XXXXXXXXX)</SelectItem>
              <SelectItem value="email_unique">Unique Email (qa+timestamp)</SelectItem>
              <SelectItem value="company">Unique Company Name</SelectItem>
              <SelectItem value="order_id">Order ID (ORD-YYYY-XXXXXX)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Project Environment Variables Direct Quick-Insert Bar */}
        {availableEnvVariables.length > 0 ? (
          <div className="p-2.5 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">Insert Env Variable:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {availableEnvVariables.map((ev) => (
                <button
                  key={ev.key}
                  type="button"
                  onClick={() => handleAddBlock("envVariable", ev.key)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-card hover:bg-muted font-mono text-[11px] text-foreground transition-colors cursor-pointer"
                  title={`Click to insert {{${ev.key}}}`}
                >
                  <Plus className="h-3 w-3 text-primary" />
                  <span>{ev.key}</span>
                  {ev.isSecret && (
                    <span className="text-[10px] text-muted-foreground">🔒</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              No active environment profile variables found. Use &quot;+ Env Key&quot; below to bind any manual token like <code className="font-mono text-foreground font-semibold">{"{{KEY}}"}</code>.
            </span>
          </div>
        )}

        {/* Interactive Pattern Blocks Canvas */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5 text-primary" /> Visual Value Blocks ({blocks.length})
            </Label>
            {blocks.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBlocks([]);
                  setActivePresetId("custom");
                }}
                className="h-6 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer px-2"
              >
                Clear All
              </Button>
            )}
          </div>

          {blocks.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-border text-center space-y-2 bg-muted/20">
              <p className="text-xs text-muted-foreground">No blocks added yet.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddBlock("fixed")}
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Initial Block
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-3 shadow-xs"
                >
                  {/* Left: Step Index & Type Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono font-semibold text-muted-foreground w-6 text-center">
                      #{idx + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
                      {block.type === "fixed" && "Text"}
                      {block.type === "date" && "Date"}
                      {block.type === "timestamp" && "Timestamp"}
                      {block.type === "randomNumber" && "Digits"}
                      {block.type === "randomLetters" && "Letters"}
                      {block.type === "envVariable" && "Env Var"}
                    </Badge>
                  </div>

                  {/* Middle: Configuration Field with Uniform Sizing and Unclipped Dropdowns */}
                  <div className="flex-1 min-w-0">
                    {block.type === "fixed" && (
                      <Input
                        placeholder="Fixed text prefix/suffix (e.g. qa+, @domain.com)..."
                        value={block.value || ""}
                        onChange={(e) =>
                          handleUpdateBlock(block.id, { value: e.target.value })
                        }
                        className="h-8 text-xs font-mono w-full"
                      />
                    )}

                    {block.type === "date" && (
                      <Select
                        value={block.format || "YYYYMMDD"}
                        onValueChange={(val) => {
                          if (val) handleUpdateBlock(block.id, { format: val });
                        }}
                      >
                        <SelectTrigger className="w-full min-w-[220px] h-8 text-xs font-mono flex items-center justify-between">
                          <span className="flex items-center gap-1.5 truncate">
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false} className="min-w-[280px] w-auto">
                          <SelectItem value="YYYYMMDD">YYYYMMDD (20261012)</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-10-12)</SelectItem>
                          <SelectItem value="YYYY">YYYY (2026)</SelectItem>
                          <SelectItem value="YYYYMMDD_HHmmss">
                            YYYYMMDD_HHmmss (With Time)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {block.type === "timestamp" && (
                      <Select
                        value={String(block.length ?? 4)}
                        onValueChange={(val) => {
                          if (val) {
                            handleUpdateBlock(block.id, {
                              length: parseInt(val, 10),
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-full min-w-[220px] h-8 text-xs font-mono flex items-center justify-between">
                          <span className="flex items-center gap-1.5 truncate">
                            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                            <SelectValue placeholder="Timestamp Digits" />
                          </span>
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false} className="min-w-[280px] w-auto">
                          <SelectItem value="4">Last 4 Digits (e.g. 8492)</SelectItem>
                          <SelectItem value="6">Last 6 Digits (e.g. 588492)</SelectItem>
                          <SelectItem value="8">Last 8 Digits (e.g. 17295884)</SelectItem>
                          <SelectItem value="0">Full Epoch Milliseconds (13 digits)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {block.type === "randomNumber" && (
                      <Select
                        value={String(block.length || 4)}
                        onValueChange={(val) => {
                          if (val) {
                            handleUpdateBlock(block.id, {
                              length: parseInt(val, 10),
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-full min-w-[220px] h-8 text-xs font-mono flex items-center justify-between">
                          <span className="flex items-center gap-1.5 truncate">
                            <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
                            <SelectValue placeholder="Number Digits" />
                          </span>
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false} className="min-w-[260px] w-auto">
                          <SelectItem value="2">2 Digits (00 – 99)</SelectItem>
                          <SelectItem value="4">4 Digits (0000 – 9999)</SelectItem>
                          <SelectItem value="6">6 Digits (OTP size)</SelectItem>
                          <SelectItem value="9">9 Digits (Mobile suffix)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {block.type === "randomLetters" && (
                      <Select
                        value={String(block.length || 2)}
                        onValueChange={(val) => {
                          if (val) {
                            handleUpdateBlock(block.id, {
                              length: parseInt(val, 10),
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-full min-w-[220px] h-8 text-xs font-mono flex items-center justify-between">
                          <span className="flex items-center gap-1.5 truncate">
                            <Type className="h-3.5 w-3.5 text-primary shrink-0" />
                            <SelectValue placeholder="Letter Count" />
                          </span>
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false} className="min-w-[260px] w-auto">
                          <SelectItem value="1">1 Uppercase Letter (A–Z)</SelectItem>
                          <SelectItem value="2">2 Uppercase Letters (e.g. AB)</SelectItem>
                          <SelectItem value="3">3 Uppercase Letters (e.g. ABC)</SelectItem>
                          <SelectItem value="5">5 Uppercase Letters (Prefix)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {block.type === "envVariable" && (
                      availableEnvVariables.length > 0 ? (
                        <Select
                          value={block.value || availableEnvVariables[0]?.key}
                          onValueChange={(val) => {
                            if (val) handleUpdateBlock(block.id, { value: val });
                          }}
                        >
                          <SelectTrigger className="w-full min-w-[220px] h-8 text-xs font-mono flex items-center justify-between">
                            <span className="flex items-center gap-1.5 truncate">
                              <KeyRound className="h-3.5 w-3.5 text-primary shrink-0" />
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent align="start" alignItemWithTrigger={false} className="min-w-[280px] w-auto">
                            {availableEnvVariables.map((ev) => (
                              <SelectItem key={ev.key} value={ev.key}>
                                <span className="font-mono">{ev.key}</span>
                                {ev.isSecret && (
                                  <span className="text-[11px] text-muted-foreground ml-1.5">
                                    🔒 (Secret)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="VARIABLE_NAME (e.g. API_KEY)..."
                          value={block.value || ""}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, { value: e.target.value })
                          }
                          className="h-8 text-xs font-mono w-full"
                        />
                      )
                    )}
                  </div>

                  {/* Right: Remove Block Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveBlock(block.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                    title="Remove block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Block Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[11px] text-muted-foreground mr-1 font-medium">+ Add Block:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddBlock("fixed")}
              className="h-7 text-xs font-normal gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Fixed Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddBlock("date")}
              className="h-7 text-xs font-normal gap-1 cursor-pointer"
            >
              <Calendar className="h-3 w-3 text-primary" /> Date
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddBlock("timestamp")}
              className="h-7 text-xs font-normal gap-1 cursor-pointer"
            >
              <Clock className="h-3 w-3 text-primary" /> Timestamp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddBlock("randomNumber")}
              className="h-7 text-xs font-normal gap-1 cursor-pointer"
            >
              <Hash className="h-3 w-3 text-primary" /> Digits
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddBlock("randomLetters")}
              className="h-7 text-xs font-normal gap-1 cursor-pointer"
            >
              <Type className="h-3 w-3 text-primary" /> Letters
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAddBlock("envVariable")}
              className="h-7 text-xs font-normal gap-1 cursor-pointer"
            >
              <KeyRound className="h-3 w-3 text-primary" /> Env Key
            </Button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Live Output Preview
            </Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer px-2"
            >
              <RefreshCw className="h-3 w-3" /> Re-roll Sample
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-background border border-border font-mono text-sm text-foreground break-all select-all flex items-center justify-between">
            <span>{previewSample || "(Empty Pattern)"}</span>
            <Badge variant="secondary" className="text-xs font-mono ml-2 shrink-0">
              {previewSample.length} Chars
            </Badge>
          </div>

          <p className="text-[11px] text-muted-foreground font-mono truncate">
            Generated Formula: {constructPatternString() || "--"}
          </p>
        </div>
      </div>
    </FormDialog>
  );
}

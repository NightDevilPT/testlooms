"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { EnvironmentProfileItem, EnvironmentVariableEntry } from "@/lib/projects-service/types";
import { FailureEnvelope } from "@/lib/response-service/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pencil,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

interface EditVariableDialogProps {
  projectId: string;
  envProfile: EnvironmentProfileItem | null;
  existingVariables: EnvironmentVariableEntry[];
  targetVariable: EnvironmentVariableEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditVariableDialog({
  projectId,
  envProfile,
  existingVariables,
  targetVariable,
  open,
  onOpenChange,
  onSuccess,
}: EditVariableDialogProps) {
  const [key, setKey] = React.useState("");
  const [value, setValue] = React.useState("");
  const [isSecret, setIsSecret] = React.useState(false);
  const [showValue, setShowValue] = React.useState(true);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (targetVariable) {
      setKey(targetVariable.key || "");
      const isSec = Boolean(targetVariable.isSecret);
      setIsSecret(isSec);

      if (isSec) {
        // Do not prefill secret values in input field
        setValue("");
        setShowValue(false);
      } else {
        // Prefill plain text environment variables
        setValue(targetVariable.value || "");
        setShowValue(true);
      }
      setErrorMessage(null);
    }
  }, [targetVariable]);

  // Duplicate key check excluding the variable currently being edited
  const duplicateError = React.useMemo(() => {
    if (!targetVariable) return null;
    const trimmedKey = key.trim();
    if (!trimmedKey) return null;
    const originalKey = targetVariable.key.trim().toUpperCase();
    const currentKey = trimmedKey.toUpperCase();

    if (currentKey !== originalKey) {
      const exists = existingVariables.some(
        (v) => v.key.trim().toUpperCase() === currentKey
      );
      if (exists) {
        return `Variable key '${trimmedKey}' already exists in another entry.`;
      }
    }
    return null;
  }, [key, targetVariable, existingVariables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!envProfile || !targetVariable) return;

    const cleanKey = key.trim();
    if (!cleanKey) {
      setErrorMessage("Variable Key is required");
      return;
    }
    if (duplicateError) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = `idempotent-edit-var-${envProfile.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const updatedVariables = existingVariables.map((v) => {
      if (v.key.trim().toUpperCase() === targetVariable.key.trim().toUpperCase()) {
        let finalValue = value;
        // If isSecret is true and value is left empty, retain existing secret value
        if (isSecret && targetVariable.isSecret && value.trim().length === 0) {
          finalValue = targetVariable.value;
        }
        return {
          key: cleanKey,
          value: finalValue,
          isSecret,
        };
      }
      return v;
    });

    try {
      const response = await apiClient.patch<EnvironmentProfileItem>(
        `/api/projects/${projectId}/env-profiles/${envProfile.id}`,
        { variables: updatedVariables },
        { idempotencyKey }
      );

      setIsSubmitting(false);

      if (response.success && response.data) {
        onSuccess();
        onOpenChange(false);
      } else {
        const failure = response as FailureEnvelope;
        setErrorMessage(failure.error?.message || "Failed to update variable");
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : "Network error occurred";
      setErrorMessage(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" /> Edit Environment Variable
          </DialogTitle>
          <DialogDescription>
            Update key, value, and secret protection settings for this environment variable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4 py-1">
              {(errorMessage || duplicateError) && (
                <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{duplicateError || errorMessage}</span>
                </div>
              )}

              {/* Variable Key Input */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-var-key">
                  Variable Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-var-key"
                  placeholder="e.g. API_SECRET_KEY"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  className="font-mono text-xs uppercase"
                  required
                />
              </div>

              {/* Variable Value Input */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-var-value">
                  Variable Value {isSecret && <span className="text-xs text-muted-foreground font-normal">(Leave empty to keep existing secret)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="edit-var-value"
                    type={isSecret && !showValue ? "password" : "text"}
                    placeholder={
                      isSecret
                        ? "•••••••• (leave empty to keep existing secret)"
                        : "e.g. https://api.staging.com"
                    }
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="font-mono text-xs pr-9"
                  />
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() => setShowValue(!showValue)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                      title={showValue ? "Hide Value" : "Show Value"}
                    >
                      {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Secret / Secure Toggle */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={isSecret}
                    onCheckedChange={(checked) => {
                      const isSec = Boolean(checked);
                      setIsSecret(isSec);
                      if (isSec) {
                        if (targetVariable?.isSecret) {
                          setValue("");
                        }
                        setShowValue(false);
                      } else {
                        if (targetVariable && !targetVariable.isSecret) {
                          setValue(targetVariable.value || "");
                        }
                        setShowValue(true);
                      }
                    }}
                  />
                  <span className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                    <Lock className="h-3.5 w-3.5 text-amber-500" /> Secure / Secret Variable
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Encrypt value with AES-256-GCM in database and mask string (`••••••••`) in UI.
                </p>
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
            <Button type="submit" disabled={isSubmitting || Boolean(duplicateError)}>
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

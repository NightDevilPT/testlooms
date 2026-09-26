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
  Plus,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

interface EditEnvProfileDialogProps {
  projectId: string;
  profile: EnvironmentProfileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface VariableRowState extends EnvironmentVariableEntry {
  showValue?: boolean;
}

export function EditEnvProfileDialog({
  projectId,
  profile,
  open,
  onOpenChange,
  onSuccess,
}: EditEnvProfileDialogProps) {
  const [name, setName] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [variables, setVariables] = React.useState<VariableRowState[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setIsDefault(profile.isDefault || false);
      if (Array.isArray(profile.variables) && profile.variables.length > 0) {
        setVariables(
          profile.variables.map((v) => ({
            key: v.key,
            value: v.value,
            isSecret: Boolean(v.isSecret),
            showValue: !v.isSecret,
          }))
        );
      } else {
        setVariables([{ key: "", value: "", isSecret: false, showValue: true }]);
      }
      setErrorMessage(null);
    }
  }, [profile]);

  const handleAddVariable = () => {
    setVariables((prev) => [...prev, { key: "", value: "", isSecret: false, showValue: true }]);
  };

  const handleRemoveVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariableChange = (
    index: number,
    field: keyof VariableRowState,
    val: string | boolean
  ) => {
    setVariables((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const toggleShowValue = (index: number) => {
    setVariables((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], showValue: !next[index].showValue };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!name.trim()) {
      setErrorMessage("Profile name is required");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Form submit button idempotency key generation
    const idempotencyKey = `idempotent-update-env-${profile.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const formattedVariables: EnvironmentVariableEntry[] = variables
      .filter((v) => v.key.trim().length > 0)
      .map((v) => ({
        key: v.key.trim(),
        value: v.value,
        isSecret: Boolean(v.isSecret),
      }));

    try {
      const response = await apiClient.patch<EnvironmentProfileItem>(
        `/api/projects/${projectId}/env-profiles/${profile.id}`,
        {
          name: name.trim(),
          isDefault,
          variables: formattedVariables,
        },
        { idempotencyKey }
      );

      setIsSubmitting(false);

      if (response.success && response.data) {
        onSuccess();
        onOpenChange(false);
      } else {
        const failure = response as FailureEnvelope;
        setErrorMessage(failure.error?.message || "Failed to update environment profile");
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : "Network error occurred";
      setErrorMessage(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" /> Edit Environment Profile
          </DialogTitle>
          <DialogDescription>
            Update target cluster details, variable values, and secret masking settings.
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

              {/* Profile Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-env-profile-name">
                  Profile Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-env-profile-name"
                  placeholder="e.g. Staging Cluster US-East"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Set as Default Checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="edit-is-default-env"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(Boolean(checked))}
                />
                <Label htmlFor="edit-is-default-env" className="text-xs font-medium cursor-pointer">
                  Set as Active Default Environment for test runs
                </Label>
              </div>

              {/* Environment Key-Value Variables */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Environment Variables</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddVariable}
                    className="h-7 text-xs gap-1 text-primary hover:text-primary/90"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Variable
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {variables.map((row, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-muted/20 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        {/* Key Input */}
                        <Input
                          placeholder="KEY (e.g. API_SECRET)"
                          value={row.key}
                          onChange={(e) => handleVariableChange(idx, "key", e.target.value)}
                          className="font-mono text-xs flex-1"
                        />

                        {/* Value Input */}
                        <div className="relative flex-1">
                          <Input
                            type={row.isSecret && !row.showValue ? "password" : "text"}
                            placeholder="Value"
                            value={row.value}
                            onChange={(e) => handleVariableChange(idx, "value", e.target.value)}
                            className="font-mono text-xs pr-8"
                          />
                          {row.isSecret && (
                            <button
                              type="button"
                              onClick={() => toggleShowValue(idx)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                              title={row.showValue ? "Hide Value" : "Show Value"}
                            >
                              {row.showValue ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Remove Action */}
                        {variables.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVariable(idx)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Secret Checkbox Option (Secret Variable) */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                          <Checkbox
                            checked={row.isSecret}
                            onCheckedChange={(checked) => {
                              handleVariableChange(idx, "isSecret", Boolean(checked));
                              if (checked) {
                                handleVariableChange(idx, "showValue", false);
                              }
                            }}
                          />
                          <span className="flex items-center gap-1 font-medium text-[11px]">
                            <Lock className="h-3 w-3 text-amber-500" /> Secure / Secret Variable (Masked UI)
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
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
            <Button type="submit" disabled={isSubmitting}>
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

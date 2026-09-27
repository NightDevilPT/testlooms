"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import { EnvironmentProfileItem, EnvironmentVariableEntry } from "@/lib/projects-service/types";
import { FailureEnvelope } from "@/lib/response-service/types";
import { FormDialog } from "@/components/shared/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import {
  Plus,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

interface AddVariableDialogProps {
  projectId: string;
  envProfile: EnvironmentProfileItem | null;
  existingVariables: EnvironmentVariableEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddVariableDialog({
  projectId,
  envProfile,
  existingVariables,
  open,
  onOpenChange,
  onSuccess,
}: AddVariableDialogProps) {
  const [key, setKey] = React.useState("");
  const [value, setValue] = React.useState("");
  const [isSecret, setIsSecret] = React.useState(false);
  const [showValue, setShowValue] = React.useState(true);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const resetForm = () => {
    setKey("");
    setValue("");
    setIsSecret(false);
    setShowValue(true);
    setErrorMessage(null);
  };

  // Duplicate key check
  const duplicateError = React.useMemo(() => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return null;
    const exists = existingVariables.some(
      (v) => v.key.trim().toUpperCase() === trimmedKey.toUpperCase()
    );
    if (exists) {
      return `Variable key '${trimmedKey}' already exists. Keys must be unique.`;
    }
    return null;
  }, [key, existingVariables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = key.trim();
    if (!cleanKey) {
      setErrorMessage("Variable Key is required");
      return;
    }
    if (duplicateError) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = generateIdempotencyKey("add_variable");

    const newVariable: EnvironmentVariableEntry = {
      key: cleanKey,
      value: value,
      isSecret,
    };

    const updatedVariables: EnvironmentVariableEntry[] = [
      ...existingVariables,
      newVariable,
    ];

    try {
      let response;
      if (envProfile) {
        // Update existing profile
        response = await apiClient.patch<EnvironmentProfileItem>(
          `/api/projects/${projectId}/env-profiles/${envProfile.id}`,
          { variables: updatedVariables },
          { idempotencyKey }
        );
      } else {
        // Create default profile with new variables
        response = await apiClient.post<EnvironmentProfileItem>(
          `/api/projects/${projectId}/env-profiles`,
          {
            name: "Project Environment",
            isDefault: true,
            variables: updatedVariables,
          },
          { idempotencyKey }
        );
      }

      setIsSubmitting(false);

      if (response.success && response.data) {
        toast.add({
          title: "Variable Added",
          description: `Environment variable "${cleanKey}" added successfully.`,
          type: "success",
        });
        resetForm();
        onSuccess();
        onOpenChange(false);
      } else {
        const failure = response as FailureEnvelope;
        const errText = failure.error?.message || "Failed to add environment variable";
        toast.add({
          title: "Error",
          description: errText,
          type: "error",
        });
        setErrorMessage(errText);
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : "Network error occurred";
      toast.add({
        title: "Error",
        description: message,
        type: "error",
      });
      setErrorMessage(message);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Environment Variable"
      description="Add a key-value environment variable to this project with optional AES-256-GCM encryption."
      icon={<Plus className="h-5 w-5 text-primary" />}
      onSubmit={handleSubmit}
      submitLabel="Add Variable"
      isSubmitting={isSubmitting}
      submitDisabled={Boolean(duplicateError)}
      maxWidth="2xl"
    >
      {(errorMessage || duplicateError) && (
        <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{duplicateError || errorMessage}</span>
        </div>
      )}

      {/* Variable Key Input */}
      <div className="space-y-1.5">
        <Label htmlFor="add-var-key">
          Variable Key <span className="text-destructive">*</span>
        </Label>
        <Input
          id="add-var-key"
          placeholder="e.g. API_SECRET_KEY, DATABASE_URL"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          className="font-mono text-xs uppercase"
          required
        />
      </div>

      {/* Variable Value Input */}
      <div className="space-y-1.5">
        <Label htmlFor="add-var-value">Variable Value</Label>
        <div className="relative">
          <Input
            id="add-var-value"
            type={isSecret && !showValue ? "password" : "text"}
            placeholder="e.g. sk_test_51Mz..."
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
              setIsSecret(Boolean(checked));
              if (checked) setShowValue(false);
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
    </FormDialog>
  );
}


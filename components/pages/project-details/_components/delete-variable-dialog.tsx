"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { EnvironmentProfileItem, EnvironmentVariableEntry } from "@/lib/projects-service/types";
import { FailureEnvelope } from "@/lib/response-service/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteVariableDialogProps {
  projectId: string;
  envProfile: EnvironmentProfileItem | null;
  existingVariables: EnvironmentVariableEntry[];
  targetVariable: EnvironmentVariableEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteVariableDialog({
  projectId,
  envProfile,
  existingVariables,
  targetVariable,
  open,
  onOpenChange,
  onSuccess,
}: DeleteVariableDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (!envProfile || !targetVariable) return;
    setIsDeleting(true);
    setErrorMessage(null);

    const updatedVariables = existingVariables.filter(
      (v) => v.key.trim().toUpperCase() !== targetVariable.key.trim().toUpperCase()
    );

    try {
      const response = await apiClient.patch<EnvironmentProfileItem>(
        `/api/projects/${projectId}/env-profiles/${envProfile.id}`,
        { variables: updatedVariables }
      );

      setIsDeleting(false);

      if (response.success) {
        toast.add({
          title: "Variable Deleted",
          description: `Variable "${targetVariable.key}" removed successfully.`,
          type: "success",
        });
        onSuccess();
        onOpenChange(false);
      } else {
        const failure = response as FailureEnvelope;
        const errText = failure.error?.message || "Failed to delete variable";
        toast.add({
          title: "Delete Failed",
          description: errText,
          type: "error",
        });
        setErrorMessage(errText);
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      const message = err instanceof Error ? err.message : "Failed to delete variable";
      toast.add({
        title: "Delete Error",
        description: message,
        type: "error",
      });
      setErrorMessage(message);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Environment Variable"
      description="Are you sure you want to delete this environment variable? Scenarios referencing this key will no longer have access to its value."
      icon={<Trash2 className="h-5 w-5 text-destructive" />}
      confirmLabel="Confirm Delete"
      confirmVariant="destructive"
      isConfirming={isDeleting}
      onConfirm={handleDelete}
    >
      {errorMessage && (
        <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
        <p className="text-xs font-medium text-destructive">Target Variable</p>
        <p className="text-sm font-bold text-foreground font-mono">
          {targetVariable?.key || "Selected Variable"}
        </p>
      </div>
    </ConfirmDialog>
  );
}


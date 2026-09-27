"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { EnvironmentProfileItem } from "@/lib/projects-service/types";
import { FailureEnvelope } from "@/lib/response-service/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteEnvProfileDialogProps {
  projectId: string;
  profile: EnvironmentProfileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteEnvProfileDialog({
  projectId,
  profile,
  open,
  onOpenChange,
  onSuccess,
}: DeleteEnvProfileDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (!profile) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.delete(
        `/api/projects/${projectId}/env-profiles/${profile.id}`
      );
      setIsDeleting(false);

      if (response.success) {
        toast.add({
          title: "Profile Deleted",
          description: `Environment profile "${profile.name}" has been deleted.`,
          type: "success",
        });
        onSuccess();
        onOpenChange(false);
      } else {
        const failure = response as FailureEnvelope;
        const errText = failure.error?.message || "Failed to delete environment profile";
        toast.add({
          title: "Delete Failed",
          description: errText,
          type: "error",
        });
        setErrorMessage(errText);
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      const message =
        err instanceof Error ? err.message : "Failed to delete environment profile";
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
      title="Delete Environment Profile"
      description="Are you sure you want to remove this environment profile? Test runs referencing this profile will revert to default configuration."
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
        <p className="text-xs font-medium text-destructive">Target Profile</p>
        <p className="text-sm font-bold text-foreground">
          {profile?.name || "Selected Profile"}
        </p>
        {profile?.isDefault && (
          <p className="text-xs text-amber-500 font-medium pt-1">
            ⚠️ Warning: This is currently set as the active default environment profile.
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}


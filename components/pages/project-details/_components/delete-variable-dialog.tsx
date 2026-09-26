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
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

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
        onSuccess();
        onOpenChange(false);
      } else {
        const failure = response as FailureEnvelope;
        setErrorMessage(failure.error?.message || "Failed to delete variable");
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      const message = err instanceof Error ? err.message : "Failed to delete variable";
      setErrorMessage(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Delete Environment Variable
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this environment variable? Scenarios referencing this key will no longer have access to its value.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-3">
          <div className="space-y-4 py-2">
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
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
              </>
            ) : (
              "Confirm Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

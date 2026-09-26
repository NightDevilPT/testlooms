"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { EnvironmentProfileItem } from "@/lib/projects-service/types";
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
        onSuccess();
        onOpenChange(false);
      } else {
        const failure = response as FailureEnvelope;
        setErrorMessage(
          failure.error?.message || "Failed to delete environment profile"
        );
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      const message =
        err instanceof Error ? err.message : "Failed to delete environment profile";
      setErrorMessage(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Delete Environment Profile
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this environment profile? Test runs referencing this profile will revert to default configuration.
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

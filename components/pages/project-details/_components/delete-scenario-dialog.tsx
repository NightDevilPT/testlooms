"use client";

import * as React from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { TestScenarioWithSteps } from "@/lib/scenarios-service/types";
import { FailureEnvelope } from "@/lib/response-service/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";

interface DeleteScenarioDialogProps {
  projectId: string;
  scenario: TestScenarioWithSteps | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteScenarioDialog({
  projectId,
  scenario,
  open,
  onOpenChange,
  onSuccess,
}: DeleteScenarioDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  if (!scenario) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await apiClient.delete(
        `/api/projects/${projectId}/scenarios/${scenario.id}`
      );

      if (response.success) {
        toast.add({
          title: "Scenario Deleted",
          description: `Scenario "${scenario.title}" has been deleted.`,
          type: "success",
        });
        onOpenChange(false);
        onSuccess();
      } else {
        const failure = response as FailureEnvelope;
        const errText = failure.error?.message || "Failed to delete scenario.";
        toast.add({
          title: "Delete Failed",
          description: errText,
          type: "error",
        });
        setError(errText);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.add({
        title: "Delete Error",
        description: msg,
        type: "error",
      });
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Scenario"
      description={
        <>
          Are you sure you want to delete <strong className="text-foreground font-semibold">{scenario.title}</strong>? This action will soft-delete the scenario and its {scenario.steps?.length || 0} recorded test steps.
        </>
      }
      icon={<Trash2 className="h-5 w-5 text-destructive" />}
      confirmLabel="Delete Scenario"
      confirmVariant="destructive"
      isConfirming={isDeleting}
      onConfirm={handleDelete}
    >
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}
    </ConfirmDialog>
  );
}


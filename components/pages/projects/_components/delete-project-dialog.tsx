"use client";

import * as React from "react";
import { useProjects } from "@/components/context/projects-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProjectItem } from "@/lib/projects-service/types";
import { toast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";

interface DeleteProjectDialogProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: DeleteProjectDialogProps) {
  const { deleteProject } = useProjects();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!project) return;
    setIsDeleting(true);
    const result = await deleteProject(project.id);
    setIsDeleting(false);
    if (result.success) {
      toast.add({
        title: "Project Deleted",
        description: `Project "${project.name}" has been deleted.`,
        type: "success",
      });
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.add({
        title: "Delete Failed",
        description: result.error || "Failed to delete project.",
        type: "error",
      });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Project"
      description={
        <>
          Are you sure you want to delete{" "}
          <strong className="text-foreground font-semibold">"{project?.name}"</strong>? This will soft-delete the project and archive all attached test scenarios and run history.
        </>
      }
      icon={<Trash2 className="h-5 w-5 text-destructive" />}
      confirmLabel="Yes, Delete Project"
      confirmVariant="destructive"
      isConfirming={isDeleting}
      onConfirm={handleDelete}
    />
  );
}


"use client";

import React from "react";
import { OrganizationMemberResponse } from "@/lib/organizations-service/types";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import apiClient from "@/lib/api-client/api-client.service";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { ShieldAlert } from "lucide-react";

export interface RemoveMemberDialogProps {
  member: OrganizationMemberResponse | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RemoveMemberDialog({ member, onOpenChange, onSuccess }: RemoveMemberDialogProps) {
  const [isRemoving, setIsRemoving] = React.useState(false);

  const handleConfirmRemove = async () => {
    if (!member) return;
    setIsRemoving(true);
    try {
      const idempotencyKey = generateIdempotencyKey("remove_member");
      const response = await apiClient.delete<{ message: string }>(
        `/api/organizations/members/${member.id}`,
        { idempotencyKey }
      );

      setIsRemoving(false);

      if (response.success) {
        onOpenChange(false);
        onSuccess();
        toast.add({
          title: "Member Removed",
          description: `${member.invitedEmail} has been removed from the organization.`,
          type: "success",
        });
      } else {
        const errorMsg = response.success === false ? response.error.message : "Failed to remove member";
        toast.add({
          title: "Removal Failed",
          description: errorMsg,
          type: "error",
        });
      }
    } catch {
      setIsRemoving(false);
      toast.add({
        title: "Error",
        description: "An unexpected error occurred while removing member.",
        type: "error",
      });
    }
  };

  return (
    <ConfirmDialog
      open={!!member}
      onOpenChange={onOpenChange}
      title="Remove Team Member?"
      description={
        <>
          Are you sure you want to remove <strong className="text-foreground font-semibold">{member?.invitedEmail}</strong> from your organization? They will lose access to all company projects and test suites.
        </>
      }
      icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
      confirmLabel="Confirm Remove"
      confirmVariant="destructive"
      isConfirming={isRemoving}
      onConfirm={handleConfirmRemove}
    />
  );
}

export default RemoveMemberDialog;


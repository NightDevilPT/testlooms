"use client";

import React from "react";
import { OrganizationMemberResponse } from "@/lib/organizations-service/types";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import apiClient from "@/lib/api-client/api-client.service";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { ShieldAlert } from "lucide-react";

export interface RemoveMemberDialogProps {
  member: OrganizationMemberResponse | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RemoveMemberDialog({ member, onOpenChange, onSuccess }: RemoveMemberDialogProps) {
  const handleConfirmRemove = async () => {
    if (!member) return;
    try {
      const idempotencyKey = generateIdempotencyKey("remove_member");
      const response = await apiClient.delete<{ message: string }>(
        `/api/organizations/members/${member.id}`,
        { idempotencyKey }
      );

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
      toast.add({
        title: "Error",
        description: "An unexpected error occurred while removing member.",
        type: "error",
      });
    }
  };

  return (
    <AlertDialog open={!!member} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg w-full bg-card border-border shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Remove Team Member?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>{member?.invitedEmail}</strong> from your organization? They will lose access to all company projects and test suites.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Confirm Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RemoveMemberDialog;

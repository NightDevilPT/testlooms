"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import apiClient from "@/lib/api-client/api-client.service";
import { OrganizationMemberResponse } from "@/lib/organizations-service/types";
import { updateMemberRoleSchema, UpdateMemberRoleInput } from "@/lib/organizations-service/validation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Shield, Crown, ShieldCheck, Eye, Loader2 } from "lucide-react";

export interface EditRoleDialogProps {
  member: OrganizationMemberResponse | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditRoleDialog({ member, onOpenChange, onSuccess }: EditRoleDialogProps) {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<UpdateMemberRoleInput>({
    resolver: zodResolver(updateMemberRoleSchema),
  });

  const selectedRole = watch("role");

  useEffect(() => {
    if (member) {
      setValue("role", member.role);
    }
  }, [member, setValue]);

  const onSubmit = async (data: UpdateMemberRoleInput) => {
    if (!member) return;
    try {
      const idempotencyKey = generateIdempotencyKey("update_member_role");
      const response = await apiClient.patch<OrganizationMemberResponse>(
        `/api/organizations/members/${member.id}`,
        data,
        { idempotencyKey }
      );

      if (response.success && response.data && !Array.isArray(response.data)) {
        onOpenChange(false);
        onSuccess();
        toast.add({
          title: "Role Updated",
          description: `Member role updated to ${data.role}.`,
          type: "success",
        });
      } else {
        const errorMsg = response.success === false ? response.error.message : "Failed to update member role";
        toast.add({
          title: "Update Failed",
          description: errorMsg,
          type: "error",
        });
      }
    } catch {
      toast.add({
        title: "Error",
        description: "Failed to update member role.",
        type: "error",
      });
    }
  };

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Update Member Role
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update permission role for <strong>{member?.invitedEmail}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div
              onClick={() => setValue("role", "ADMIN")}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                selectedRole === "ADMIN" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Crown className="h-4 w-4 text-primary shrink-0" />
                  Admin
                </div>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Full Access</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Full access to org & projects.</p>
            </div>

            <div
              onClick={() => setValue("role", "QA_ENGINEER")}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                selectedRole === "QA_ENGINEER" ? "border-secondary bg-secondary/50 ring-1 ring-secondary" : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-foreground shrink-0" />
                  QA Engineer
                </div>
                <Badge variant="outline" className="text-[10px] bg-secondary text-secondary-foreground border-border">Editor</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Create & run test suites.</p>
            </div>

            <div
              onClick={() => setValue("role", "VIEWER")}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                selectedRole === "VIEWER" ? "border-muted-foreground bg-muted/40 ring-1 ring-muted-foreground" : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                  Viewer
                </div>
                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">Read Only</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Read-only view access.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditRoleDialog;

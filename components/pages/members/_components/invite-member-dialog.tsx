"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import apiClient from "@/lib/api-client/api-client.service";
import { OrganizationMemberResponse } from "@/lib/organizations-service/types";
import { inviteMemberSchema, InviteMemberInput } from "@/lib/organizations-service/validation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { UserPlus, Crown, ShieldCheck, Eye, Mail, Loader2 } from "lucide-react";

export interface InviteMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName?: string;
  onSuccess: () => void;
}

export function InviteMemberDialog({
  isOpen,
  onOpenChange,
  organizationName,
  onSuccess,
}: InviteMemberDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "QA_ENGINEER",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: InviteMemberInput) => {
    try {
      const idempotencyKey = generateIdempotencyKey("invite_member");
      const response = await apiClient.post<OrganizationMemberResponse>(
        "/api/organizations/members",
        data,
        { idempotencyKey }
      );

      if (response.success && response.data && !Array.isArray(response.data)) {
        onOpenChange(false);
        reset();
        onSuccess();
        toast.add({
          title: "Invitation Sent",
          description: `An email invite has been sent to ${data.email}.`,
          type: "success",
        });
      } else {
        const errorMsg = response.success === false ? response.error.message : "Failed to send invitation";
        toast.add({
          title: "Invitation Error",
          description: errorMsg,
          type: "error",
        });
      }
    } catch {
      toast.add({
        title: "Error",
        description: "An unexpected error occurred while sending invite.",
        type: "error",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Send an email invitation link to add a teammate to <strong>{organizationName || "your organization"}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="firstName">First Name</FieldLabel>
              <Input
                id="firstName"
                type="text"
                placeholder="Jane"
                {...register("firstName")}
                disabled={isSubmitting}
                autoFocus
              />
              <FieldError errors={[{ message: errors.firstName?.message }]} />
            </Field>

            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                {...register("lastName")}
                disabled={isSubmitting}
              />
              <FieldError errors={[{ message: errors.lastName?.message }]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              {...register("email")}
              disabled={isSubmitting}
            />
            <FieldError errors={[{ message: errors.email?.message }]} />
          </Field>

          <Field>
            <FieldLabel>Permission Role</FieldLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* ADMIN Card */}
              <div
                onClick={() => setValue("role", "ADMIN")}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  selectedRole === "ADMIN"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Crown className="h-4 w-4 text-primary shrink-0" />
                    Admin
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Full Access</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Manage organization settings, members, billing, and projects.
                </p>
              </div>

              {/* QA_ENGINEER Card */}
              <div
                onClick={() => setValue("role", "QA_ENGINEER")}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  selectedRole === "QA_ENGINEER"
                    ? "border-secondary bg-secondary/50 ring-1 ring-secondary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-foreground shrink-0" />
                    QA Engineer
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-secondary text-secondary-foreground border-border">Editor</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Record, create, edit, and execute test scenarios & workflows.
                </p>
              </div>

              {/* VIEWER Card */}
              <div
                onClick={() => setValue("role", "VIEWER")}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  selectedRole === "VIEWER"
                    ? "border-muted-foreground bg-muted/40 ring-1 ring-muted-foreground"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                    Viewer
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">Read Only</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  View test scenarios, test executions, and test reports.
                </p>
              </div>
            </div>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" /> Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default InviteMemberDialog;

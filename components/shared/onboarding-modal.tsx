"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/context/auth-context";
import { SetupWorkspaceInput } from "@/lib/auth-service/validation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  User,
  Building2,
  Bug,
  Check,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function OnboardingModal() {
  const { user, isAuthenticated, isLoading, setupWorkspace } = useAuth();
  const [selectedType, setSelectedType] = useState<"PERSONAL" | "ORGANIZATION">("PERSONAL");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show modal ONLY when user is logged in AND has not completed onboarding
  const showModal =
    !isLoading &&
    isAuthenticated &&
    Boolean(user) &&
    (user?.hasCompletedOnboarding === false || user?.accountType === "PENDING");

  if (!showModal) {
    return null;
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgName(val);

    // Auto-generate URL slug from org name
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setOrgSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let payload: SetupWorkspaceInput;

    if (selectedType === "PERSONAL") {
      payload = { accountType: "PERSONAL" };
    } else {
      if (!orgName.trim() || orgName.trim().length < 2) {
        setFormError("Organization name must be at least 2 characters.");
        return;
      }
      if (!orgSlug.trim() || !/^[a-z0-9-]+$/.test(orgSlug.trim())) {
        setFormError("Organization slug can only contain lowercase letters, numbers, and hyphens.");
        return;
      }

      payload = {
        accountType: "ORGANIZATION",
        organization: {
          name: orgName.trim(),
          slug: orgSlug.trim(),
        },
      };
    }

    setIsSubmitting(true);
    try {
      const result = await setupWorkspace(payload);
      if (!result.success && result.error) {
        setFormError(result.error);
      }
    } catch {
      setFormError("Failed to complete workspace setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden border-border bg-card shadow-2xl [&>button]:hidden">
        {/* Header Branding */}
        <div className="p-6 pb-4 bg-muted/40 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-lg text-foreground">
              <span className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <Bug className="h-4.5 w-4.5" />
              </span>
              <span>TestLoom</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-3 w-3" /> Mandatory Step
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Choose Workspace Account Type
            </h2>
            <p className="text-xs text-muted-foreground">
              Select how you intend to use TestLoom to configure your default workspace.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formError && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {formError}
            </div>
          )}

          {/* Account Type Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Workspace Card */}
            <Card
              className={`relative cursor-pointer p-4 transition-all duration-200 border-2 ${
                selectedType === "PERSONAL"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-border/80"
              }`}
              onClick={() => setSelectedType("PERSONAL")}
            >
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                {selectedType === "PERSONAL" && (
                  <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="font-semibold text-sm text-foreground">Personal Account</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Individual QA or dev workspace for standalone test scenario recordings.
                </p>
              </div>
            </Card>

            {/* Organization Account Card */}
            <Card
              className={`relative cursor-pointer p-4 transition-all duration-200 border-2 ${
                selectedType === "ORGANIZATION"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-border/80"
              }`}
              onClick={() => setSelectedType("ORGANIZATION")}
            >
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                {selectedType === "ORGANIZATION" && (
                  <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="font-semibold text-sm text-foreground">Organization</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Collaborative team workspace with RBAC member roles & shared projects.
                </p>
              </div>
            </Card>
          </div>

          {/* Organization Details Form (If Organization Picked) */}
          {selectedType === "ORGANIZATION" && (
            <FieldGroup className="pt-2 border-t border-border space-y-4 animate-in fade-in duration-200">
              <Field>
                <FieldLabel htmlFor="orgName">Organization Name</FieldLabel>
                <Input
                  id="orgName"
                  placeholder="e.g. Acme Corp QA"
                  value={orgName}
                  onChange={handleNameChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="orgSlug">Workspace URL Slug (Auto-generated)</FieldLabel>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 font-mono">
                  <span>testloom.com/org/</span>
                  <span className="text-primary font-semibold">{orgSlug || "your-slug"}</span>
                </div>
                <Input
                  id="orgSlug"
                  placeholder="acme-corp-qa"
                  value={orgSlug}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed font-mono opacity-90"
                />
                <FieldDescription>
                  Auto-generated URL slug derived from your organization name.
                </FieldDescription>
              </Field>
            </FieldGroup>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex justify-end">
            <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up workspace...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingModal;

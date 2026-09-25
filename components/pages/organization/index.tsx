"use client";

import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { OrganizationDetailsResponse } from "@/lib/organizations-service/types";
import { updateOrganizationSchema, UpdateOrganizationInput } from "@/lib/organizations-service/validation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Building2,
  Users,
  FolderKanban,
  ShieldCheck,
  Calendar,
  Edit2,
  Loader2,
  CheckCircle2,
  Globe,
  Crown,
  MapPin,
  FileText,
  Mail,
  Phone,
  Briefcase,
  Copy,
  Check,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/components/ui/toast";

export function OrganizationPageComponent() {
  const [orgData, setOrgData] = useState<OrganizationDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fetchOrgDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<OrganizationDetailsResponse>("/api/organizations/current");
      if (response.success && response.data && !Array.isArray(response.data)) {
        setOrgData(response.data);
      } else {
        setError(response.success === false ? response.error.message : "Failed to load organization details");
      }
    } catch {
      setError("An unexpected error occurred while fetching organization details.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgDetails();
  }, [fetchOrgDetails]);

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
  });

  const watchedName = watch("name");
  const watchedSlug = watch("slug");

  useEffect(() => {
    if (orgData) {
      setValue("name", orgData.name);
      setValue("slug", orgData.slug);
      setValue("logoUrl", orgData.logoUrl);
      setValue("gstin", orgData.gstin);
      setValue("pan", orgData.pan);
      setValue("cin", orgData.cin);
      setValue("addressLine1", orgData.addressLine1);
      setValue("addressLine2", orgData.addressLine2);
      setValue("city", orgData.city);
      setValue("state", orgData.state);
      setValue("postalCode", orgData.postalCode);
      setValue("country", orgData.country);
      setValue("website", orgData.website);
      setValue("contactEmail", orgData.contactEmail);
      setValue("contactPhone", orgData.contactPhone);
      setValue("industry", orgData.industry);
      setValue("companySize", orgData.companySize);
    }
  }, [orgData, setValue]);

  // Auto-generate slug whenever organization name changes during edit
  useEffect(() => {
    if (isEditing && watchedName) {
      const autoSlug = generateSlug(watchedName);
      setValue("slug", autoSlug, { shouldValidate: true });
    }
  }, [watchedName, isEditing, setValue]);

  const handleCopyUrl = () => {
    if (!orgData) return;
    const url = `https://testloom.com/org/${orgData.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast.add({
      title: "URL Copied",
      description: `Organization URL ${url} copied to clipboard!`,
      type: "success",
    });
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const onUpdateSubmit = async (data: UpdateOrganizationInput) => {
    setError(null);
    try {
      const response = await apiClient.patch<OrganizationDetailsResponse>("/api/organizations/current", data);
      if (response.success && response.data && !Array.isArray(response.data)) {
        setOrgData(response.data);
        setIsEditing(false);
        toast.add({
          title: "Organization Updated",
          description: "Organization profile & compliance details updated successfully!",
          type: "success",
        });
      } else {
        const errorMsg = response.success === false ? response.error.message : "Failed to update organization";
        setError(errorMsg);
        toast.add({
          title: "Update Failed",
          description: errorMsg,
          type: "error",
        });
      }
    } catch {
      const errMsg = "An error occurred while updating organization details.";
      setError(errMsg);
      toast.add({
        title: "Update Error",
        description: errMsg,
        type: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading organization profile...</p>
        </div>
      </div>
    );
  }

  if (error && !orgData) {
    return (
      <div className="p-6 w-full space-y-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-3">
            <Building2 className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Organization Not Found</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchOrgDetails} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orgData) return null;

  const isAdmin = orgData.userRole === "ADMIN";

  return (
    <div className="w-full overlfow space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{orgData.name}</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {orgData.plan} PLAN
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-mono">
              <Globe className="h-3.5 w-3.5" /> testloom.com/org/{orgData.slug}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleCopyUrl} className="gap-1.5 font-mono text-xs">
            {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedUrl ? "Copied!" : "Copy Workspace URL"}
          </Button>
          <Badge className="px-3 py-1 text-xs font-semibold uppercase gap-1 bg-primary/10 text-primary border border-primary/20">
            <Crown className="h-3.5 w-3.5" /> Role: {orgData.userRole}
          </Badge>
          {isAdmin && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
              <Edit2 className="h-3.5 w-3.5" /> Edit Organization Profile
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      {/* Stats Cards Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Team Members</p>
              <h3 className="text-2xl font-bold text-foreground">{orgData.memberCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Shared Projects</p>
              <h3 className="text-2xl font-bold text-foreground">{orgData.projectCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Your Role</p>
              <h3 className="text-base font-bold text-foreground capitalize">{orgData.userRole.toLowerCase()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Joined Date</p>
              <h3 className="text-sm font-bold text-foreground">
                {new Date(orgData.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Width Workspace Profile & Edit Section */}
      <Card className="border-border bg-card w-full">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Organization Profile & Compliance Register
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Manage your enterprise organization profile, tax identification (GSTIN/PAN/CIN), registered address, and contact preferences."
              : "View team organization information, tax registration numbers, and registered office details."}
          </CardDescription>
        </CardHeader>
        <Separator />

        <CardContent className="p-6">
          {isEditing && isAdmin ? (
            <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-6 w-full">
              {/* Basic Details Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> General Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field data-invalid={!!formErrors.name}>
                    <FieldLabel htmlFor="name">Organization Name *</FieldLabel>
                    <Input id="name" placeholder="Acme Corp" {...register("name")} />
                    <FieldError errors={[{ message: formErrors.name?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.slug}>
                    <FieldLabel htmlFor="slug">Workspace URL Slug (Auto-generated)</FieldLabel>
                    <Input
                      id="slug"
                      placeholder="acme-corp"
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed font-mono opacity-90"
                      {...register("slug")}
                    />
                    <FieldDescription className="font-mono text-xs text-muted-foreground">
                      URL: testloom.com/org/<span className="text-primary font-semibold">{watchedSlug || orgData.slug}</span>
                    </FieldDescription>
                    <FieldError errors={[{ message: formErrors.slug?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.industry}>
                    <FieldLabel htmlFor="industry">Industry Vertical</FieldLabel>
                    <Input id="industry" placeholder="e.g. Fintech, SaaS, Healthcare" {...register("industry")} />
                    <FieldError errors={[{ message: formErrors.industry?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.companySize}>
                    <FieldLabel htmlFor="companySize">Company Size</FieldLabel>
                    <Input id="companySize" placeholder="e.g. 11-50 employees" {...register("companySize")} />
                    <FieldError errors={[{ message: formErrors.companySize?.message }]} />
                  </Field>
                </div>
              </div>

              <Separator />

              {/* Tax & Compliance IDs Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Tax & Compliance Identification (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field data-invalid={!!formErrors.gstin}>
                    <FieldLabel htmlFor="gstin">GSTIN (15-Digit Tax ID)</FieldLabel>
                    <Input id="gstin" placeholder="e.g. 27AAPCU2081F1Z0" className="font-mono uppercase" {...register("gstin")} />
                    <FieldError errors={[{ message: formErrors.gstin?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.pan}>
                    <FieldLabel htmlFor="pan">PAN (10-Digit ID)</FieldLabel>
                    <Input id="pan" placeholder="e.g. AAPCU2081F" className="font-mono uppercase" {...register("pan")} />
                    <FieldError errors={[{ message: formErrors.pan?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.cin}>
                    <FieldLabel htmlFor="cin">CIN (21-Digit Corporate ID)</FieldLabel>
                    <Input id="cin" placeholder="e.g. U74999MH2019PTC123456" className="font-mono uppercase" {...register("cin")} />
                    <FieldError errors={[{ message: formErrors.cin?.message }]} />
                  </Field>
                </div>
              </div>

              <Separator />

              {/* Contact Info Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> Contact Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field data-invalid={!!formErrors.website}>
                    <FieldLabel htmlFor="website">Official Website</FieldLabel>
                    <Input id="website" placeholder="https://acme.com" {...register("website")} />
                    <FieldError errors={[{ message: formErrors.website?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.contactEmail}>
                    <FieldLabel htmlFor="contactEmail">Official Contact Email</FieldLabel>
                    <Input id="contactEmail" type="email" placeholder="contact@acme.com" {...register("contactEmail")} />
                    <FieldError errors={[{ message: formErrors.contactEmail?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.contactPhone}>
                    <FieldLabel htmlFor="contactPhone">Contact Phone Number</FieldLabel>
                    <Input id="contactPhone" placeholder="+91 9876543210" {...register("contactPhone")} />
                    <FieldError errors={[{ message: formErrors.contactPhone?.message }]} />
                  </Field>
                </div>
              </div>

              <Separator />

              {/* Registered Address Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Registered Address Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field data-invalid={!!formErrors.addressLine1}>
                    <FieldLabel htmlFor="addressLine1">Address Line 1</FieldLabel>
                    <Input id="addressLine1" placeholder="Street Name, Building" {...register("addressLine1")} />
                    <FieldError errors={[{ message: formErrors.addressLine1?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.addressLine2}>
                    <FieldLabel htmlFor="addressLine2">Address Line 2</FieldLabel>
                    <Input id="addressLine2" placeholder="Suite / Unit / Floor" {...register("addressLine2")} />
                    <FieldError errors={[{ message: formErrors.addressLine2?.message }]} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field data-invalid={!!formErrors.city}>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <Input id="city" placeholder="Mumbai" {...register("city")} />
                    <FieldError errors={[{ message: formErrors.city?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.state}>
                    <FieldLabel htmlFor="state">State / Province</FieldLabel>
                    <Input id="state" placeholder="Maharashtra" {...register("state")} />
                    <FieldError errors={[{ message: formErrors.state?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.postalCode}>
                    <FieldLabel htmlFor="postalCode">PIN / ZIP Code</FieldLabel>
                    <Input id="postalCode" placeholder="400001" {...register("postalCode")} />
                    <FieldError errors={[{ message: formErrors.postalCode?.message }]} />
                  </Field>

                  <Field data-invalid={!!formErrors.country}>
                    <FieldLabel htmlFor="country">Country</FieldLabel>
                    <Input id="country" placeholder="India" {...register("country")} />
                    <FieldError errors={[{ message: formErrors.country?.message }]} />
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    "Save Organization Profile"
                  )}
                </Button>
                <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 w-full">
              {/* General Details Display */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-primary" /> General Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Organization Name</p>
                    <p className="font-semibold text-foreground text-sm">{orgData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Workspace Slug</p>
                    <p className="font-mono text-foreground font-semibold text-sm">/org/{orgData.slug}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Industry Vertical</p>
                    <p className="font-semibold text-foreground text-sm">{orgData.industry || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Company Size</p>
                    <p className="font-semibold text-foreground text-sm">{orgData.companySize || "Not specified"}</p>
                  </div>
                </div>
              </div>

              {/* Tax & Compliance IDs Display */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Compliance & Tax Identifiers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">GSTIN (Tax ID)</p>
                    <p className="font-mono font-semibold text-foreground text-sm">{orgData.gstin || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">PAN Number</p>
                    <p className="font-mono font-semibold text-foreground text-sm">{orgData.pan || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">CIN (Corporate ID)</p>
                    <p className="font-mono font-semibold text-foreground text-sm">{orgData.cin || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info Display */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Contact Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Official Website</p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {orgData.website ? (
                        <a href={orgData.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {orgData.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Official Email</p>
                    <p className="text-sm font-semibold text-foreground">{orgData.contactEmail || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Phone Number</p>
                    <p className="text-sm font-semibold text-foreground">{orgData.contactPhone || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Registered Address Display */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Registered Office Address
                </h3>

                {orgData.addressLine1 || orgData.city || orgData.country ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Street Address</p>
                      <p className="font-semibold text-foreground text-sm">
                        {orgData.addressLine1 || "—"}
                      </p>
                      {orgData.addressLine2 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{orgData.addressLine2}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground font-medium">City & State</p>
                      <p className="font-semibold text-foreground text-sm">
                        {[orgData.city, orgData.state].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground font-medium">PIN / Postal Code</p>
                      <p className="font-mono font-semibold text-foreground text-sm">
                        {orgData.postalCode || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Country / Region</p>
                      <p className="font-semibold text-foreground text-sm">
                        {orgData.country || "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/40 border border-border text-center text-muted-foreground text-xs italic">
                    No registered office address details recorded.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OrganizationPageComponent;

"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import apiClient from "@/lib/api-client/api-client.service";
import { OrganizationDetailsResponse } from "@/lib/organizations-service/types";
import { updateOrganizationSchema, UpdateOrganizationInput } from "@/lib/organizations-service/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { Briefcase, FileText, Mail, MapPin, Loader2 } from "lucide-react";

export interface OrganizationFormProps {
  orgData: OrganizationDetailsResponse;
  onCancel: () => void;
  onSuccess: (updated: OrganizationDetailsResponse) => void;
}

export function OrganizationForm({ orgData, onCancel, onSuccess }: OrganizationFormProps) {
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
    formState: { errors, isSubmitting },
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

  useEffect(() => {
    if (watchedName) {
      const autoSlug = generateSlug(watchedName);
      setValue("slug", autoSlug, { shouldValidate: true });
    }
  }, [watchedName, setValue]);

  const onSubmit = async (data: UpdateOrganizationInput) => {
    try {
      const idempotencyKey = generateIdempotencyKey("update_org");
      const response = await apiClient.patch<OrganizationDetailsResponse>(
        "/api/organizations/current",
        data,
        { idempotencyKey }
      );
      if (response.success && response.data && !Array.isArray(response.data)) {
        onSuccess(response.data);
        toast.add({
          title: "Organization Updated",
          description: "Organization profile & compliance details updated successfully!",
          type: "success",
        });
      } else {
        const errorMsg = response.success === false ? response.error.message : "Failed to update organization";
        toast.add({
          title: "Update Failed",
          description: errorMsg,
          type: "error",
        });
      }
    } catch {
      toast.add({
        title: "Update Error",
        description: "An error occurred while updating organization details.",
        type: "error",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
      {/* Basic Profile Details Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" /> General Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Organization Name *</FieldLabel>
            <Input id="name" placeholder="Acme Corp" {...register("name")} />
            <FieldError errors={[{ message: errors.name?.message }]} />
          </Field>

          <Field data-invalid={!!errors.slug}>
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
            <FieldError errors={[{ message: errors.slug?.message }]} />
          </Field>

          <Field data-invalid={!!errors.industry}>
            <FieldLabel htmlFor="industry">Industry Vertical</FieldLabel>
            <Input id="industry" placeholder="e.g. Fintech, SaaS, Healthcare" {...register("industry")} />
            <FieldError errors={[{ message: errors.industry?.message }]} />
          </Field>

          <Field data-invalid={!!errors.companySize}>
            <FieldLabel htmlFor="companySize">Company Size</FieldLabel>
            <Input id="companySize" placeholder="e.g. 11-50 employees" {...register("companySize")} />
            <FieldError errors={[{ message: errors.companySize?.message }]} />
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
          <Field data-invalid={!!errors.gstin}>
            <FieldLabel htmlFor="gstin">GSTIN (15-Digit Tax ID)</FieldLabel>
            <Input id="gstin" placeholder="e.g. 27AAPCU2081F1Z0" className="font-mono uppercase" {...register("gstin")} />
            <FieldError errors={[{ message: errors.gstin?.message }]} />
          </Field>

          <Field data-invalid={!!errors.pan}>
            <FieldLabel htmlFor="pan">PAN (10-Digit ID)</FieldLabel>
            <Input id="pan" placeholder="e.g. AAPCU2081F" className="font-mono uppercase" {...register("pan")} />
            <FieldError errors={[{ message: errors.pan?.message }]} />
          </Field>

          <Field data-invalid={!!errors.cin}>
            <FieldLabel htmlFor="cin">CIN (21-Digit Corporate ID)</FieldLabel>
            <Input id="cin" placeholder="e.g. U74999MH2019PTC123456" className="font-mono uppercase" {...register("cin")} />
            <FieldError errors={[{ message: errors.cin?.message }]} />
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
          <Field data-invalid={!!errors.website}>
            <FieldLabel htmlFor="website">Official Website</FieldLabel>
            <Input id="website" placeholder="https://acme.com" {...register("website")} />
            <FieldError errors={[{ message: errors.website?.message }]} />
          </Field>

          <Field data-invalid={!!errors.contactEmail}>
            <FieldLabel htmlFor="contactEmail">Official Contact Email</FieldLabel>
            <Input id="contactEmail" type="email" placeholder="contact@acme.com" {...register("contactEmail")} />
            <FieldError errors={[{ message: errors.contactEmail?.message }]} />
          </Field>

          <Field data-invalid={!!errors.contactPhone}>
            <FieldLabel htmlFor="contactPhone">Contact Phone Number</FieldLabel>
            <Input id="contactPhone" placeholder="+91 9876543210" {...register("contactPhone")} />
            <FieldError errors={[{ message: errors.contactPhone?.message }]} />
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
          <Field data-invalid={!!errors.addressLine1}>
            <FieldLabel htmlFor="addressLine1">Address Line 1</FieldLabel>
            <Input id="addressLine1" placeholder="Street Name, Building" {...register("addressLine1")} />
            <FieldError errors={[{ message: errors.addressLine1?.message }]} />
          </Field>

          <Field data-invalid={!!errors.addressLine2}>
            <FieldLabel htmlFor="addressLine2">Address Line 2</FieldLabel>
            <Input id="addressLine2" placeholder="Suite / Unit / Floor" {...register("addressLine2")} />
            <FieldError errors={[{ message: errors.addressLine2?.message }]} />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field data-invalid={!!errors.city}>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" placeholder="Mumbai" {...register("city")} />
            <FieldError errors={[{ message: errors.city?.message }]} />
          </Field>

          <Field data-invalid={!!errors.state}>
            <FieldLabel htmlFor="state">State / Province</FieldLabel>
            <Input id="state" placeholder="Maharashtra" {...register("state")} />
            <FieldError errors={[{ message: errors.state?.message }]} />
          </Field>

          <Field data-invalid={!!errors.postalCode}>
            <FieldLabel htmlFor="postalCode">PIN / ZIP Code</FieldLabel>
            <Input id="postalCode" placeholder="400001" {...register("postalCode")} />
            <FieldError errors={[{ message: errors.postalCode?.message }]} />
          </Field>

          <Field data-invalid={!!errors.country}>
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <Input id="country" placeholder="India" {...register("country")} />
            <FieldError errors={[{ message: errors.country?.message }]} />
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
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default OrganizationForm;

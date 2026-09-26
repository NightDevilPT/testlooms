"use client";

import React from "react";
import { OrganizationDetailsResponse } from "@/lib/organizations-service/types";
import { Briefcase, FileText, Mail, MapPin } from "lucide-react";

export interface OrganizationDetailsProps {
  orgData: OrganizationDetailsResponse;
}

export function OrganizationDetails({ orgData }: OrganizationDetailsProps) {
  return (
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
              <p className="font-semibold text-foreground text-sm">{orgData.addressLine1 || "—"}</p>
              {orgData.addressLine2 && <p className="text-xs text-muted-foreground mt-0.5">{orgData.addressLine2}</p>}
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium">City & State</p>
              <p className="font-semibold text-foreground text-sm">
                {[orgData.city, orgData.state].filter(Boolean).join(", ") || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium">PIN / Postal Code</p>
              <p className="font-mono font-semibold text-foreground text-sm">{orgData.postalCode || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium">Country / Region</p>
              <p className="font-semibold text-foreground text-sm">{orgData.country || "—"}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted/40 border border-border text-center text-muted-foreground text-xs italic">
            No registered office address details recorded.
          </div>
        )}
      </div>
    </div>
  );
}

export default OrganizationDetails;

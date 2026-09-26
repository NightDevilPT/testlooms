"use client";

import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { OrganizationDetailsResponse } from "@/lib/organizations-service/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Users,
  FolderKanban,
  ShieldCheck,
  Calendar,
  Edit2,
  Globe,
  Crown,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { OrganizationSkeleton } from "./_components/organization-skeleton";
import { OrganizationForm } from "./_components/organization-form";
import { OrganizationDetails } from "./_components/organization-details";

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

  if (isLoading) {
    return <OrganizationSkeleton />;
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
    <div className="w-full space-y-6">
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
            <OrganizationForm
              orgData={orgData}
              onCancel={() => setIsEditing(false)}
              onSuccess={(updated) => {
                setOrgData(updated);
                setIsEditing(false);
              }}
            />
          ) : (
            <OrganizationDetails orgData={orgData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OrganizationPageComponent;

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Crown,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  LogIn,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/context/auth-context";
import apiClient from "@/lib/api-client/api-client.service";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import { toast } from "@/components/ui/toast";
import { AcceptInviteSkeleton } from "./_components/accept-invite-skeleton";

export interface InviteDetails {
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "QA_ENGINEER" | "VIEWER";
  organizationName: string;
  isExistingUser: boolean;
}

export function AcceptInviteComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("inviteToken");

  const { user, isAuthenticated, refetchUser } = useAuth();
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided in URL link.");
      setIsLoading(false);
      return;
    }

    const fetchInviteDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<InviteDetails>(
          `/api/auth/invite-details?token=${encodeURIComponent(token)}`
        );

        if (response.success && response.data && !Array.isArray(response.data)) {
          setInviteDetails(response.data);
        } else {
          setError(
            response.success === false
              ? response.error.message
              : "Invalid, expired, or already accepted invitation link."
          );
        }
      } catch {
        setError("Failed to validate invitation token.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      const idempotencyKey = generateIdempotencyKey("accept_invite");
      const response = await apiClient.post<{ message: string }>(
        "/api/auth/accept-invite",
        { token },
        { idempotencyKey }
      );

      if (response.success) {
        toast.add({
          title: "Invitation Accepted!",
          description: `You have successfully joined ${inviteDetails?.organizationName || "the organization"}.`,
          type: "success",
        });
        await refetchUser();
        router.push("/dashboard");
      } else {
        const errorMsg =
          response.success === false ? response.error.message : "Failed to accept invitation";
        toast.add({
          title: "Acceptance Error",
          description: errorMsg,
          type: "error",
        });
      }
    } catch {
      toast.add({
        title: "Error",
        description: "An error occurred while accepting invitation.",
        type: "error",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const getRoleBadge = (role: "ADMIN" | "QA_ENGINEER" | "VIEWER") => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 font-medium text-xs py-1 px-2.5">
            <Crown className="h-3.5 w-3.5" /> Admin Access
          </Badge>
        );
      case "QA_ENGINEER":
        return (
          <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border gap-1 font-medium text-xs py-1 px-2.5">
            <ShieldCheck className="h-3.5 w-3.5" /> QA Engineer (Editor)
          </Badge>
        );
      case "VIEWER":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 font-medium text-xs py-1 px-2.5">
            <Eye className="h-3.5 w-3.5" /> Viewer (Read Only)
          </Badge>
        );
    }
  };

  if (isLoading) {
    return <AcceptInviteSkeleton />;
  }

  return (
    <Card className="overflow-hidden p-0 border-border bg-card shadow-2xl w-full max-w-4xl mx-auto">
      <CardContent className="grid p-0 md:grid-cols-2">
        <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
          {error ? (
            <div className="flex flex-col items-center gap-4 text-center my-auto py-6">
              <div className="h-14 w-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Invalid Invitation</h1>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">{error}</p>
              </div>
              <Button onClick={() => router.push("/auth/login")} className="mt-2 text-xs gap-2">
                Go to Login <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : inviteDetails ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                  <UserPlus className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Invitation</h1>
                <p className="text-sm text-muted-foreground">
                  You have been invited to join <strong>{inviteDetails.organizationName}</strong>
                </p>
              </div>

              {/* Role & Email Summary Box */}
              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Invited Email:</span>
                  <span className="font-semibold text-foreground font-mono">{inviteDetails.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Assigned Role:</span>
                  {getRoleBadge(inviteDetails.role)}
                </div>
              </div>

              {/* Action State: User ALREADY Logged In */}
              {isAuthenticated ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-center text-muted-foreground">
                    Logged in as <strong>{user?.email}</strong>. Click below to accept invitation and enter workspace.
                  </p>
                  <Button
                    type="button"
                    onClick={handleAcceptInvite}
                    disabled={isAccepting}
                    className="w-full gap-2 shadow-lg"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Accepting Invite...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Accept Invitation & Join Workspace
                      </>
                    )}
                  </Button>
                </div>
              ) : inviteDetails.isExistingUser ? (
                /* Action State: User NOT Logged In, but HAS Existing Account */
                <div className="space-y-3 pt-2">
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground text-center">
                    An account already exists for <strong>{inviteDetails.email}</strong>. Please log in to accept this invite.
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/auth/login?inviteToken=${encodeURIComponent(token || "")}&email=${encodeURIComponent(inviteDetails.email)}`
                      )
                    }
                    className="w-full gap-2 shadow-lg"
                  >
                    <LogIn className="h-4 w-4" /> Log In to Accept Invitation
                  </Button>
                  <div className="text-center text-xs pt-1">
                    <Link
                      href={`/auth/signup?inviteToken=${encodeURIComponent(token || "")}&email=${encodeURIComponent(inviteDetails.email)}`}
                      className="text-muted-foreground hover:text-primary underline underline-offset-4"
                    >
                      Create a different account instead
                    </Link>
                  </div>
                </div>
              ) : (
                /* Action State: User DOES NOT Have Account (New User) */
                <div className="space-y-3 pt-2">
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground text-center">
                    Create your account to accept invitation to <strong>{inviteDetails.organizationName}</strong>.
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({
                        inviteToken: token || "",
                        email: inviteDetails.email,
                      });
                      if (inviteDetails.firstName) params.append("firstName", inviteDetails.firstName);
                      if (inviteDetails.lastName) params.append("lastName", inviteDetails.lastName);
                      router.push(`/auth/signup?${params.toString()}`);
                    }}
                    className="w-full gap-2 shadow-lg"
                  >
                    <UserPlus className="h-4 w-4" /> Create Account to Join
                  </Button>
                  <div className="text-center text-xs pt-1">
                    <Link
                      href={`/auth/login?inviteToken=${encodeURIComponent(token || "")}&email=${encodeURIComponent(inviteDetails.email)}`}
                      className="text-muted-foreground hover:text-primary underline underline-offset-4"
                    >
                      Already have an account? Log in to accept
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right Side Prominent Graphic Panel */}
        <div className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden bg-muted/30 border-l border-border">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
              <div className="relative h-28 w-28 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 border border-primary-foreground/20">
                <Bug className="h-14 w-14" />
              </div>
            </div>

            <div className="space-y-2 max-w-xs">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                TestLoom Studio
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Join your teammates to record, replay, and run automated browser test suites together.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AcceptInviteComponent;

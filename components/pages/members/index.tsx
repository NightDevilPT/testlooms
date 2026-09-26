"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { generateIdempotencyKey } from "@/lib/idempotency-service/types";
import { PaginationInfo } from "@/lib/response-service/types";
import {
  OrganizationMemberResponse,
  MemberRole,
  MemberStatus,
  OrganizationDetailsResponse,
} from "@/lib/organizations-service/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Eye,
  MoreVertical,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  Crown,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { MembersSkeleton } from "./_components/members-skeleton";
import { InviteMemberDialog } from "./_components/invite-member-dialog";
import { EditRoleDialog } from "./_components/edit-role-dialog";
import { RemoveMemberDialog } from "./_components/remove-member-dialog";

export function MembersPageComponent() {
  const [members, setMembers] = useState<OrganizationMemberResponse[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrganizationDetailsResponse | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-Side Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | MemberStatus>("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | MemberRole>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal / Dialog States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [memberToEditRole, setMemberToEditRole] = useState<OrganizationMemberResponse | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMemberResponse | null>(null);
  const [isResendingId, setIsResendingId] = useState<string | null>(null);

  // Fetch Current Organization details
  const fetchOrgDetails = useCallback(async () => {
    try {
      const orgRes = await apiClient.get<OrganizationDetailsResponse>("/api/organizations/current");
      if (orgRes.success && orgRes.data && !Array.isArray(orgRes.data)) {
        setCurrentOrg(orgRes.data);
      }
    } catch {
      // Non-blocking org fetch error handling
    }
  }, []);

  // Fetch Members list from backend API with active filters and pagination parameters
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (roleFilter !== "ALL") params.append("role", roleFilter);
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));

      const membersRes = await apiClient.get<OrganizationMemberResponse[]>(
        `/api/organizations/members?${params.toString()}`
      );

      if (membersRes.success && membersRes.data && Array.isArray(membersRes.data)) {
        setMembers(membersRes.data as OrganizationMemberResponse[]);
        setPagination(membersRes.pagination || null);
      } else {
        setError(membersRes.success === false ? membersRes.error.message : "Failed to load team members.");
      }
    } catch {
      setError("An error occurred while fetching team members.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, roleFilter, page, pageSize]);

  useEffect(() => {
    fetchOrgDetails();
  }, [fetchOrgDetails]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handlers for interactive filters (resets active page back to 1)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleStatusFilterChange = (status: "ALL" | MemberStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleRoleFilterChange = (role: "ALL" | MemberRole) => {
    setRoleFilter(role);
    setPage(1);
  };

  // Derived user authorization state
  const currentUserRole = currentOrg?.userRole || "VIEWER";
  const isAdmin = currentUserRole === "ADMIN";

  // Stats calculation
  const stats = useMemo(() => {
    const total = pagination?.totalItems ?? members.length;
    const active = members.filter((m) => m.status === "ACTIVE").length;
    const pending = members.filter((m) => m.status === "PENDING").length;
    const admins = members.filter((m) => m.role === "ADMIN").length;
    const qa = members.filter((m) => m.role === "QA_ENGINEER").length;
    const viewers = members.filter((m) => m.role === "VIEWER").length;

    return { total, active, pending, admins, qa, viewers };
  }, [members, pagination]);

  // Handle Resend Invite
  const handleResendInvite = async (member: OrganizationMemberResponse) => {
    setIsResendingId(member.id);
    try {
      const idempotencyKey = generateIdempotencyKey("resend_member_invite");
      const response = await apiClient.post<{ message: string }>(
        `/api/organizations/members/${member.id}/resend`,
        {},
        { idempotencyKey }
      );

      if (response.success) {
        toast.add({
          title: "Invitation Resent",
          description: `Invitation email resent to ${member.invitedEmail}.`,
          type: "success",
        });
      } else {
        const errorMsg = response.success === false ? response.error.message : "Failed to resend invite";
        toast.add({
          title: "Resend Failed",
          description: errorMsg,
          type: "error",
        });
      }
    } catch {
      toast.add({
        title: "Error",
        description: "Failed to resend invitation email.",
        type: "error",
      });
    } finally {
      setIsResendingId(null);
    }
  };

  // Semantic Token Badge Renderers
  const getRoleBadge = (role: MemberRole) => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 font-medium">
            <Crown className="h-3 w-3" /> Admin
          </Badge>
        );
      case "QA_ENGINEER":
        return (
          <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border gap-1 font-medium">
            <ShieldCheck className="h-3 w-3" /> QA Engineer
          </Badge>
        );
      case "VIEWER":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 font-medium">
            <Eye className="h-3 w-3" /> Viewer
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: MemberStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Active
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-accent text-accent-foreground border-border gap-1 font-medium">
            <Clock className="h-3 w-3" /> Pending Invite
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 font-medium">
            <AlertCircle className="h-3 w-3" /> Revoked
          </Badge>
        );
    }
  };

  // Columns Configuration for Reusable Shared DataTable Component
  const columns: DataTableColumn<OrganizationMemberResponse>[] = useMemo(
    () => [
      {
        key: "member",
        header: "Member",
        cell: (member) => {
          const displayName = member.user?.fullName || member.invitedEmail.split("@")[0];
          const initial = displayName.charAt(0).toUpperCase();

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-border">
                {member.user?.avatarUrl && <AvatarImage src={member.user.avatarUrl} alt={displayName} />}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  {displayName}
                  {member.role === "ADMIN" && <Crown className="h-3.5 w-3.5 text-primary" />}
                </span>
                <span className="text-xs text-muted-foreground">{member.invitedEmail}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: "role",
        header: "Role",
        cell: (member) => getRoleBadge(member.role),
      },
      {
        key: "status",
        header: "Status",
        cell: (member) => getStatusBadge(member.status),
      },
      {
        key: "joinedAt",
        header: "Joined Date",
        cell: (member) => (
          <span className="text-xs text-muted-foreground">
            {member.joinedAt
              ? new Date(member.joinedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : member.status === "PENDING"
              ? "Invited " + new Date(member.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (member) => {
          if (!isAdmin) {
            return <span className="text-xs text-muted-foreground">Read Only</span>;
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 w-8 rounded-md hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Manage Member</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setMemberToEditRole(member)} className="gap-2 cursor-pointer">
                  <Shield className="h-4 w-4" /> Change Role
                </DropdownMenuItem>

                {member.status === "PENDING" && (
                  <DropdownMenuItem
                    onClick={() => handleResendInvite(member)}
                    disabled={isResendingId === member.id}
                    className="gap-2 cursor-pointer text-accent-foreground"
                  >
                    {isResendingId === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Resend Invitation
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setMemberToRemove(member)}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Remove Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [isAdmin, isResendingId]
  );

  if (isLoading && members.length === 0) {
    return <MembersSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" /> Team Members
            </h1>
            {currentOrg && (
              <Badge variant="outline" className="text-xs bg-muted/50 border-border">
                {currentOrg.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage organization members, invite new teammates, assign permission roles, and track invitations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            disabled={!isAdmin}
            className="gap-2 shadow-lg"
          >
            <UserPlus className="h-4 w-4" /> Invite Team Member
          </Button>
        </div>
      </div>

      {/* Permission Notice if not Admin */}
      {!isAdmin && (
        <div className="rounded-lg bg-muted border border-border p-3 text-xs text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
          <span>You have <strong>{currentUserRole}</strong> access. Only organization <strong>Admins</strong> can invite or manage team members.</span>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Teammates</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Members</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">{stats.active}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Invites</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">{stats.pending}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent border border-border flex items-center justify-center text-accent-foreground">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Admins / QA / Viewers</p>
              <h3 className="text-sm font-semibold tracking-tight text-foreground mt-1.5 flex items-center gap-1.5">
                <span className="text-primary">{stats.admins}</span> Admin /{" "}
                <span className="text-foreground">{stats.qa}</span> QA /{" "}
                <span className="text-muted-foreground">{stats.viewers}</span> Viewer
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Reusable Shared DataTable Component with Full Server-Side API Pagination & Semantic Token Styling */}
      <DataTable<OrganizationMemberResponse>
        data={members}
        columns={columns}
        rowKey={(m) => m.id}
        pagination={pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        pageSizeOptions={[5, 10, 25, 50]}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search members by name or email..."
        isLoading={isLoading}
        emptyTitle="No team members found"
        emptyDescription="Try adjusting your search query or filter options."
        filterSlot={
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Status Filter Buttons */}
            <div className="flex items-center p-1 bg-muted rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => handleStatusFilterChange("ALL")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "ALL"
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange("ACTIVE")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "ACTIVE"
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange("PENDING")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "PENDING"
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending
              </button>
            </div>

            {/* Role Filter Buttons */}
            <div className="flex items-center p-1 bg-muted rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => handleRoleFilterChange("ALL")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  roleFilter === "ALL"
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Roles
              </button>
              <button
                type="button"
                onClick={() => handleRoleFilterChange("ADMIN")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  roleFilter === "ADMIN"
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleRoleFilterChange("QA_ENGINEER")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  roleFilter === "QA_ENGINEER"
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                QA
              </button>
              <button
                type="button"
                onClick={() => handleRoleFilterChange("VIEWER")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  roleFilter === "VIEWER"
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Viewer
              </button>
            </div>
          </div>
        }
      />

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        organizationName={currentOrg?.name}
        onSuccess={fetchMembers}
      />

      {/* Edit Member Role Dialog */}
      <EditRoleDialog
        member={memberToEditRole}
        onOpenChange={(open) => !open && setMemberToEditRole(null)}
        onSuccess={fetchMembers}
      />

      {/* Remove Member Confirmation Dialog */}
      <RemoveMemberDialog
        member={memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        onSuccess={fetchMembers}
      />
    </div>
  );
}

export default MembersPageComponent;

import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import ResponseService from "@/lib/response-service/response.service";
import { OrganizationDetailsResponse } from "./types";
import { UpdateOrganizationInput } from "./validation";

export class OrganizationsService {
  /**
   * Fetch details of current user's organization
   */
  public static async getCurrentOrganization(userId: string, request?: Request): Promise<NextResponse> {
    try {
      const member = await prisma.organizationMember.findFirst({
        where: { userId, deletedAt: null },
        include: { organization: true },
      });

      if (!member || !member.organization || member.organization.deletedAt !== null) {
        return ResponseService.notFound(
          "You are not currently part of an active organization.",
          request
        );
      }

      const org = member.organization;

      const memberCount = await prisma.organizationMember.count({
        where: { organizationId: org.id, deletedAt: null },
      });

      const projectCount = await prisma.project.count({
        where: { organizationId: org.id, deletedAt: null },
      });

      const response: OrganizationDetailsResponse = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        plan: org.plan,
        userRole: member.role,
        joinedAt: member.joinedAt.toISOString(),
        createdById: org.createdBy,
        memberCount,
        projectCount,

        gstin: org.gstin,
        pan: org.pan,
        cin: org.cin,

        addressLine1: org.addressLine1,
        addressLine2: org.addressLine2,
        city: org.city,
        state: org.state,
        postalCode: org.postalCode,
        country: org.country,

        website: org.website,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        industry: org.industry,
        companySize: org.companySize,

        createdAt: org.createdAt.toISOString(),
      };

      return ResponseService.ok(response, undefined, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Update organization details (Admin only)
   */
  public static async updateOrganization(
    userId: string,
    input: UpdateOrganizationInput,
    request?: Request
  ): Promise<NextResponse> {
    try {
      const member = await prisma.organizationMember.findFirst({
        where: { userId, deletedAt: null },
        include: { organization: true },
      });

      if (!member || !member.organization || member.organization.deletedAt !== null) {
        return ResponseService.notFound("Organization not found.", request);
      }

      if (member.role !== "ADMIN") {
        return ResponseService.forbidden(
          "Only organization Admins can edit organization details.",
          request
        );
      }

      const org = member.organization;

      if (input.slug !== org.slug) {
        const existingSlug = await prisma.organization.findUnique({
          where: { slug: input.slug },
        });

        if (existingSlug && existingSlug.id !== org.id) {
          return ResponseService.conflict(
            "This URL slug is already taken by another organization.",
            request
          );
        }
      }

      const updatedOrg = await prisma.organization.update({
        where: { id: org.id },
        data: {
          name: input.name,
          slug: input.slug,
          logoUrl: input.logoUrl !== undefined ? input.logoUrl : org.logoUrl,

          gstin: input.gstin !== undefined ? input.gstin : org.gstin,
          pan: input.pan !== undefined ? input.pan : org.pan,
          cin: input.cin !== undefined ? input.cin : org.cin,

          addressLine1: input.addressLine1 !== undefined ? input.addressLine1 : org.addressLine1,
          addressLine2: input.addressLine2 !== undefined ? input.addressLine2 : org.addressLine2,
          city: input.city !== undefined ? input.city : org.city,
          state: input.state !== undefined ? input.state : org.state,
          postalCode: input.postalCode !== undefined ? input.postalCode : org.postalCode,
          country: input.country !== undefined ? input.country : org.country,

          website: input.website !== undefined ? input.website : org.website,
          contactEmail: input.contactEmail !== undefined ? input.contactEmail : org.contactEmail,
          contactPhone: input.contactPhone !== undefined ? input.contactPhone : org.contactPhone,
          industry: input.industry !== undefined ? input.industry : org.industry,
          companySize: input.companySize !== undefined ? input.companySize : org.companySize,

          updatedBy: userId,
        },
      });

      const memberCount = await prisma.organizationMember.count({
        where: { organizationId: updatedOrg.id, deletedAt: null },
      });

      const projectCount = await prisma.project.count({
        where: { organizationId: updatedOrg.id, deletedAt: null },
      });

      const response: OrganizationDetailsResponse = {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
        logoUrl: updatedOrg.logoUrl,
        plan: updatedOrg.plan,
        userRole: member.role,
        joinedAt: member.joinedAt.toISOString(),
        createdById: updatedOrg.createdBy,
        memberCount,
        projectCount,

        gstin: updatedOrg.gstin,
        pan: updatedOrg.pan,
        cin: updatedOrg.cin,

        addressLine1: updatedOrg.addressLine1,
        addressLine2: updatedOrg.addressLine2,
        city: updatedOrg.city,
        state: updatedOrg.state,
        postalCode: updatedOrg.postalCode,
        country: updatedOrg.country,

        website: updatedOrg.website,
        contactEmail: updatedOrg.contactEmail,
        contactPhone: updatedOrg.contactPhone,
        industry: updatedOrg.industry,
        companySize: updatedOrg.companySize,

        createdAt: updatedOrg.createdAt.toISOString(),
      };

      return ResponseService.ok(response, undefined, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Fetch members (active & pending) of current organization with server-side search, filtering, & pagination
   */
  public static async getMembers(
    userId: string,
    query: {
      search?: string;
      status?: "ALL" | "ACTIVE" | "PENDING";
      role?: "ALL" | "ADMIN" | "QA_ENGINEER" | "VIEWER";
      page?: number;
      pageSize?: number;
    },
    request?: Request
  ): Promise<NextResponse> {
    try {
      const currentMember = await prisma.organizationMember.findFirst({
        where: { userId, deletedAt: null },
      });

      if (!currentMember) {
        return ResponseService.notFound("Organization membership not found.", request);
      }

      const searchTrimmed = query.search ? query.search.trim() : "";
      const status = query.status || "ALL";
      const role = query.role || "ALL";
      const page = query.page || 1;
      const pageSize = query.pageSize || 10;

      // 1. Fetch Active Members (if status is ALL or ACTIVE)
      let activeMapped: Array<{
        id: string;
        organizationId: string;
        userId: string | null;
        invitedEmail: string;
        role: "ADMIN" | "QA_ENGINEER" | "VIEWER";
        status: "ACTIVE" | "PENDING" | "REVOKED";
        joinedAt: string | null;
        createdAt: string;
        user: { id: string; fullName: string; email: string; avatarUrl: string | null } | null;
      }> = [];

      if (status === "ALL" || status === "ACTIVE") {
        const activeWhere: {
          organizationId: string;
          deletedAt: null;
          role?: "ADMIN" | "QA_ENGINEER" | "VIEWER";
          OR?: Array<object>;
        } = {
          organizationId: currentMember.organizationId,
          deletedAt: null,
        };

        if (role !== "ALL") {
          activeWhere.role = role;
        }

        if (searchTrimmed) {
          activeWhere.OR = [
            { user: { email: { contains: searchTrimmed, mode: "insensitive" } } },
            { user: { firstName: { contains: searchTrimmed, mode: "insensitive" } } },
            { user: { lastName: { contains: searchTrimmed, mode: "insensitive" } } },
          ];
        }

        const activeMembers = await prisma.organizationMember.findMany({
          where: activeWhere,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        activeMapped = activeMembers.map((m) => ({
          id: m.id,
          organizationId: m.organizationId,
          userId: m.userId,
          invitedEmail: m.user ? m.user.email : "",
          role: m.role as "ADMIN" | "QA_ENGINEER" | "VIEWER",
          status: "ACTIVE" as const,
          joinedAt: m.joinedAt ? m.joinedAt.toISOString() : null,
          createdAt: m.createdAt.toISOString(),
          user: m.user
            ? {
                id: m.user.id,
                fullName: `${m.user.firstName} ${m.user.lastName}`.trim(),
                email: m.user.email,
                avatarUrl: m.user.avatarUrl,
              }
            : null,
        }));
      }

      // 2. Fetch Pending Invites (if status is ALL or PENDING)
      let pendingMapped: Array<{
        id: string;
        organizationId: string;
        userId: string | null;
        invitedEmail: string;
        role: "ADMIN" | "QA_ENGINEER" | "VIEWER";
        status: "ACTIVE" | "PENDING" | "REVOKED";
        joinedAt: string | null;
        createdAt: string;
        user: { id: string; fullName: string; email: string; avatarUrl: string | null } | null;
      }> = [];

      if (status === "ALL" || status === "PENDING") {
        const pendingWhere: {
          organizationId: string;
          deletedAt: null;
          acceptedAt: null;
          role?: "ADMIN" | "QA_ENGINEER" | "VIEWER";
          OR?: Array<object>;
        } = {
          organizationId: currentMember.organizationId,
          deletedAt: null,
          acceptedAt: null,
        };

        if (role !== "ALL") {
          pendingWhere.role = role;
        }

        if (searchTrimmed) {
          pendingWhere.OR = [
            { email: { contains: searchTrimmed, mode: "insensitive" } },
            { firstName: { contains: searchTrimmed, mode: "insensitive" } },
            { lastName: { contains: searchTrimmed, mode: "insensitive" } },
          ];
        }

        const pendingInvites = await prisma.orgInvite.findMany({
          where: pendingWhere,
          orderBy: { createdAt: "desc" },
        });

        pendingMapped = pendingInvites.map((inv) => {
          const fullName = `${inv.firstName || ""} ${inv.lastName || ""}`.trim();
          return {
            id: inv.id,
            organizationId: inv.organizationId,
            userId: null,
            invitedEmail: inv.email,
            role: inv.role as "ADMIN" | "QA_ENGINEER" | "VIEWER",
            status: "PENDING" as const,
            joinedAt: null,
            createdAt: inv.createdAt.toISOString(),
            user: fullName ? { id: "", fullName, email: inv.email, avatarUrl: null } : null,
          };
        });
      }

      const combined = [...activeMapped, ...pendingMapped];

      // Total count & server pagination calculations
      const totalItems = combined.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const currentPage = Math.min(page, totalPages);

      const startIndex = (currentPage - 1) * pageSize;
      const paginatedSlice = combined.slice(startIndex, startIndex + pageSize);

      const paginationMeta = {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
      };

      return ResponseService.paginated(paginatedSlice, paginationMeta, 200, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Invite a new member to the organization (Admin only)
   */
  public static async inviteMember(
    userId: string,
    input: { firstName?: string; lastName?: string; email: string; role: "ADMIN" | "QA_ENGINEER" | "VIEWER" },
    request?: Request
  ): Promise<NextResponse> {
    try {
      const currentMember = await prisma.organizationMember.findFirst({
        where: { userId, deletedAt: null },
        include: {
          organization: true,
          user: true,
        },
      });

      if (!currentMember || !currentMember.organization) {
        return ResponseService.notFound("Organization not found.", request);
      }

      if (currentMember.role !== "ADMIN") {
        return ResponseService.forbidden(
          "Only organization Admins can invite team members.",
          request
        );
      }

      const normalizedEmail = input.email.trim().toLowerCase();

      // Check if user is already an active member in this org
      const existingMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: currentMember.organizationId,
          user: { email: normalizedEmail },
          deletedAt: null,
        },
      });

      if (existingMember) {
        return ResponseService.conflict(
          `User with email ${normalizedEmail} is already an active member of this organization.`,
          request
        );
      }

      // Check if an active invite is already pending
      const existingInvite = await prisma.orgInvite.findFirst({
        where: {
          organizationId: currentMember.organizationId,
          email: normalizedEmail,
          deletedAt: null,
          acceptedAt: null,
        },
      });

      if (existingInvite) {
        return ResponseService.conflict(
          `An active invitation has already been sent to ${normalizedEmail}.`,
          request
        );
      }

      const { randomBytes } = await import("crypto");
      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const newInvite = await prisma.orgInvite.create({
        data: {
          organizationId: currentMember.organizationId,
          email: normalizedEmail,
          firstName: input.firstName?.trim() || null,
          lastName: input.lastName?.trim() || null,
          role: input.role,
          token,
          invitedById: userId,
          expiresAt,
          createdBy: userId,
        },
      });

      // Send Email Invitation with pre-fill parameters
      const inviterName = currentMember.user
        ? `${currentMember.user.firstName} ${currentMember.user.lastName}`.trim()
        : "An Organization Admin";

      const inviteParams = new URLSearchParams({
        email: normalizedEmail,
        inviteToken: token,
      });
      if (input.firstName?.trim()) inviteParams.append("firstName", input.firstName.trim());
      if (input.lastName?.trim()) inviteParams.append("lastName", input.lastName.trim());

      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/signup?${inviteParams.toString()}`;

      try {
        const { MailService } = await import("@/lib/mail-service/mail.service");
        await MailService.sendInviteEmail({
          toEmail: normalizedEmail,
          recipientFirstName: input.firstName?.trim(),
          recipientLastName: input.lastName?.trim(),
          organizationName: currentMember.organization.name,
          inviterName,
          role: input.role,
          inviteUrl,
        });
      } catch (mailErr) {
        const { logger } = await import("@/lib/logger-service/logger.service");
        logger.error("Failed to send invitation email", { error: mailErr, email: normalizedEmail });
      }

      const fullName = `${newInvite.firstName || ""} ${newInvite.lastName || ""}`.trim();
      const response = {
        id: newInvite.id,
        organizationId: newInvite.organizationId,
        userId: null,
        invitedEmail: newInvite.email,
        role: newInvite.role as "ADMIN" | "QA_ENGINEER" | "VIEWER",
        status: "PENDING" as const,
        joinedAt: null,
        createdAt: newInvite.createdAt.toISOString(),
        user: fullName ? { id: "", fullName, email: newInvite.email, avatarUrl: null } : null,
      };

      return ResponseService.ok(response, 201, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Update a team member's role (Admin only)
   */
  public static async updateMemberRole(
    userId: string,
    memberId: string,
    input: { role: "ADMIN" | "QA_ENGINEER" | "VIEWER" },
    request?: Request
  ): Promise<NextResponse> {
    try {
      const currentMember = await prisma.organizationMember.findFirst({
        where: { userId, deletedAt: null },
      });

      if (!currentMember || currentMember.role !== "ADMIN") {
        return ResponseService.forbidden(
          "Only organization Admins can change member roles.",
          request
        );
      }

      // Check active member first
      const activeTarget = await prisma.organizationMember.findFirst({
        where: {
          id: memberId,
          organizationId: currentMember.organizationId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (activeTarget) {
        // Prevent demoting last ADMIN
        if (activeTarget.role === "ADMIN" && input.role !== "ADMIN") {
          const adminCount = await prisma.organizationMember.count({
            where: {
              organizationId: currentMember.organizationId,
              role: "ADMIN",
              deletedAt: null,
            },
          });

          if (adminCount <= 1) {
            return ResponseService.badRequest(
              "Cannot demote the last active Admin in the organization.",
              request
            );
          }
        }

        const updated = await prisma.organizationMember.update({
          where: { id: memberId },
          data: {
            role: input.role,
            updatedBy: userId,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        });

        const response = {
          id: updated.id,
          organizationId: updated.organizationId,
          userId: updated.userId,
          invitedEmail: updated.user?.email || "",
          role: updated.role as "ADMIN" | "QA_ENGINEER" | "VIEWER",
          status: "ACTIVE" as const,
          joinedAt: updated.joinedAt ? updated.joinedAt.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
          user: updated.user
            ? {
                id: updated.user.id,
                fullName: `${updated.user.firstName} ${updated.user.lastName}`.trim(),
                email: updated.user.email,
                avatarUrl: updated.user.avatarUrl,
              }
            : null,
        };

        return ResponseService.ok(response, undefined, request);
      }

      // Check pending invite next
      const pendingInvite = await prisma.orgInvite.findFirst({
        where: {
          id: memberId,
          organizationId: currentMember.organizationId,
          deletedAt: null,
        },
      });

      if (pendingInvite) {
        const updatedInvite = await prisma.orgInvite.update({
          where: { id: memberId },
          data: {
            role: input.role,
            updatedBy: userId,
          },
        });

        const response = {
          id: updatedInvite.id,
          organizationId: updatedInvite.organizationId,
          userId: null,
          invitedEmail: updatedInvite.email,
          role: updatedInvite.role as "ADMIN" | "QA_ENGINEER" | "VIEWER",
          status: "PENDING" as const,
          joinedAt: null,
          createdAt: updatedInvite.createdAt.toISOString(),
          user: null,
        };

        return ResponseService.ok(response, undefined, request);
      }

      return ResponseService.notFound("Team member or pending invite not found.", request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Remove a member or cancel an invitation (Admin only)
   */
  public static async removeMember(
    userId: string,
    memberId: string,
    request?: Request
  ): Promise<NextResponse> {
    try {
      const currentMember = await prisma.organizationMember.findFirst({
        where: { userId, deletedAt: null },
      });

      if (!currentMember || currentMember.role !== "ADMIN") {
        return ResponseService.forbidden(
          "Only organization Admins can remove team members.",
          request
        );
      }

      // Check active member first
      const activeTarget = await prisma.organizationMember.findFirst({
        where: {
          id: memberId,
          organizationId: currentMember.organizationId,
          deletedAt: null,
        },
      });

      if (activeTarget) {
        if (activeTarget.role === "ADMIN") {
          const adminCount = await prisma.organizationMember.count({
            where: {
              organizationId: currentMember.organizationId,
              role: "ADMIN",
              deletedAt: null,
            },
          });

          if (adminCount <= 1) {
            return ResponseService.badRequest(
              "Cannot remove the last active Admin in the organization.",
              request
            );
          }
        }

        await prisma.organizationMember.update({
          where: { id: memberId },
          data: {
            deletedAt: new Date(),
            deletedBy: userId,
          },
        });

        return ResponseService.ok({ message: "Member removed successfully" }, undefined, request);
      }

      // Check pending invite next
      const pendingInvite = await prisma.orgInvite.findFirst({
        where: {
          id: memberId,
          organizationId: currentMember.organizationId,
          deletedAt: null,
        },
      });

      if (pendingInvite) {
        await prisma.orgInvite.update({
          where: { id: memberId },
          data: {
            deletedAt: new Date(),
            deletedBy: userId,
          },
        });

        return ResponseService.ok({ message: "Invitation cancelled successfully" }, undefined, request);
      }

      return ResponseService.notFound("Team member or invitation not found.", request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Resend invitation email to a pending team member (Admin only)
   */
  public static async resendInvite(
    userId: string,
    memberId: string,
    request?: Request
  ): Promise<NextResponse> {
    try {
      const currentMember = await prisma.organizationMember.findFirst({
        where: { userId, deletedAt: null },
        include: {
          organization: true,
          user: true,
        },
      });

      if (!currentMember || !currentMember.organization || currentMember.role !== "ADMIN") {
        return ResponseService.forbidden(
          "Only organization Admins can resend member invitations.",
          request
        );
      }

      const pendingInvite = await prisma.orgInvite.findFirst({
        where: {
          id: memberId,
          organizationId: currentMember.organizationId,
          deletedAt: null,
          acceptedAt: null,
        },
      });

      if (!pendingInvite) {
        return ResponseService.notFound("Pending invitation not found.", request);
      }

      const inviterName = currentMember.user
        ? `${currentMember.user.firstName} ${currentMember.user.lastName}`.trim()
        : "An Organization Admin";
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/signup?email=${encodeURIComponent(pendingInvite.email)}&inviteToken=${pendingInvite.token}`;

      const { MailService } = await import("@/lib/mail-service/mail.service");
      await MailService.sendInviteEmail({
        toEmail: pendingInvite.email,
        organizationName: currentMember.organization.name,
        inviterName,
        role: pendingInvite.role as "ADMIN" | "QA_ENGINEER" | "VIEWER",
        inviteUrl,
      });

      return ResponseService.ok(
        { message: `Invitation email resent to ${pendingInvite.email}` },
        undefined,
        request
      );
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }
}

export default OrganizationsService;

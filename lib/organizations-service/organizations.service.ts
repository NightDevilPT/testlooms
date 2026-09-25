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
}

export default OrganizationsService;

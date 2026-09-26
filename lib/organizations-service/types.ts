// ==========================================
// Organizations Service TypeScript Models
// ==========================================

export interface OrganizationDetailsResponse {
	id: string;
	name: string;
	slug: string;
	logoUrl: string | null;
	plan: string;
	userRole: "ADMIN" | "QA_ENGINEER" | "VIEWER";
	joinedAt: string;
	createdById: string | null;
	memberCount: number;
	projectCount: number;
	// Tax & Compliance Registrations
	gstin: string | null;
	pan: string | null;
	cin: string | null;
	// Address Details
	addressLine1: string | null;
	addressLine2: string | null;
	city: string | null;
	state: string | null;
	postalCode: string | null;
	country: string | null;
	// Overview & Contact Info
	website: string | null;
	contactEmail: string | null;
	contactPhone: string | null;
	industry: string | null;
	companySize: string | null;
	createdAt: string;
}

export type MemberRole = "ADMIN" | "QA_ENGINEER" | "VIEWER";
export type MemberStatus = "PENDING" | "ACTIVE" | "REVOKED";

export interface OrganizationMemberResponse {
  id: string;
  organizationId: string;
  userId: string | null;
  invitedEmail: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}


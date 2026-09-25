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

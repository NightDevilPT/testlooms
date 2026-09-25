import type { Metadata } from "next";
import { OrganizationPageComponent } from "@/components/pages/organization";

export const metadata: Metadata = {
  title: "Organization Details - TestLoom",
  description: "View and manage your team organization details, member roles, and workspace profile.",
};

export default function OrganizationPage() {
  return <OrganizationPageComponent />;
}

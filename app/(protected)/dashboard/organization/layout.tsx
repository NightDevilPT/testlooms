import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organization Profile | TestLoom",
  description: "Manage team organization profile, GSTIN/PAN tax compliance, and billing details.",
};

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

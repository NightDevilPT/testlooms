import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Members & Roles | TestLoom",
  description: "Manage team memberships, invitation links, and RBAC permission roles.",
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

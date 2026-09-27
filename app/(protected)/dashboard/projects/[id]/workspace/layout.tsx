import * as React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio Workspace | TestLoom",
  description: "Live test recorder canvas and scenario builder workspace",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}

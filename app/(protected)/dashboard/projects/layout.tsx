import * as React from "react";
import type { Metadata } from "next";
import { ProjectsProvider } from "@/components/context/projects-context";

export const metadata: Metadata = {
  title: "Projects & Workspaces | TestLoom",
  description: "Manage target web application profiles, base execution URLs, and resolution viewports.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <ProjectsProvider>{children}</ProjectsProvider>;
}

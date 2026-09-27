import * as React from "react";
import type { Metadata } from "next";
import { ProjectsProvider } from "@/components/context/projects-context";
import { ScenariosProvider } from "@/components/context/scenarios-context";

export const metadata: Metadata = {
  title: "Test Scenarios | TestLoom",
  description: "Browse, manage, and launch recorded Playwright test scenarios across your web projects.",
};

export default function ScenariosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectsProvider>
      <ScenariosProvider>{children}</ScenariosProvider>
    </ProjectsProvider>
  );
}

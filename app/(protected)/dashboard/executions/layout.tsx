import * as React from "react";
import type { Metadata } from "next";
import { ProjectsProvider } from "@/components/context/projects-context";
import { ExecutionsProvider } from "@/components/context/executions-context";

export const metadata: Metadata = {
  title: "Test Executions | TestLoom",
  description: "Read-only telemetry monitoring dashboard for test runs and replay step logs.",
};

export default function ExecutionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectsProvider>
      <ExecutionsProvider>{children}</ExecutionsProvider>
    </ProjectsProvider>
  );
}

import * as React from "react";
import ProjectDetailsPageComponent from "@/components/pages/project-details";

export const metadata = {
  title: "Project Workspace & Telemetry | TestLoom",
  description: "View project details, recorded scenarios, execution runs, and environment profiles.",
};

export default function ProjectDetailsPage() {
  return <ProjectDetailsPageComponent />;
}

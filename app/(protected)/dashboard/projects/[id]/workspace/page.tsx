import * as React from "react";
import { WorkspacePage as WorkspacePageComponent } from "@/components/pages/workspace";

interface WorkspacePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;
  return <WorkspacePageComponent projectId={id} />;
}

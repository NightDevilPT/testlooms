import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Workflows & Suites | TestLoom",
  description: "Chain test scenarios into ordered end-to-end regression suites.",
};

export default function WorkflowsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

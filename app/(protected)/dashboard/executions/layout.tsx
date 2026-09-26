import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Execution History | TestLoom",
  description: "View live and past test execution runs, logs, screenshots, and telemetry.",
};

export default function ExecutionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

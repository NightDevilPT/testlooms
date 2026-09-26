import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Scenarios | TestLoom",
  description: "Manage automated Playwright test scenarios, steps, and target assertions.",
};

export default function ScenariosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

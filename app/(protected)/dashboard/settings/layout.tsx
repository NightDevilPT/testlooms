import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account & Visual Settings | TestLoom",
  description: "Configure personal profile details, customizable theme modes, and accent colors.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

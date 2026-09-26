import * as React from "react";
import { DashboardPageComponent } from "@/components/pages/dashboard";

export const metadata = {
  title: "Dashboard | TestLoom",
  description: "View real-time telemetry, test execution trends, pass rates, and self-healing selector metrics.",
};

export default function DashboardPage() {
  return <DashboardPageComponent />;
}

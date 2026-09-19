"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/context/theme-context";

export interface RootProvidersProps {
  children: React.ReactNode;
}

/**
 * Global Root Providers Wrapper
 * Composes all global context providers (Theme, Toast, Notifications, State) in one place.
 */
export function RootProviders({ children }: RootProvidersProps) {
  return (
    <ThemeProvider defaultColor="default" defaultMode="dark">
      {children}
    </ThemeProvider>
  );
}

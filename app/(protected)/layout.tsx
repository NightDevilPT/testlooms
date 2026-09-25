import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="grid grid-rows-[64px_1fr] h-screen">
        <AppHeader />
        <ScrollArea className=" p-6 bg-background h-full overflow-auto">
          {children}
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}

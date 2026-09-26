import React from "react";
import { AcceptInviteComponent } from "@/components/pages/accept-invite";

export const metadata = {
  title: "Accept Team Invitation | TestLoom",
  description: "Accept your team invitation to join TestLoom organization workspace.",
};

export default function AcceptInvitePage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <AcceptInviteComponent />
    </div>
  );
}

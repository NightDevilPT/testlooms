// ==========================================
// Organization Team Invitation Email Template
// ==========================================

import { SendInviteEmailInput } from "../types";
import { renderBaseEmailLayout, RenderedTemplate } from "./base.template";

export function renderInviteEmailTemplate(input: SendInviteEmailInput): RenderedTemplate {
  const targetUrl = input.inviteUrl || input.inviteLink || "http://localhost:3000/auth/signup";
  const subject = `You've been invited to join ${input.organizationName} on TestLoom`;
  const expiryDate = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const formattedExpiry = expiryDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const recipientGreeting = input.recipientFirstName ? `Hi ${input.recipientFirstName},` : "Hi there,";

  const bodyHtml = `
    <h1 class="h1">Join ${input.organizationName}</h1>
    <p>${recipientGreeting}</p>
    <p><strong>${input.inviterName}</strong> has invited you to collaborate on automated web testing, Playwright recordings, and visual inspector suites at <strong>${input.organizationName}</strong> as a <strong>${input.role}</strong>.</p>

    <div class="button-wrapper">
      <a href="${targetUrl}" class="button" target="_blank" rel="noopener noreferrer">Accept Invitation & Join Team</a>
    </div>

    <p style="font-size: 13px; color: #a1a1aa;">Or copy and paste this URL into your browser:</p>
    <p class="link-alt"><a href="${targetUrl}" style="color: #818cf8;">${targetUrl}</a></p>
  `;

  const html = renderBaseEmailLayout({
    title: subject,
    badge: "TEAM INVITATION",
    bodyHtml,
    footerText: `This invitation link expires on ${formattedExpiry}.`,
  });

  const text = `You've been invited to join ${input.organizationName} on TestLoom by ${input.inviterName} as a ${input.role}.\n\nAccept your invitation by visiting: ${targetUrl}\n\nLink expires on: ${formattedExpiry}`;

  return {
    subject,
    html,
    text,
  };
}

// ==========================================
// OTP Verification Code Email Template
// ==========================================

import { SendOtpEmailInput } from "../types";
import { renderBaseEmailLayout, RenderedTemplate } from "./base.template";

export function renderOtpEmailTemplate(input: SendOtpEmailInput): RenderedTemplate {
  const purposeTitle =
    input.purpose === "LOGIN"
      ? "One-Time Login Code"
      : input.purpose === "PASSWORD_RESET"
      ? "Password Reset Verification Code"
      : "Email Verification Code";

  const subject = `Your TestLoom ${purposeTitle}: ${input.otpCode}`;
  const expiryMinutes = input.expiresInMinutes || 10;

  const bodyHtml = `
    <h1 class="h1">${purposeTitle}</h1>
    <p style="text-align: center;">Use the following 6-digit verification code to complete your request:</p>
    <div class="otp-box">${input.otpCode}</div>
    <p style="font-size: 13px; color: #a1a1aa; text-align: center;">This code will expire in ${expiryMinutes} minutes. If you did not request this code, please ignore this email.</p>
  `;

  const html = renderBaseEmailLayout({
    title: subject,
    badge: "SECURITY VERIFICATION",
    bodyHtml,
    footerText: "Do not share this verification code with anyone.",
  });

  const text = `Your TestLoom ${purposeTitle} is: ${input.otpCode}\n\nThis code will expire in ${expiryMinutes} minutes.`;

  return {
    subject,
    html,
    text,
  };
}

// ==========================================
// Mail Service TypeScript Interfaces & Types
// ==========================================

export type MailProviderType = "GMAIL" | "SENDGRID" | "RESEND" | "MOCK";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendInviteEmailInput {
  toEmail: string;
  recipientFirstName?: string;
  recipientLastName?: string;
  organizationName: string;
  inviterName: string;
  role: "ADMIN" | "QA_ENGINEER" | "VIEWER";
  inviteLink?: string;
  inviteUrl?: string;
  expiresAt?: string;
}

export interface SendOtpEmailInput {
  toEmail: string;
  otpCode: string;
  purpose: "LOGIN" | "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  expiresInMinutes?: number;
}

export interface IMailProvider {
  name: string;
  sendMail(options: SendMailOptions): Promise<SendMailResult>;
}

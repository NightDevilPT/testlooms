import nodemailer, { Transporter } from "nodemailer";
import { IMailProvider, SendMailOptions, SendMailResult } from "../types";
import { logger } from "@/lib/logger-service/logger.service";

export class GmailMailProvider implements IMailProvider {
  public readonly name = "GMAIL";
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const emailUser = process.env.EMAIL_ID;
    const emailPass = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPass) {
      logger.warn(
        "EMAIL_ID or EMAIL_PASSWORD environment variables are missing. Email sending may fail.",
        "GmailMailProvider"
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  public async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (!this.transporter) {
        return {
          success: false,
          error: "Gmail transporter is not configured. Missing EMAIL_ID or EMAIL_PASSWORD in .env.",
        };
      }

      const defaultFrom = process.env.EMAIL_ID
        ? `TestLoom <${process.env.EMAIL_ID}>`
        : "TestLoom App <no-reply@testloom.io>";

      const info = await this.transporter.sendMail({
        from: options.from || defaultFrom,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });

      logger.info(
        `Email sent successfully. Message ID: ${info.messageId}`,
        "GmailMailProvider"
      );

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error while sending Gmail email";
      logger.error(`Failed to send email: ${errorMessage}`, "GmailMailProvider", error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export default GmailMailProvider;

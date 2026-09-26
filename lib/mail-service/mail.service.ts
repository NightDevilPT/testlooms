import { MailProviderFactory } from "./mail-provider.factory";
import {
  SendInviteEmailInput,
  SendOtpEmailInput,
  SendMailOptions,
  SendMailResult,
  MailProviderType,
} from "./types";
import { renderInviteEmailTemplate } from "./templates/invite.template";
import { renderOtpEmailTemplate } from "./templates/otp.template";

export class MailService {
  /**
   * Send an Organization Invitation Email using the team invitation HTML template
   */
  public static async sendInviteEmail(
    input: SendInviteEmailInput,
    providerType?: MailProviderType
  ): Promise<SendMailResult> {
    const provider = MailProviderFactory.getProvider(providerType);
    const { subject, html, text } = renderInviteEmailTemplate(input);

    return provider.sendMail({
      to: input.toEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send an OTP Verification Code Email using the security verification HTML template
   */
  public static async sendOtpEmail(
    input: SendOtpEmailInput,
    providerType?: MailProviderType
  ): Promise<SendMailResult> {
    const provider = MailProviderFactory.getProvider(providerType);
    const { subject, html, text } = renderOtpEmailTemplate(input);

    return provider.sendMail({
      to: input.toEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Generic Mail Sender wrapper for custom mail options
   */
  public static async sendMail(
    options: SendMailOptions,
    providerType?: MailProviderType
  ): Promise<SendMailResult> {
    const provider = MailProviderFactory.getProvider(providerType);
    return provider.sendMail(options);
  }
}

export default MailService;

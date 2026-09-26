import { IMailProvider, MailProviderType } from "./types";
import { GmailMailProvider } from "./providers/gmail.provider";

export class MailProviderFactory {
  private static instances: Map<string, IMailProvider> = new Map();

  /**
   * Get an instance of a mail provider based on provider type.
   * Defaults to GMAIL or the provider specified in process.env.MAIL_PROVIDER.
   */
  public static getProvider(providerType?: MailProviderType): IMailProvider {
    const type: MailProviderType = (
      providerType ||
      (process.env.MAIL_PROVIDER as MailProviderType) ||
      "GMAIL"
    ).toUpperCase() as MailProviderType;

    if (this.instances.has(type)) {
      return this.instances.get(type)!;
    }

    let provider: IMailProvider;

    switch (type) {
      case "GMAIL":
        provider = new GmailMailProvider();
        break;
      default:
        provider = new GmailMailProvider();
        break;
    }

    this.instances.set(type, provider);
    return provider;
  }
}

export default MailProviderFactory;

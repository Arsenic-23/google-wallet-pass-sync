import { config } from '../config/index.js';
import { IWalletProvider } from './wallet-provider.interface.js';
import { GoogleWalletProvider } from './google-wallet.provider.js';
import { MockWalletProvider } from './mock-wallet.provider.js';

export class WalletProviderFactory {
  private static instance: IWalletProvider;

  public static getProvider(): IWalletProvider {
    if (this.instance) {
      return this.instance;
    }

    if (config.isGoogleWalletConfigured) {
      this.instance = new GoogleWalletProvider({
        issuerId: config.googleWallet.issuerId,
        classId: config.googleWallet.classId,
        issuerName: config.googleWallet.issuerName,
        clientEmail: config.googleWallet.clientEmail!,
        privateKey: config.googleWallet.privateKey!,
        baseUrl: config.baseUrl,
      });
    } else {
      this.instance = new MockWalletProvider();
    }

    return this.instance;
  }

  public static setProvider(provider: IWalletProvider): void {
    this.instance = provider;
  }
}

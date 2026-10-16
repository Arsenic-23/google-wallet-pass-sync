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
      console.log('🚀 Initializing live Google Wallet Provider with provided credentials...');
      this.instance = new GoogleWalletProvider({
        issuerId: config.googleWallet.issuerId,
        classId: config.googleWallet.classId,
        issuerName: config.googleWallet.issuerName,
        clientEmail: config.googleWallet.clientEmail!,
        privateKey: config.googleWallet.privateKey!,
        baseUrl: config.baseUrl,
      });
    } else {
      console.warn(
        '⚠️ Google Wallet credentials not fully configured (missing GOOGLE_WALLET_ISSUER_ID or service account key).'
      );
      console.warn('⚡ Using MockWalletProvider for local testing and UI demonstration.');
      this.instance = new MockWalletProvider();
    }

    return this.instance;
  }

  /**
   * Allows injecting a custom or newly configured provider at runtime
   */
  public static setProvider(provider: IWalletProvider): void {
    this.instance = provider;
  }
}

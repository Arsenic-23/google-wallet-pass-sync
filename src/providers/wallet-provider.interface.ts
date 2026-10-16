export interface CreateWalletPassPayload {
  id: string;
  name: string;
  label: string;
  value: number | string;
}

export interface UpdateWalletPassPayload {
  id: string;
  name: string;
  label: string;
  value: number | string;
}

export interface WalletPassResult {
  saveUrl: string;
  providerPassId: string;
  qrCodeData: string;
}

export interface ProviderHealth {
  ready: boolean;
  providerName: string;
  mode: 'live' | 'mock';
  issuerId?: string;
  classId?: string;
  details?: string;
}

/**
 * Universal Wallet Provider interface.
 * Decouples core business/pass management logic from specific wallet platforms
 * (Google Wallet, Apple Wallet, etc.)
 */
export interface IWalletProvider {
  readonly providerName: string;
  readonly isMock: boolean;
  getHealth(): Promise<ProviderHealth>;
  createPass(payload: CreateWalletPassPayload): Promise<WalletPassResult>;
  updatePass(payload: UpdateWalletPassPayload): Promise<void>;
  getPassDetails?(id: string): Promise<any>;
}

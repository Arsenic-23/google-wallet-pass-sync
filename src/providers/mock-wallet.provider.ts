import {
  IWalletProvider,
  CreateWalletPassPayload,
  UpdateWalletPassPayload,
  WalletPassResult,
  ProviderHealth,
} from './wallet-provider.interface.js';

export class MockWalletProvider implements IWalletProvider {
  readonly providerName = 'mock_google_wallet';
  readonly isMock = true;
  private mockPasses: Map<string, { name: string; label: string; value: number | string }> =
    new Map();

  async getHealth(): Promise<ProviderHealth> {
    return {
      ready: true,
      providerName: this.providerName,
      mode: 'mock',
      details: 'Mock provider active',
    };
  }

  async createPass(payload: CreateWalletPassPayload): Promise<WalletPassResult> {
    this.mockPasses.set(payload.id, {
      name: payload.name,
      label: payload.label,
      value: payload.value,
    });

    const mockToken = Buffer.from(
      JSON.stringify({
        iss: 'mock-service-account@google-wallet-demo.iam.gserviceaccount.com',
        aud: 'google',
        typ: 'savetowallet',
        payload: {
          genericObjects: [
            {
              id: `mock_issuer.${payload.id}`,
              header: payload.name,
              subheader: `${payload.label}: ${payload.value}`,
              textModulesData: [{ header: payload.label, body: String(payload.value) }],
            },
          ],
        },
      })
    ).toString('base64url');

    return {
      saveUrl: `https://pay.google.com/gp/v/save/${mockToken}`,
      providerPassId: `mock_issuer.${payload.id}`,
      qrCodeData: payload.id,
    };
  }

  async updatePass(payload: UpdateWalletPassPayload): Promise<void> {
    const existing = this.mockPasses.get(payload.id);
    if (!existing) {
      throw new Error(`Mock pass with id [${payload.id}] not found`);
    }

    this.mockPasses.set(payload.id, {
      ...existing,
      value: payload.value,
    });
  }

  async getPassDetails(id: string): Promise<any> {
    return this.mockPasses.get(id) || null;
  }
}

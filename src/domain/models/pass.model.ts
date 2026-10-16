export interface PassEntity {
  id: string;
  name: string;
  label: string;
  value: number | string;
  saveUrl: string;
  qrCodeDataUrl?: string;
  walletProvider: string;
  providerPassId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePassDto {
  name: string;
  label: string;
  value: number | string;
}

export interface UpdatePassDto {
  value: number | string;
}

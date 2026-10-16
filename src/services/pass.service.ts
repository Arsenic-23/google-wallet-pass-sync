import crypto from 'crypto';
import QRCode from 'qrcode';
import { IPassRepository } from '../domain/repositories/pass-repository.interface.js';
import { CreatePassDto, PassEntity, UpdatePassDto } from '../domain/models/pass.model.js';
import { IWalletProvider, ProviderHealth } from '../providers/wallet-provider.interface.js';

export function generatePassId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export class PassService {
  constructor(
    private walletProvider: IWalletProvider,
    private passRepository: IPassRepository
  ) {}

  async createPass(dto: CreatePassDto): Promise<PassEntity> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Name is required');
    }
    if (!dto.label || !dto.label.trim()) {
      throw new Error('Label is required');
    }
    if (dto.value === undefined || dto.value === null || dto.value === '') {
      throw new Error('Value/number is required');
    }

    const passId = generatePassId();

    const qrCodeDataUrl = await QRCode.toDataURL(passId, {
      margin: 2,
      width: 280,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });

    const walletResult = await this.walletProvider.createPass({
      id: passId,
      name: dto.name.trim(),
      label: dto.label.trim(),
      value: dto.value,
    });

    const now = new Date().toISOString();
    const passEntity: PassEntity = {
      id: passId,
      name: dto.name.trim(),
      label: dto.label.trim(),
      value: dto.value,
      saveUrl: walletResult.saveUrl,
      qrCodeDataUrl,
      walletProvider: this.walletProvider.providerName,
      providerPassId: walletResult.providerPassId,
      createdAt: now,
      updatedAt: now,
    };

    await this.passRepository.save(passEntity);
    return passEntity;
  }

  async updatePass(id: string, dto: UpdatePassDto): Promise<PassEntity> {
    if (dto.value === undefined || dto.value === null || dto.value === '') {
      throw new Error('Value is required for pass update');
    }

    const pass = await this.passRepository.findById(id);
    if (!pass) {
      throw new Error(`Pass with ID "${id}" was not found`);
    }

    await this.walletProvider.updatePass({
      id: pass.id,
      name: pass.name,
      label: pass.label,
      value: dto.value,
    });

    const updatedPass = await this.passRepository.update(id, {
      value: dto.value,
    });

    if (!updatedPass) {
      throw new Error('Failed to update pass in repository');
    }

    return updatedPass;
  }

  async getPass(id: string): Promise<PassEntity | null> {
    return this.passRepository.findById(id);
  }

  async listPasses(): Promise<PassEntity[]> {
    return this.passRepository.findAll();
  }

  async deletePass(id: string): Promise<boolean> {
    return this.passRepository.delete(id);
  }

  async getProviderStatus(): Promise<ProviderHealth> {
    return this.walletProvider.getHealth();
  }
}

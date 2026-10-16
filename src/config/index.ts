import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

export interface AppConfig {
  port: number;
  baseUrl: string;
  googleWallet: {
    issuerId: string;
    classId: string;
    issuerName: string;
    serviceAccountPath?: string;
    clientEmail?: string;
    privateKey?: string;
    serviceAccountJson?: string;
  };
  isGoogleWalletConfigured: boolean;
}

function resolveServiceAccount(): {
  serviceAccountPath?: string;
  clientEmail?: string;
  privateKey?: string;
} {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      return {
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch {
      console.warn('Could not parse GOOGLE_SERVICE_ACCOUNT_JSON');
    }
  }

  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  const defaultPath = path.resolve(process.cwd(), 'credentials/service-account.json');
  const specifiedPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
    ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : defaultPath;

  if (fs.existsSync(specifiedPath)) {
    try {
      const content = fs.readFileSync(specifiedPath, 'utf8');
      const parsed = JSON.parse(content);
      return {
        serviceAccountPath: specifiedPath,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch {
      console.warn(`Could not parse service account file at: ${specifiedPath}`);
    }
  }

  return {};
}

const serviceAccountData = resolveServiceAccount();
const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID || '';
const hasCredentials = Boolean(
  issuerId && (serviceAccountData.clientEmail && serviceAccountData.privateKey)
);

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  googleWallet: {
    issuerId,
    classId: process.env.GOOGLE_WALLET_CLASS_ID || 'digital_balance_pass',
    issuerName: process.env.GOOGLE_WALLET_ISSUER_NAME || 'Google Wallet Live Demo',
    serviceAccountPath: serviceAccountData.serviceAccountPath,
    clientEmail: serviceAccountData.clientEmail,
    privateKey: serviceAccountData.privateKey,
  },
  isGoogleWalletConfigured: hasCredentials,
};

import { google, walletobjects_v1 } from 'googleapis';
import jwt from 'jsonwebtoken';
import {
  IWalletProvider,
  CreateWalletPassPayload,
  UpdateWalletPassPayload,
  WalletPassResult,
  ProviderHealth,
} from './wallet-provider.interface.js';

export interface GoogleWalletProviderOptions {
  issuerId: string;
  classId: string;
  issuerName: string;
  clientEmail: string;
  privateKey: string;
  baseUrl?: string;
}

export class GoogleWalletProvider implements IWalletProvider {
  readonly providerName = 'google_wallet';
  readonly isMock = false;

  private issuerId: string;
  private classId: string;
  private issuerName: string;
  private clientEmail: string;
  private privateKey: string;
  private baseUrl: string;
  private walletClient: walletobjects_v1.Walletobjects;
  private classEnsured = false;

  constructor(options: GoogleWalletProviderOptions) {
    this.issuerId = options.issuerId;
    this.classId = options.classId;
    this.issuerName = options.issuerName || 'Digital Pass';
    this.clientEmail = options.clientEmail;
    this.privateKey = options.privateKey;
    this.baseUrl = options.baseUrl || 'http://localhost:3000';

    const auth = new google.auth.JWT({
      email: this.clientEmail,
      key: this.privateKey,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });

    this.walletClient = google.walletobjects({
      version: 'v1',
      auth,
    });
  }

  async getHealth(): Promise<ProviderHealth> {
    try {
      const fullClassId = `${this.issuerId}.${this.classId}`;
      let classExists = false;
      try {
        await this.walletClient.genericclass.get({ resourceId: fullClassId });
        classExists = true;
      } catch (err: any) {
        if (err?.code !== 404 && err?.status !== 404) {
          return {
            ready: false,
            providerName: this.providerName,
            mode: 'live',
            issuerId: this.issuerId,
            classId: this.classId,
            details: `Google Wallet API authentication or permission error: ${err.message || err}`,
          };
        }
      }

      return {
        ready: true,
        providerName: this.providerName,
        mode: 'live',
        issuerId: this.issuerId,
        classId: this.classId,
        details: `Connected to Google Wallet API in test mode. Class status: ${
          classExists ? 'Active' : 'Will be automatically initialized on first pass creation'
        }`,
      };
    } catch (err: any) {
      return {
        ready: false,
        providerName: this.providerName,
        mode: 'live',
        issuerId: this.issuerId,
        classId: this.classId,
        details: `Health check failed: ${err.message || err}`,
      };
    }
  }

  /**
   * Ensures the generic pass class exists in Google Wallet Issuer account.
   * If it doesn't exist, it creates it with template overrides for balance display.
   */
  async ensureClassExists(): Promise<void> {
    if (this.classEnsured) return;

    const fullClassId = `${this.issuerId}.${this.classId}`;

    try {
      await this.walletClient.genericclass.get({
        resourceId: fullClassId,
      });
      this.classEnsured = true;
      console.log(`✅ Google Wallet GenericClass [${fullClassId}] already exists.`);
      return;
    } catch (err: any) {
      if (err?.code !== 404 && err?.status !== 404) {
        console.warn(`⚠️ Warning inspecting GenericClass [${fullClassId}]:`, err?.message || err);
      }
    }

    console.log(`🔨 Creating Google Wallet GenericClass [${fullClassId}]...`);
    try {
      const classPayload: walletobjects_v1.Schema$GenericClass = {
        id: fullClassId,
        classTemplateInfo: {
          cardTemplateOverride: {
            cardRowTemplateInfos: [
              {
                twoItems: {
                  startItem: {
                    firstValue: {
                      fields: [
                        {
                          fieldPath: "object.textModulesData['balance_module']",
                        },
                      ],
                    },
                  },
                  endItem: {
                    firstValue: {
                      fields: [
                        {
                          fieldPath: "object.textModulesData['pass_id_module']",
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      };

      await this.walletClient.genericclass.insert({
        requestBody: classPayload,
      });
      this.classEnsured = true;
      console.log(`✅ Google Wallet GenericClass [${fullClassId}] successfully created.`);
    } catch (err: any) {
      if (err?.code === 409 || err?.status === 409) {
        // Already exists
        this.classEnsured = true;
        console.log(`ℹ️ Google Wallet GenericClass [${fullClassId}] already exists (conflict caught).`);
      } else {
        console.error(`❌ Failed to create Google Wallet GenericClass [${fullClassId}]:`, err);
        throw new Error(`Failed to create Google Wallet Class: ${err.message || err}`);
      }
    }
  }

  /**
   * Creates a new Google Wallet pass object and returns the signed save link.
   */
  async createPass(payload: CreateWalletPassPayload): Promise<WalletPassResult> {
    await this.ensureClassExists();

    const fullObjectId = `${this.issuerId}.${payload.id}`;
    const fullClassId = `${this.issuerId}.${this.classId}`;

    const genericObject: walletobjects_v1.Schema$GenericObject = {
      id: fullObjectId,
      classId: fullClassId,
      state: 'ACTIVE',
      cardTitle: {
        defaultValue: {
          language: 'en',
          value: this.issuerName,
        },
      },
      header: {
        defaultValue: {
          language: 'en',
          value: payload.name,
        },
      },
      subheader: {
        defaultValue: {
          language: 'en',
          value: `${payload.label}: ${payload.value}`,
        },
      },
      textModulesData: [
        {
          id: 'balance_module',
          header: payload.label.toUpperCase(),
          body: String(payload.value),
        },
        {
          id: 'pass_id_module',
          header: 'PASS ID',
          body: payload.id,
        },
      ],
      barcode: {
        type: 'QR_CODE',
        value: payload.id,
        alternateText: payload.id,
      },
      hexBackgroundColor: '#1a73e8',
    };

    // Upsert into Google Wallet API
    try {
      console.log(`📤 Inserting pass object [${fullObjectId}] via Google Wallet API...`);
      await this.walletClient.genericobject.insert({
        requestBody: genericObject,
      });
      console.log(`✅ Google Wallet object [${fullObjectId}] inserted successfully.`);
    } catch (err: any) {
      if (err?.code === 409 || err?.status === 409) {
        console.log(`ℹ️ Object [${fullObjectId}] already exists, updating...`);
        await this.walletClient.genericobject.update({
          resourceId: fullObjectId,
          requestBody: genericObject,
        });
      } else {
        console.error(`❌ Google Wallet genericobject.insert error:`, err?.response?.data || err);
        throw new Error(
          `Google Wallet API object creation failed: ${err?.response?.data?.error?.message || err.message}`
        );
      }
    }

    // Generate signed JWT for "Save to Google Wallet" button
    const origins = [
      this.baseUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://pay.google.com',
    ];

    const claims = {
      iss: this.clientEmail,
      aud: 'google',
      origins,
      typ: 'savetowallet',
      payload: {
        genericObjects: [genericObject],
      },
    };

    const token = jwt.sign(claims, this.privateKey, { algorithm: 'RS256' });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return {
      saveUrl,
      providerPassId: fullObjectId,
      qrCodeData: payload.id,
    };
  }

  /**
   * Updates an existing Google Wallet pass object live.
   * Modifies the value and text modules, triggering push notification update on Android phone.
   */
  async updatePass(payload: UpdateWalletPassPayload): Promise<void> {
    const fullObjectId = `${this.issuerId}.${payload.id}`;

    console.log(`🔄 Updating Google Wallet pass [${fullObjectId}] with value: ${payload.value}...`);

    try {
      await this.walletClient.genericobject.patch({
        resourceId: fullObjectId,
        requestBody: {
          subheader: {
            defaultValue: {
              language: 'en',
              value: `${payload.label}: ${payload.value}`,
            },
          },
          textModulesData: [
            {
              id: 'balance_module',
              header: payload.label.toUpperCase(),
              body: String(payload.value),
            },
            {
              id: 'pass_id_module',
              header: 'PASS ID',
              body: payload.id,
            },
          ],
        },
      });

      console.log(`🚀 Live update dispatched successfully to Google Wallet for [${fullObjectId}]!`);
    } catch (err: any) {
      console.error(`❌ Google Wallet genericobject.patch failed:`, err?.response?.data || err);
      throw new Error(
        `Failed to update pass on Google Wallet API: ${
          err?.response?.data?.error?.message || err.message
        }`
      );
    }
  }

  async getPassDetails(id: string): Promise<any> {
    const fullObjectId = `${this.issuerId}.${id}`;
    const res = await this.walletClient.genericobject.get({
      resourceId: fullObjectId,
    });
    return res.data;
  }
}

import { config } from '../src/config/index.js';
import { GoogleWalletProvider } from '../src/providers/google-wallet.provider.js';

async function validate() {
  console.log('Checking configuration...');
  console.log('Port:', config.port);
  console.log('Issuer ID:', config.googleWallet.issuerId);
  console.log('Class ID:', config.googleWallet.classId);
  console.log('Client Email:', config.googleWallet.clientEmail);
  console.log('Is Google Wallet Configured:', config.isGoogleWalletConfigured);

  if (!config.isGoogleWalletConfigured) {
    console.error('Configuration missing or incomplete.');
    process.exit(1);
  }

  const provider = new GoogleWalletProvider({
    issuerId: config.googleWallet.issuerId,
    classId: config.googleWallet.classId,
    issuerName: config.googleWallet.issuerName,
    clientEmail: config.googleWallet.clientEmail!,
    privateKey: config.googleWallet.privateKey!,
    baseUrl: config.baseUrl,
  });

  const health = await provider.getHealth();
  console.log('Health status:', health);

  try {
    await provider.ensureClassExists();
    console.log('Pass class verified successfully.');
  } catch (err: any) {
    console.error('ensureClassExists error:', err.message || err);
    process.exit(1);
  }

  try {
    const testResult = await provider.createPass({
      id: `test_pass_${Date.now()}`,
      name: 'Test User',
      label: 'Balance',
      value: 40,
    });
    console.log('Pass object created successfully.');
    console.log('Provider Pass ID:', testResult.providerPassId);

    await provider.updatePass({
      id: testResult.providerPassId.replace(`${config.googleWallet.issuerId}.`, ''),
      name: 'Test User',
      label: 'Balance',
      value: 55,
    });
    console.log('Pass update successful.');
  } catch (err: any) {
    console.error('Error creating or updating pass:', err.message || err);
    process.exit(1);
  }

  console.log('Google Wallet validation completed successfully.');
}

validate().catch((err) => {
  console.error('Validation error:', err);
  process.exit(1);
});


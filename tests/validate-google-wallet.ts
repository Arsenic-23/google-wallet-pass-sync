import { config } from '../src/config/index.js';
import { GoogleWalletProvider } from '../src/providers/google-wallet.provider.js';

async function validate() {
  console.log('🔍 Validating Google Wallet API Credentials & Permissions...\n');
  console.log('1. Checking configuration:');
  console.log('   - Port:', config.port);
  console.log('   - Issuer ID:', config.googleWallet.issuerId);
  console.log('   - Class ID:', config.googleWallet.classId);
  console.log('   - Client Email:', config.googleWallet.clientEmail);
  console.log('   - Has Private Key:', Boolean(config.googleWallet.privateKey));
  console.log('   - Is Google Wallet Configured:', config.isGoogleWalletConfigured);

  if (!config.isGoogleWalletConfigured) {
    console.error('❌ Configuration missing or incomplete.');
    process.exit(1);
  }

  console.log('\n2. Initializing GoogleWalletProvider...');
  const provider = new GoogleWalletProvider({
    issuerId: config.googleWallet.issuerId,
    classId: config.googleWallet.classId,
    issuerName: config.googleWallet.issuerName,
    clientEmail: config.googleWallet.clientEmail!,
    privateKey: config.googleWallet.privateKey!,
    baseUrl: config.baseUrl,
  });

  console.log('\n3. Performing Google Wallet API Health Check...');
  const health = await provider.getHealth();
  console.log('   Health Status:', health);

  console.log('\n4. Testing Pass Class Creation/Inspection (ensureClassExists)...');
  try {
    await provider.ensureClassExists();
    console.log('   ✅ Pass Class verified/created successfully!');
  } catch (err: any) {
    console.error('   ❌ ensureClassExists error:', err.message || err);
    console.log('\n💡 Note: If you get a 401 or 403 error, ensure you have invited wallet-issuer@studiox-b8f20.iam.gserviceaccount.com as a Developer/Admin in the Google Pay & Wallet Console (under Users).');
    process.exit(1);
  }

  console.log('\n5. Testing Pass Object Creation...');
  try {
    const testResult = await provider.createPass({
      id: `test_pass_${Date.now()}`,
      name: 'Verification User',
      label: 'Balance',
      value: 40,
    });
    console.log('   ✅ Pass Object created successfully!');
    console.log('   Provider Pass ID:', testResult.providerPassId);
    console.log('   Save URL generated:', testResult.saveUrl.substring(0, 80) + '...');

    console.log('\n6. Testing Live Update (PATCH)...');
    await provider.updatePass({
      id: testResult.providerPassId.replace(`${config.googleWallet.issuerId}.`, ''),
      name: 'Verification User',
      label: 'Balance',
      value: 55,
    });
    console.log('   ✅ Live Update (PATCH) succeeded! Google Wallet API accepted new value 55.');
  } catch (err: any) {
    console.error('   ❌ Error testing pass creation/update:', err.message || err);
    process.exit(1);
  }

  console.log('\n🎉 ALL GOOGLE WALLET API VALIDATIONS PASSED PERFECTLY!\n');
}

validate().catch((err) => {
  console.error('Fatal validation error:', err);
  process.exit(1);
});

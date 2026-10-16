import assert from 'assert';
import { createApp } from '../src/server.js';
import { FilePassRepository } from '../src/domain/repositories/file-pass.repository.js';
import { MockWalletProvider } from '../src/providers/mock-wallet.provider.js';
import { PassService } from '../src/services/pass.service.js';

async function runTests() {
  console.log('🧪 Starting automated tests for Google Wallet Digital Pass application...\n');

  // Test 1: Service Layer Pass Creation & Live Update
  console.log('Test 1: Testing PassService creation and update logic...');
  const mockProvider = new MockWalletProvider();
  const repo = new FilePassRepository('data/test-passes');
  const service = new PassService(mockProvider, repo);

  const initialPass = await service.createPass({
    name: 'John Doe',
    label: 'Balance',
    value: 40,
  });

  assert.match(initialPass.id, /^[2-9A-Z]{4}-[2-9A-Z]{4}$/, 'Pass ID must follow XXXX-XXXX format');
  assert.strictEqual(initialPass.name, 'John Doe');
  assert.strictEqual(initialPass.label, 'Balance');
  assert.strictEqual(initialPass.value, 40);
  assert.ok(initialPass.saveUrl.includes('https://pay.google.com/gp/v/save/'), 'Must have signed Save link');
  assert.ok(initialPass.qrCodeDataUrl?.startsWith('data:image/png;base64,'), 'Must generate QR code data URL');
  console.log('  ✅ Pass successfully created with unique ID:', initialPass.id);

  // Live update test (POST /passes/:id equivalent)
  console.log('Test 2: Testing live update from value 40 to 55...');
  const updatedPass = await service.updatePass(initialPass.id, { value: 55 });

  assert.strictEqual(updatedPass.id, initialPass.id, 'ID must remain identical');
  assert.strictEqual(updatedPass.value, 55, 'Value must be updated to 55');
  assert.strictEqual(updatedPass.name, 'John Doe', 'Holder name must be preserved');
  assert.strictEqual(updatedPass.label, 'Balance', 'Label must be preserved');
  console.log('  ✅ Pass value successfully updated to:', updatedPass.value);

  // Test 3: Express HTTP Server Integration
  console.log('\nTest 3: Testing Express endpoints via createApp()...');
  const { app } = createApp();

  // Test create pass via Express request simulation
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // POST /passes
    const createRes = await fetch(`${baseUrl}/passes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Smith',
        label: 'Reward Points',
        value: 100,
      }),
    });

    assert.strictEqual(createRes.status, 201, 'POST /passes should return 201');
    const createJson = await createRes.json();
    assert.strictEqual(createJson.success, true);
    assert.strictEqual(createJson.pass.name, 'Jane Smith');
    assert.strictEqual(createJson.pass.value, 100);
    const passId = createJson.pass.id;
    console.log('  ✅ POST /passes returned 201 with passId:', passId);

    // POST /passes/:id (Core update endpoint requirement!)
    const updateRes = await fetch(`${baseUrl}/passes/${passId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: 55,
      }),
    });

    assert.strictEqual(updateRes.status, 200, 'POST /passes/:id should return 200');
    const updateJson = await updateRes.json();
    assert.strictEqual(updateJson.success, true);
    assert.strictEqual(updateJson.pass.value, 55, 'Updated pass value must be 55');
    console.log('  ✅ POST /passes/:id returned 200 with new value 55');

    // GET /passes/:id
    const getRes = await fetch(`${baseUrl}/passes/${passId}`);
    assert.strictEqual(getRes.status, 200);
    const getJson = await getRes.json();
    assert.strictEqual(getJson.pass.value, 55);
    console.log('  ✅ GET /passes/:id confirmed persistent updated value of 55');

    // GET /api/status
    const statusRes = await fetch(`${baseUrl}/api/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusJson = await statusRes.json();
    assert.ok(statusJson.health, 'Status endpoint must return provider health');
    console.log('  ✅ GET /api/status returned provider health status');
  } finally {
    server.close();
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});

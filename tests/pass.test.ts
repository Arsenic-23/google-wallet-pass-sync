import assert from 'assert';
import { createApp } from '../src/server.js';
import { FilePassRepository } from '../src/domain/repositories/file-pass.repository.js';
import { MockWalletProvider } from '../src/providers/mock-wallet.provider.js';
import { PassService } from '../src/services/pass.service.js';

async function runTests() {
  const mockProvider = new MockWalletProvider();
  const repo = new FilePassRepository('data/test-passes');
  const service = new PassService(mockProvider, repo);

  const initialPass = await service.createPass({
    name: 'Alex Morgan',
    label: 'Balance',
    value: 40,
  });

  assert.match(initialPass.id, /^[2-9A-Z]{4}-[2-9A-Z]{4}$/);
  assert.strictEqual(initialPass.name, 'Alex Morgan');
  assert.strictEqual(initialPass.label, 'Balance');
  assert.strictEqual(initialPass.value, 40);
  assert.ok(initialPass.saveUrl.includes('https://pay.google.com/gp/v/save/'));
  assert.ok(initialPass.qrCodeDataUrl?.startsWith('data:image/png;base64,'));

  const updatedPass = await service.updatePass(initialPass.id, { value: 55 });

  assert.strictEqual(updatedPass.id, initialPass.id);
  assert.strictEqual(updatedPass.value, 55);
  assert.strictEqual(updatedPass.name, 'Alex Morgan');
  assert.strictEqual(updatedPass.label, 'Balance');

  const { app } = createApp();

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const createRes = await fetch(`${baseUrl}/passes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Lee',
        label: 'Reward Points',
        value: 100,
      }),
    });

    assert.strictEqual(createRes.status, 201);
    const createJson = await createRes.json();
    assert.strictEqual(createJson.success, true);
    assert.strictEqual(createJson.pass.name, 'Jordan Lee');
    assert.strictEqual(createJson.pass.value, 100);
    const passId = createJson.pass.id;

    const updateRes = await fetch(`${baseUrl}/passes/${passId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: 55,
      }),
    });

    assert.strictEqual(updateRes.status, 200);
    const updateJson = await updateRes.json();
    assert.strictEqual(updateJson.success, true);
    assert.strictEqual(updateJson.pass.value, 55);

    const getRes = await fetch(`${baseUrl}/passes/${passId}`);
    assert.strictEqual(getRes.status, 200);
    const getJson = await getRes.json();
    assert.strictEqual(getJson.pass.value, 55);

    const statusRes = await fetch(`${baseUrl}/api/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusJson = await statusRes.json();
    assert.ok(statusJson.health);
  } finally {
    server.close();
  }

  console.log('All tests passed.');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

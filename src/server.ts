import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { FilePassRepository } from './domain/repositories/file-pass.repository.js';
import { WalletProviderFactory } from './providers/wallet-provider.factory.js';
import { PassService } from './services/pass.service.js';
import { PassController } from './controllers/pass.controller.js';
import { createPassRoutes } from './routes/pass.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Dependency Injection
  const passRepository = new FilePassRepository();
  const walletProvider = WalletProviderFactory.getProvider();
  const passService = new PassService(walletProvider, passRepository);
  const passController = new PassController(passService);

  // Mount pass routes
  const passRoutes = createPassRoutes(passController);
  app.use(passRoutes);

  // Serve static assets from public/
  const publicDir = path.resolve(__dirname, '../public');
  app.use(express.static(publicDir));

  // Fallback to index.html for SPA-like navigation
  app.use((_req, res, next) => {
    const indexPath = path.join(publicDir, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  });

  return { app, passService, walletProvider };
}

export function startServer() {
  const { app, walletProvider } = createApp();

  const server = app.listen(config.port, async () => {
    console.log('\n========================================================');
    console.log(`🚀 Digital Pass Server running at: http://localhost:${config.port}`);
    console.log(`📁 Static UI served from: public/`);
    console.log(`⚡ Wallet Provider: ${walletProvider.providerName.toUpperCase()}`);

    try {
      const health = await walletProvider.getHealth();
      if (health.mode === 'live') {
        console.log(`🟢 Google Wallet Live Mode ACTIVE`);
        console.log(`   Issuer ID: ${health.issuerId}`);
        console.log(`   Class ID:  ${health.classId}`);
      } else {
        console.log(`🟡 Demo/Mock Mode ACTIVE (Credentials not provided)`);
        console.log(`   ${health.details}`);
      }
    } catch (e: any) {
      console.warn(`⚠️ Health check error:`, e.message);
    }

    console.log('========================================================\n');
  });

  return server;
}

// Automatically start if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer();
}

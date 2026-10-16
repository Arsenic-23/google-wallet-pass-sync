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

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const passRepository = new FilePassRepository();
  const walletProvider = WalletProviderFactory.getProvider();
  const passService = new PassService(walletProvider, passRepository);
  const passController = new PassController(passService);

  const passRoutes = createPassRoutes(passController);
  app.use(passRoutes);

  const publicDir = path.resolve(__dirname, '../public');
  app.use(express.static(publicDir));

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
    console.log(`Server listening on port ${config.port}`);
    console.log(`Provider: ${walletProvider.providerName}`);
    try {
      const health = await walletProvider.getHealth();
      if (health.mode === 'live') {
        console.log(`Google Wallet API active for issuer: ${health.issuerId}`);
      }
    } catch (e: any) {
      console.warn('Health check error:', e.message);
    }
  });

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer();
}

import { Router } from 'express';
import { PassController } from '../controllers/pass.controller.js';

export function createPassRoutes(controller: PassController): Router {
  const router = Router();

  router.post('/passes', controller.createPass);
  router.post('/passes/:id', controller.updatePass);
  router.patch('/passes/:id', controller.updatePass);
  router.put('/passes/:id', controller.updatePass);
  router.get('/passes/:id', controller.getPass);
  router.get('/passes', controller.listPasses);
  router.get('/api/status', controller.getStatus);

  return router;
}

import { Request, Response } from 'express';
import { PassService } from '../services/pass.service.js';

export class PassController {
  constructor(private passService: PassService) {}

  createPass = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, label, value } = req.body;

      if (!name || !label || value === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, label, and value are required.',
        });
        return;
      }

      const pass = await this.passService.createPass({ name, label, value });

      res.status(201).json({
        success: true,
        message: 'Pass created successfully',
        pass,
      });
    } catch (err: any) {
      console.error('Error creating pass:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to create pass',
      });
    }
  };

  updatePass = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { value } = req.body;

      if (value === undefined || value === null) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: value is required.',
        });
        return;
      }

      const updatedPass = await this.passService.updatePass(id, { value });

      res.status(200).json({
        success: true,
        message: `Pass ${id} updated successfully`,
        pass: updatedPass,
      });
    } catch (err: any) {
      console.error(`Error updating pass ${req.params.id}:`, err);

      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: err.message || 'Failed to update pass',
      });
    }
  };

  getPass = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const pass = await this.passService.getPass(id);

      if (!pass) {
        res.status(404).json({
          success: false,
          error: `Pass with id "${id}" not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        pass,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to retrieve pass',
      });
    }
  };

  listPasses = async (_req: Request, res: Response): Promise<void> => {
    try {
      const passes = await this.passService.listPasses();
      res.status(200).json({
        success: true,
        passes,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to list passes',
      });
    }
  };

  getStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.passService.getProviderStatus();
      res.status(200).json({
        success: true,
        health,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  };
}

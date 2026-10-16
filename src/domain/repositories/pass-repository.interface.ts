import { PassEntity } from '../models/pass.model.js';

export interface IPassRepository {
  findById(id: string): Promise<PassEntity | null>;
  findAll(): Promise<PassEntity[]>;
  save(pass: PassEntity): Promise<PassEntity>;
  update(id: string, updates: Partial<PassEntity>): Promise<PassEntity | null>;
  delete(id: string): Promise<boolean>;
}

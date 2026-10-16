import fs from 'fs';
import path from 'path';
import { PassEntity } from '../models/pass.model.js';
import { IPassRepository } from './pass-repository.interface.js';

export class FilePassRepository implements IPassRepository {
  private passes: Map<string, PassEntity> = new Map();
  private filePath: string;

  constructor(storageDir = 'data') {
    const dir = path.resolve(process.cwd(), storageDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.filePath = path.join(dir, 'passes.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const list: PassEntity[] = JSON.parse(raw);
        for (const pass of list) {
          this.passes.set(pass.id, pass);
        }
      } catch (err) {
        console.warn('Could not load passes from disk:', err);
      }
    }
  }

  private persistToDisk(): void {
    try {
      const list = Array.from(this.passes.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist passes to disk:', err);
    }
  }

  async findById(id: string): Promise<PassEntity | null> {
    return this.passes.get(id) || null;
  }

  async findAll(): Promise<PassEntity[]> {
    return Array.from(this.passes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async save(pass: PassEntity): Promise<PassEntity> {
    this.passes.set(pass.id, pass);
    this.persistToDisk();
    return pass;
  }

  async update(id: string, updates: Partial<PassEntity>): Promise<PassEntity | null> {
    const existing = this.passes.get(id);
    if (!existing) return null;

    const updated: PassEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.passes.set(id, updated);
    this.persistToDisk();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.passes.delete(id);
    if (deleted) {
      this.persistToDisk();
    }
    return deleted;
  }
}

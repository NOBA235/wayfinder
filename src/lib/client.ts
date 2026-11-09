import type { SavedPath, IProcedureRepository } from './repository/types';
import { defaultRepository } from './repository/factory';

export interface IWayfinderClient {
  savePath(path: SavedPath): Promise<SavedPath>;
  listSavedPaths(studentName?: string): Promise<SavedPath[]>;
  getSavedPath(pathId: string): Promise<SavedPath | null>;
  saveCounselorNote(pathId: string, note: string): Promise<SavedPath>;
  deleteSavedPath(pathId: string): Promise<boolean>;
}

export class WayfinderClient implements IWayfinderClient {
  constructor(private readonly repo: IProcedureRepository = defaultRepository) {}

  async savePath(path: SavedPath): Promise<SavedPath> {
    return this.repo.savePath(path);
  }

  async listSavedPaths(studentName?: string): Promise<SavedPath[]> {
    return this.repo.listPathsForUser(studentName);
  }

  async getSavedPath(pathId: string): Promise<SavedPath | null> {
    return this.repo.getPath(pathId);
  }

  async saveCounselorNote(pathId: string, note: string): Promise<SavedPath> {
    return this.repo.saveCounselorNote(pathId, note);
  }

  async deleteSavedPath(pathId: string): Promise<boolean> {
    return this.repo.deletePath(pathId);
  }
}

export const wayfinderClient = new WayfinderClient();

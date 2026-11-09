import type { IProcedureRepository, SavedPath } from './types';
import type { Procedure } from '../../types/procedure';

const STORAGE_KEY = 'wayfinder_saved_paths';

// Fallback in-memory store for server-side testing / Vitest environments without window.localStorage
const memoryStore = new Map<string, SavedPath>();
const memoryProcedures = new Map<string, Procedure>();

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readAllPaths(): SavedPath[] {
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SavedPath[];
    } catch (err) {
      console.warn('Failed to parse localStorage saved paths:', err);
      return [];
    }
  }
  return Array.from(memoryStore.values());
}

function writeAllPaths(paths: SavedPath[]): void {
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
    } catch (err) {
      console.error('Failed to write to localStorage:', err);
    }
  } else {
    memoryStore.clear();
    paths.forEach((p) => memoryStore.set(p.id, p));
  }
}

export class LocalStorageRepository implements IProcedureRepository {
  async savePath(savedPath: SavedPath): Promise<SavedPath> {
    const existing = readAllPaths();
    const index = existing.findIndex((p) => p.id === savedPath.id);

    const now = new Date().toISOString();
    const pathWithTimestamps: SavedPath = {
      ...savedPath,
      updatedAt: now,
      createdAt: savedPath.createdAt || now,
    };

    if (index !== -1) {
      existing[index] = pathWithTimestamps;
    } else {
      existing.unshift(pathWithTimestamps);
    }

    writeAllPaths(existing);
    return pathWithTimestamps;
  }

  async listPathsForUser(studentName?: string): Promise<SavedPath[]> {
    const all = readAllPaths();
    if (!studentName || studentName.trim().length === 0) {
      return all;
    }
    const query = studentName.toLowerCase();
    return all.filter((p) => p.studentName.toLowerCase().includes(query));
  }

  async getPath(pathId: string): Promise<SavedPath | null> {
    const all = readAllPaths();
    const found = all.find((p) => p.id === pathId);
    return found || null;
  }

  async saveProcedure(procedure: Procedure): Promise<void> {
    memoryProcedures.set(procedure.procedure_id, procedure);
    if (isBrowser()) {
      try {
        window.localStorage.setItem(
          `wayfinder_proc_${procedure.procedure_id}`,
          JSON.stringify(procedure)
        );
      } catch (err) {
        console.warn('Could not cache procedure in localStorage:', err);
      }
    }
  }

  async getProcedure(id: string): Promise<Procedure | null> {
    if (memoryProcedures.has(id)) {
      return memoryProcedures.get(id) || null;
    }

    if (isBrowser()) {
      try {
        const cached = window.localStorage.getItem(`wayfinder_proc_${id}`);
        if (cached) return JSON.parse(cached) as Procedure;

        // Fetch from static JSON
        const res = await fetch(`/graphs/${id}.json`);
        if (res.ok) {
          const json = await res.json();
          return json as unknown as Procedure;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  async saveCounselorNote(pathId: string, note: string): Promise<SavedPath> {
    const all = readAllPaths();
    const target = all.find((p) => p.id === pathId);

    if (!target) {
      throw new Error(`Saved path with ID "${pathId}" not found.`);
    }

    const notes = target.counselorNotes || [];
    notes.push(note);

    const updated: SavedPath = {
      ...target,
      counselorNote: note,
      counselorNotes: notes,
      updatedAt: new Date().toISOString(),
    };

    const index = all.findIndex((p) => p.id === pathId);
    all[index] = updated;
    writeAllPaths(all);

    return updated;
  }

  async deletePath(pathId: string): Promise<boolean> {
    const all = readAllPaths();
    const filtered = all.filter((p) => p.id !== pathId);
    if (filtered.length !== all.length) {
      writeAllPaths(filtered);
      return true;
    }
    return false;
  }
}

export const localRepository = new LocalStorageRepository();

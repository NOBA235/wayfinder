import type { IProcedureRepository, SavedPath } from './types';
import type { Procedure } from '../../types/procedure';
import { localRepository } from './localRepository';

/**
 * Implementation B: REST / Momen Backend Adapter
 *
 * PRODUCTION ARCHITECTURE NOTE (MOMEN INTEGRATION):
 * In production, Momen provides a scalable, zero-maintenance PostgreSQL backend with
 * visual schema modeling and role-based access control (students vs counselors).
 *
 * Momen Data Model:
 *  - Entity `SavedPath`:
 *      id (UUID), procedure_id (string), procedure_title (string),
 *      institution (string), student_name (string),
 *      selected_step_ids (JSON array), counselor_notes (JSON array),
 *      created_at (timestamp), updated_at (timestamp)
 *
 * This adapter issues standard RESTful API calls to the Momen or Express service
 * under `/api/paths` and `/api/procedures`. If the backend service is offline,
 * it gracefully falls back to local storage so the demo never fails.
 */
export class RestRepository implements IProcedureRepository {
  constructor(private readonly baseUrl: string = '/api') {}

  async savePath(savedPath: SavedPath): Promise<SavedPath> {
    try {
      const res = await fetch(`${this.baseUrl}/paths`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedPath),
      });
      if (res.ok) {
        return (await res.json()) as SavedPath;
      }
    } catch {
      // Graceful fallback to local repository
    }
    return localRepository.savePath(savedPath);
  }

  async listPathsForUser(studentName?: string): Promise<SavedPath[]> {
    try {
      const url = studentName
        ? `${this.baseUrl}/paths?student=${encodeURIComponent(studentName)}`
        : `${this.baseUrl}/paths`;
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as SavedPath[];
      }
    } catch {
      // Graceful fallback
    }
    return localRepository.listPathsForUser(studentName);
  }

  async getPath(pathId: string): Promise<SavedPath | null> {
    try {
      const res = await fetch(`${this.baseUrl}/paths/${encodeURIComponent(pathId)}`);
      if (res.ok) {
        return (await res.json()) as SavedPath;
      }
    } catch {
      // Graceful fallback
    }
    return localRepository.getPath(pathId);
  }

  async saveProcedure(procedure: Procedure): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/procedures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(procedure),
      });
    } catch {
      await localRepository.saveProcedure(procedure);
    }
  }

  async getProcedure(id: string): Promise<Procedure | null> {
    try {
      const res = await fetch(`${this.baseUrl}/procedures/${encodeURIComponent(id)}`);
      if (res.ok) {
        return (await res.json()) as Procedure;
      }
    } catch {
      // Graceful fallback
    }
    return localRepository.getProcedure(id);
  }

  async saveCounselorNote(pathId: string, note: string): Promise<SavedPath> {
    try {
      const res = await fetch(`${this.baseUrl}/paths/${encodeURIComponent(pathId)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        return (await res.json()) as SavedPath;
      }
    } catch {
      // Graceful fallback
    }
    return localRepository.saveCounselorNote(pathId, note);
  }

  async deletePath(pathId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/paths/${encodeURIComponent(pathId)}`, {
        method: 'DELETE',
      });
      if (res.ok) return true;
    } catch {
      // Graceful fallback
    }
    return localRepository.deletePath(pathId);
  }
}

export const restRepository = new RestRepository();

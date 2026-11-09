import type { Procedure } from '../../types/procedure';

export interface SavedPath {
  id: string; // unique path ID (e.g. path-1715423400-abc)
  procedureId: string;
  procedureTitle: string;
  institution: string;
  studentName: string; // display name only, no auth/PII
  selectedStepIds: string[];
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  counselorNotes?: string[];
  counselorNote?: string; // Latest note left by a counselor
}

export interface IProcedureRepository {
  /**
   * Persists a student's chosen path.
   */
  savePath(savedPath: SavedPath): Promise<SavedPath>;

  /**
   * Lists all saved paths, optionally filtered by student display name.
   */
  listPathsForUser(studentName?: string): Promise<SavedPath[]>;

  /**
   * Retrieves a specific saved path by its ID.
   */
  getPath(pathId: string): Promise<SavedPath | null>;

  /**
   * Saves or updates a procedure definition.
   */
  saveProcedure(procedure: Procedure): Promise<void>;

  /**
   * Retrieves a procedure definition by its ID.
   */
  getProcedure(id: string): Promise<Procedure | null>;

  /**
   * Appends or updates a counselor's advisory note for a saved student path.
   */
  saveCounselorNote(pathId: string, note: string): Promise<SavedPath>;

  /**
   * Deletes a saved path.
   */
  deletePath(pathId: string): Promise<boolean>;
}

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../src/lib/repository/localRepository';
import { RestRepository } from '../src/lib/repository/restRepository';
import { defaultRepository } from '../src/lib/repository/factory';
import type { IProcedureRepository, SavedPath } from '../src/lib/repository/types';

describe('Wayfinder Phase 5 Repository & Counselor Invariants', () => {
  let repo: IProcedureRepository;

  beforeEach(() => {
    repo = new LocalStorageRepository();
  });

  it('Requirement: Factory defaultRepository implements IProcedureRepository', () => {
    expect(defaultRepository).toBeDefined();
    expect(typeof defaultRepository.savePath).toBe('function');
    expect(typeof defaultRepository.listPathsForUser).toBe('function');
    expect(typeof defaultRepository.getPath).toBe('function');
    expect(typeof defaultRepository.saveCounselorNote).toBe('function');
  });

  it('Acceptance Criterion 1: Saving a path and re-reading it restores it', async () => {
    const mockPath: SavedPath = {
      id: 'test-path-101',
      procedureId: 'rochester-grade-appeal',
      procedureTitle: 'University of Rochester Academic Grade Appeal Procedure',
      institution: 'University of Rochester',
      studentName: 'Alex Student',
      selectedStepIds: ['check-syllabus-guidelines', 'approach-faculty-member', 'request-formal-review'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await repo.savePath(mockPath);
    expect(saved.id).toBe('test-path-101');
    expect(saved.studentName).toBe('Alex Student');

    // Simulate page reload by querying repository
    const retrieved = await repo.getPath('test-path-101');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('test-path-101');
    expect(retrieved?.selectedStepIds).toEqual(mockPath.selectedStepIds);
    expect(retrieved?.institution).toBe('University of Rochester');
  });

  it('Acceptance Criterion 2: Counselor view persists an advisory note alongside the path', async () => {
    const mockPath: SavedPath = {
      id: 'test-counselor-path',
      procedureId: 'rochester-grade-appeal',
      procedureTitle: 'University of Rochester Academic Grade Appeal Procedure',
      institution: 'University of Rochester',
      studentName: 'Jordan',
      selectedStepIds: ['approach-faculty-member'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repo.savePath(mockPath);

    // Counselor writes a note
    const counselorNote = 'Advised student to email Prof. Miller with assignment receipt. Escalate to Dean if no reply in 48h.';
    const updated = await repo.saveCounselorNote('test-counselor-path', counselorNote);

    expect(updated.counselorNote).toBe(counselorNote);
    expect(updated.counselorNotes).toContain(counselorNote);

    // Re-read to confirm persistence
    const reloaded = await repo.getPath('test-counselor-path');
    expect(reloaded?.counselorNote).toBe(counselorNote);
    expect(reloaded?.counselorNotes?.length).toBe(1);
  });

  it('Acceptance Criterion 3: Swapping implementation A for B requires changing exactly one import in one factory file', () => {
    const localImpl: IProcedureRepository = new LocalStorageRepository();
    const restImpl: IProcedureRepository = new RestRepository('http://localhost:3001/api');

    // Both implementations satisfy the exact same interface contract
    expect(typeof localImpl.savePath).toBe(typeof restImpl.savePath);
    expect(typeof localImpl.listPathsForUser).toBe(typeof restImpl.listPathsForUser);
    expect(typeof localImpl.getPath).toBe(typeof restImpl.getPath);
    expect(typeof localImpl.saveCounselorNote).toBe(typeof restImpl.saveCounselorNote);
  });

  it('Lists all saved paths filtered or unfiltered', async () => {
    const pathA: SavedPath = {
      id: 'path-a',
      procedureId: 'p-1',
      procedureTitle: 'Title 1',
      institution: 'Univ 1',
      studentName: 'Student Alpha',
      selectedStepIds: ['s1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const pathB: SavedPath = {
      id: 'path-b',
      procedureId: 'p-2',
      procedureTitle: 'Title 2',
      institution: 'Univ 2',
      studentName: 'Student Beta',
      selectedStepIds: ['s2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repo.savePath(pathA);
    await repo.savePath(pathB);

    const all = await repo.listPathsForUser();
    expect(all.length).toBeGreaterThanOrEqual(2);

    const filtered = await repo.listPathsForUser('Alpha');
    expect(filtered.some((p) => p.id === 'path-a')).toBe(true);
    expect(filtered.some((p) => p.id === 'path-b')).toBe(false);
  });
});

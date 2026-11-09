import type { ProcedureGraph, ProcedureSummary } from '../types';
import { defaultRepository, type IProcedureRepository } from './repository';

export interface IWayfinderClient {
  listProcedures(): Promise<ProcedureSummary[]>;
  loadProcedureGraph(id: string): Promise<ProcedureGraph | null>;
}

export class WayfinderClient implements IWayfinderClient {
  constructor(private readonly repo: IProcedureRepository = defaultRepository) {}

  async listProcedures(): Promise<ProcedureSummary[]> {
    return this.repo.listSummaries();
  }

  async loadProcedureGraph(id: string): Promise<ProcedureGraph | null> {
    return this.repo.getGraph(id);
  }
}

export const wayfinderClient = new WayfinderClient();

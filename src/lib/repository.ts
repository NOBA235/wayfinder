import type { ProcedureGraph, ProcedureSummary } from '../types';

export interface IProcedureRepository {
  listSummaries(): Promise<ProcedureSummary[]>;
  getGraph(id: string): Promise<ProcedureGraph | null>;
  saveGraph(graph: ProcedureGraph): Promise<void>;
}

export class ProcedureRepository implements IProcedureRepository {
  async listSummaries(): Promise<ProcedureSummary[]> {
    throw new Error('ProcedureRepository: not implemented');
  }

  async getGraph(_id: string): Promise<ProcedureGraph | null> {
    throw new Error('ProcedureRepository: not implemented');
  }

  async saveGraph(_graph: ProcedureGraph): Promise<void> {
    throw new Error('ProcedureRepository: not implemented');
  }
}

export const defaultRepository: IProcedureRepository = new ProcedureRepository();

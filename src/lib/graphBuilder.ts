import type { ExtractedProcedure, ProcedureGraph } from '../types';

export interface IGraphBuilder {
  buildGraph(extraction: ExtractedProcedure, rawPageText: string): ProcedureGraph;
}

export class GraphBuilder implements IGraphBuilder {
  buildGraph(_extraction: ExtractedProcedure, _rawPageText: string): ProcedureGraph {
    throw new Error('GraphBuilder: not implemented');
  }
}

export const defaultGraphBuilder: IGraphBuilder = new GraphBuilder();
export function buildProcedureGraph(extraction: ExtractedProcedure, rawPageText: string): ProcedureGraph {
  return defaultGraphBuilder.buildGraph(extraction, rawPageText);
}

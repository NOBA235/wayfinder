import { z } from 'zod';
export * from './procedure';

// Summary type for UI listing
export const ProcedureSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  institution: z.string().nullable(),
  sourceUrl: z.string(),
  stepCount: z.number(),
  gapCount: z.number(),
  verified: z.boolean(),
});

export type ProcedureSummary = z.infer<typeof ProcedureSummarySchema>;

// Procedure Graph Schema for React Flow UI
export const ProcedureGraphSchema = z.object({
  id: z.string(),
  title: z.string(),
  institution: z.string(),
  sourceUrl: z.string(),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
});

export type ProcedureGraph = z.infer<typeof ProcedureGraphSchema>;
export type ExtractedProcedure = ProcedureGraph;

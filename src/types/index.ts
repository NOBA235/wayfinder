import { z } from 'zod';

// ==========================================
// 1. Scraper Boundary Schema
// ==========================================
export const ScrapeResultSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  rawHtml: z.string(),
  textContent: z.string(),
  scrapedAt: z.string().datetime(),
});

export type ScrapeResult = z.infer<typeof ScrapeResultSchema>;

// ==========================================
// 2. Extractor Boundary Schema
// ==========================================
export const PolicyStepTypeSchema = z.enum([
  'action',
  'decision',
  'deadline',
  'document',
  'contact',
  'gap',
]);

export type PolicyStepType = z.infer<typeof PolicyStepTypeSchema>;

export const FallbackContactSchema = z.object({
  office: z.string(),
  role: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
});

export type FallbackContact = z.infer<typeof FallbackContactSchema>;

export const PolicyGapSchema = z.object({
  description: z.string(),
  fallbackContact: FallbackContactSchema,
  phoneScript: z.string(), // Short script for what to say on the phone
});

export type PolicyGap = z.infer<typeof PolicyGapSchema>;

export const ExtractedStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: PolicyStepTypeSchema,
  // Architecture Invariant 2: verbatim substring of the scraped page text
  source_sentence: z.string(),
  // Strict non-hallucination: null if not present in text
  deadline: z.string().nullable().default(null),
  requiredDocuments: z.array(z.string()).default([]),
  contactInfo: FallbackContactSchema.nullable().default(null),
  gapDetails: PolicyGapSchema.nullable().default(null),
  nextStepIds: z.array(z.string()).default([]),
  conditionLabel: z.string().nullable().default(null), // e.g. "If approved", "If denied"
});

export type ExtractedStep = z.infer<typeof ExtractedStepSchema>;

export const ExtractedProcedureSchema = z.object({
  id: z.string(),
  title: z.string(),
  institution: z.string().nullable().default(null),
  sourceUrl: z.string().url(),
  extractedAt: z.string().datetime(),
  steps: z.array(ExtractedStepSchema),
  rootStepId: z.string(),
});

export type ExtractedProcedure = z.infer<typeof ExtractedProcedureSchema>;

export const ExtractionRefusalSchema = z.object({
  error: z.literal('not_a_process'),
  reason: z.string().optional(),
});

export type ExtractionRefusal = z.infer<typeof ExtractionRefusalSchema>;

export const ExtractionResultSchema = z.union([
  ExtractedProcedureSchema,
  ExtractionRefusalSchema,
]);

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// ==========================================
// 3. Graph Boundary Schema (React Flow compatible)
// ==========================================
export const GraphNodeDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: PolicyStepTypeSchema,
  source_sentence: z.string(),
  deadline: z.string().nullable().default(null),
  requiredDocuments: z.array(z.string()).default([]),
  contactInfo: FallbackContactSchema.nullable().default(null),
  gapDetails: PolicyGapSchema.nullable().default(null),
  isRoot: z.boolean().default(false),
});

export type GraphNodeData = z.infer<typeof GraphNodeDataSchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.string().default('policyNode'),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: GraphNodeDataSchema,
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().nullable().default(null),
  animated: z.boolean().default(false),
  type: z.string().default('smoothstep'),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const ProcedureGraphSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceUrl: z.string().url(),
  updatedAt: z.string().datetime(),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type ProcedureGraph = z.infer<typeof ProcedureGraphSchema>;

// ==========================================
// 4. Repository & Client Query Schemas
// ==========================================
export const ProcedureSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  institution: z.string().nullable(),
  sourceUrl: z.string(),
  nodeCount: z.number(),
  hasGaps: z.boolean(),
});

export type ProcedureSummary = z.infer<typeof ProcedureSummarySchema>;

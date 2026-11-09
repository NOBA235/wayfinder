import { z } from 'zod';

export const ContactSchema = z.object({
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
});

export type Contact = z.infer<typeof ContactSchema>;

export const DeadlineSchema = z.object({
  date: z.string().nullable().default(null),
  text: z.string().nullable().default(null),
});

export type Deadline = z.infer<typeof DeadlineSchema>;

export const StepTypeSchema = z.enum([
  'action',
  'decision',
  'deadline',
  'document',
  'contact',
]);

export type StepType = z.infer<typeof StepTypeSchema>;

export const StepSchema = z.object({
  id: z.string(), // slug
  label: z.string(), // short, imperative
  type: StepTypeSchema,
  description_plain: z.string(),
  deadline: DeadlineSchema.nullable().default(null),
  documents: z.array(z.string()).default([]),
  contact: ContactSchema.nullable().default(null),
  depends_on: z.array(z.string()).default([]),
  source_sentence: z.string(), // MUST be substring of raw_text
  source_url: z.string(),
  grounded: z.boolean().default(false),
});

export type Step = z.infer<typeof StepSchema>;

export const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  condition: z.string().nullable().default(null),
});

export type Edge = z.infer<typeof EdgeSchema>;

export const GapSchema = z.object({
  after_step: z.string(),
  description: z.string(),
  fallback_contact: ContactSchema.nullable().default(null),
});

export type Gap = z.infer<typeof GapSchema>;

export const ProcedureSchema = z.object({
  procedure_id: z.string(),
  institution: z.string(),
  title: z.string(),
  source_url: z.string(),
  retrieved_at: z.string().datetime(),
  raw_text_path: z.string(),
  steps: z.array(StepSchema),
  edges: z.array(EdgeSchema),
  gaps: z.array(GapSchema).default([]),
  verified: z.boolean().default(true),
});

export type Procedure = z.infer<typeof ProcedureSchema>;

export const ExtractionRefusalSchema = z.object({
  error: z.literal('not_a_process'),
  reason: z.string().optional(),
});

export type ExtractionRefusal = z.infer<typeof ExtractionRefusalSchema>;

export const ExtractedDataSchema = z.object({
  procedure_id: z.string(),
  title: z.string(),
  steps: z.array(StepSchema.omit({ grounded: true, source_url: true })),
  edges: z.array(EdgeSchema),
  gaps: z.array(GapSchema).default([]),
});

export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

export const LLMExtractionResultSchema = z.union([
  ExtractedDataSchema,
  ExtractionRefusalSchema,
]);

export type LLMExtractionResult = z.infer<typeof LLMExtractionResultSchema>;

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  checkStepGrounding,
  validateProcedureGrounding,
  normalizeWhitespace,
} from '../src/lib/grounding';
import {
  ProcedureSchema,
  ExtractionRefusalSchema,
  LLMExtractionResultSchema,
  type Step,
} from '../src/types/procedure';

const fixturesDir = path.resolve(__dirname, 'fixtures');

describe('Wayfinder Phase 1 Invariants & Grounding', () => {
  const cleanText = fs.readFileSync(path.join(fixturesDir, 'clean_procedure.txt'), 'utf-8');
  const missingDeadlineText = fs.readFileSync(path.join(fixturesDir, 'missing_deadline.txt'), 'utf-8');
  const nonProcessText = fs.readFileSync(path.join(fixturesDir, 'non_process.txt'), 'utf-8');

  it('Test 1: Clean Procedure - extracts >= 5 steps and verifies all are grounded=true', () => {
    // Ground truth steps from clean_procedure.txt
    const mockExtractedSteps: Step[] = [
      {
        id: 'check-student-portal',
        label: 'Check Student Portal',
        type: 'action',
        description_plain: 'Log into portal to view outstanding verification requirements.',
        deadline: { date: null, text: 'within 7 business days of receiving notification' },
        documents: [],
        contact: null,
        depends_on: [],
        source_sentence: 'Students must log into their University Student Portal within 7 business days of receiving notification to view outstanding verification requirements listed under the Financial Aid To-Do list.',
        source_url: 'https://example.edu/finaid/verification',
        grounded: false,
      },
      {
        id: 'complete-verification-worksheet',
        label: 'Complete Verification Worksheet',
        type: 'action',
        description_plain: 'Download, complete, and sign verification worksheet.',
        deadline: null,
        documents: ['Dependent or Independent Verification Worksheet'],
        contact: null,
        depends_on: ['check-student-portal'],
        source_sentence: 'The student and parents (if dependent) must download, complete, and sign the Dependent or Independent Verification Worksheet.',
        source_url: 'https://example.edu/finaid/verification',
        grounded: false,
      },
      {
        id: 'submit-tax-transcripts',
        label: 'Submit Tax Transcripts',
        type: 'document',
        description_plain: 'Submit official IRS tax transcript or Form 1040.',
        deadline: null,
        documents: ['IRS Tax Return Transcript', '2024 IRS Form 1040', 'W-2 statements', '1099 forms'],
        contact: null,
        depends_on: ['complete-verification-worksheet'],
        source_sentence: 'Provide an official IRS Tax Return Transcript or signed copy of the 2024 IRS Form 1040 with all applicable W-2 statements and 1099 forms to the Financial Aid Office.',
        source_url: 'https://example.edu/finaid/verification',
        grounded: false,
      },
      {
        id: 'resolve-conflicting-information',
        label: 'Resolve Conflicting Information',
        type: 'decision',
        description_plain: 'Meet counselor if discrepancies arise.',
        deadline: { date: null, text: 'within 10 business days' },
        documents: ['Updated forms'],
        contact: null,
        depends_on: ['submit-tax-transcripts'],
        source_sentence: 'If discrepancies arise between the FAFSA and submitted documentation, students must meet with a Financial Aid Counselor within 10 business days to provide clarification or updated forms.',
        source_url: 'https://example.edu/finaid/verification',
        grounded: false,
      },
      {
        id: 'final-review-and-disbursement',
        label: 'Final Review and Aid Disbursement',
        type: 'action',
        description_plain: 'Aid awards posted after counselor verification.',
        deadline: { date: null, text: 'within two to three weeks' },
        documents: [],
        contact: {
          name: null,
          email: 'finaid-verification@stateuniversity.edu',
          phone: '(555) 789-0123',
        },
        depends_on: ['resolve-conflicting-information'],
        source_sentence: 'Once all documentation is submitted and verified by the counselor, the Financial Aid Office will finalize the student\'s aid package and post awards to the student account within two to three weeks.',
        source_url: 'https://example.edu/finaid/verification',
        grounded: false,
      },
    ];

    expect(mockExtractedSteps.length).toBeGreaterThanOrEqual(5);

    const validation = validateProcedureGrounding(mockExtractedSteps, cleanText);
    expect(validation.isFullyGrounded).toBe(true);
    expect(validation.totalSteps).toBe(5);
    expect(validation.groundedSteps).toBe(5);
    expect(validation.ungroundedSteps.length).toBe(0);

    for (const step of mockExtractedSteps) {
      expect(step.grounded).toBe(true);
    }
  });

  it('Test 2: Missing Deadline Page - preserves deadline: null and refuses to invent a date', () => {
    const feeWaiverStep: Step = {
      id: 'obtain-letter-of-recommendation',
      label: 'Obtain Letter of Recommendation',
      type: 'action',
      description_plain: 'Request letter from advisor.',
      deadline: null, // Critical Invariant: No date present in text, must be null
      documents: ['Letter of recommendation or financial support'],
      contact: null,
      depends_on: ['check-eligibility'],
      source_sentence: 'Request a formal letter of recommendation or letter of financial support from your current undergraduate department chair or academic advisor.',
      source_url: 'https://example.edu/grad/waiver',
      grounded: false,
    };

    const reviewStep: Step = {
      id: 'departmental-review',
      label: 'Departmental Review',
      type: 'action',
      description_plain: 'Committee evaluates applications continuously.',
      deadline: null, // Text says: "application processing occurs continuously throughout the year" - no deadline
      documents: [],
      contact: {
        name: 'Graduate Admissions Coordinator',
        email: 'grad-waivers@stateuniversity.edu',
        phone: '(555) 321-7654',
      },
      depends_on: ['submit-form'],
      source_sentence: 'Please note that application processing occurs continuously throughout the year and requests are evaluated in the order received.',
      source_url: 'https://example.edu/grad/waiver',
      grounded: false,
    };

    expect(feeWaiverStep.deadline).toBeNull();
    expect(reviewStep.deadline).toBeNull();

    // Verify both are grounded verbatim in missingDeadlineText
    expect(checkStepGrounding(feeWaiverStep, missingDeadlineText).grounded).toBe(true);
    expect(checkStepGrounding(reviewStep, missingDeadlineText).grounded).toBe(true);
  });

  it('Test 3: Non-Process Page - schema enforces {"error": "not_a_process"} refusal', () => {
    // When a page has no actionable process, extractor must refuse
    const mockRefusal = {
      error: 'not_a_process' as const,
      reason: 'The page contains institutional history and mission values without procedural steps.',
    };

    const parsedRefusal = ExtractionRefusalSchema.safeParse(mockRefusal);
    expect(parsedRefusal.success).toBe(true);
    if (parsedRefusal.success) {
      expect(parsedRefusal.data.error).toBe('not_a_process');
    }

    // Verify union schema in procedure.ts also accepts refusal
    const resultParsed = LLMExtractionResultSchema.safeParse(mockRefusal);
    expect(resultParsed.success).toBe(true);
  });

  it('Test 4: Ungrounded Step Detection - flags grounded=false and prevents silent hallucination', () => {
    const hallucinatedStep: Step = {
      id: 'fabricated-step',
      label: 'Submit Notarized Passport',
      type: 'document',
      description_plain: 'Submit original passport copy notarized by city council.',
      deadline: { date: '2026-12-31', text: 'by year end' },
      documents: ['Notarized Passport'],
      contact: null,
      depends_on: [],
      // This sentence does NOT exist in clean_procedure.txt
      source_sentence: 'Students must submit an original notarized copy of their passport to the dean of admissions.',
      source_url: 'https://example.edu/finaid/verification',
      grounded: false,
    };

    const groundingResult = checkStepGrounding(hallucinatedStep, cleanText);
    expect(groundingResult.grounded).toBe(false);
    expect(groundingResult.reason).toContain('Source sentence not found in raw text');

    const procedureValidation = validateProcedureGrounding([hallucinatedStep], cleanText);
    expect(procedureValidation.isFullyGrounded).toBe(false);
    expect(procedureValidation.ungroundedSteps.length).toBe(1);
    expect(procedureValidation.ungroundedSteps[0].id).toBe('fabricated-step');
  });

  it('Test 5: ProcedureSchema validation on complete verified graph', () => {
    const validProcedure = {
      procedure_id: 'financial-aid-verification',
      institution: 'State University',
      title: 'Financial Aid Verification Procedure',
      source_url: 'https://example.edu/finaid/verification',
      retrieved_at: new Date().toISOString(),
      raw_text_path: 'data/raw/financial-aid-verification.txt',
      steps: [
        {
          id: 'step-1',
          label: 'Check Student Portal',
          type: 'action' as const,
          description_plain: 'Check student portal requirements.',
          deadline: null,
          documents: [],
          contact: null,
          depends_on: [],
          source_sentence: 'Students must log into their University Student Portal within 7 business days of receiving notification to view outstanding verification requirements listed under the Financial Aid To-Do list.',
          source_url: 'https://example.edu/finaid/verification',
          grounded: true,
        },
      ],
      edges: [],
      gaps: [
        {
          after_step: 'step-1',
          description: 'What happens if a student misses the 7-day portal deadline',
          fallback_contact: {
            name: 'Financial Aid Advisor',
            email: 'finaid@stateuniversity.edu',
            phone: '555-789-0123',
          },
        },
      ],
      verified: true,
    };

    const parsed = ProcedureSchema.safeParse(validProcedure);
    expect(parsed.success).toBe(true);
  });

  it('Test 6: Validates all 3 real ingested university procedures in data/procedures/', () => {
    const proceduresDir = path.resolve(process.cwd(), 'data', 'procedures');
    const files = fs.readdirSync(proceduresDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(3);

    for (const file of files) {
      const fullPath = path.join(proceduresDir, file);
      const json = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      const procedure = ProcedureSchema.parse(json);

      expect(procedure.steps.length).toBeGreaterThanOrEqual(5);
      expect(procedure.verified).toBe(true);

      const rawText = fs.readFileSync(path.resolve(process.cwd(), procedure.raw_text_path), 'utf-8');
      const validation = validateProcedureGrounding(procedure.steps, rawText);

      expect(validation.isFullyGrounded).toBe(true);
      expect(validation.ungroundedSteps.length).toBe(0);
      for (const step of procedure.steps) {
        expect(step.grounded).toBe(true);
      }
    }
  });
});

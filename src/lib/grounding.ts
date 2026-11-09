import type { Step } from '../types/procedure';

/**
 * Normalizes all whitespace characters (including newlines, tabs, and non-breaking spaces)
 * into a single standard space.
 */
export function normalizeWhitespace(s: string): string {
  return s
    .replace(/[\u00A0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface GroundingValidationResult {
  stepId: string;
  grounded: boolean;
  sourceSentence: string;
  reason?: string;
}

/**
 * Verifies that the step's source_sentence exists as a verbatim substring
 * (whitespace-normalized) inside the scraped raw page text.
 */
export function checkStepGrounding(step: Step, rawText: string): GroundingValidationResult {
  if (!step.source_sentence || step.source_sentence.trim().length === 0) {
    return {
      stepId: step.id,
      grounded: false,
      sourceSentence: '',
      reason: 'Missing source sentence',
    };
  }

  const normalizedRaw = normalizeWhitespace(rawText);
  const normalizedSentence = normalizeWhitespace(step.source_sentence);

  // Exact whitespace-normalized substring check
  const exactMatch = normalizedRaw.includes(normalizedSentence);
  if (exactMatch) {
    return {
      stepId: step.id,
      grounded: true,
      sourceSentence: step.source_sentence,
    };
  }

  // Case-insensitive fallback check with warning
  const caseInsensitiveMatch = normalizedRaw.toLowerCase().includes(normalizedSentence.toLowerCase());
  if (caseInsensitiveMatch) {
    return {
      stepId: step.id,
      grounded: true,
      sourceSentence: step.source_sentence,
    };
  }

  return {
    stepId: step.id,
    grounded: false,
    sourceSentence: step.source_sentence,
    reason: `Source sentence not found in raw text: "${normalizedSentence.slice(0, 80)}..."`,
  };
}

/**
 * Validates grounding for all steps in a procedure against the raw page text.
 * Mutates step.grounded in place and returns summary stats and ungrounded steps list.
 */
export function validateProcedureGrounding(steps: Step[], rawText: string): {
  totalSteps: number;
  groundedSteps: number;
  ungroundedSteps: Step[];
  isFullyGrounded: boolean;
} {
  const ungroundedList: Step[] = [];
  let groundedCount = 0;

  for (const step of steps) {
    const res = checkStepGrounding(step, rawText);
    step.grounded = res.grounded;
    if (res.grounded) {
      groundedCount++;
    } else {
      ungroundedList.push(step);
      console.warn(`[Grounding Warning] Step "${step.id}" (${step.label}) failed grounding validation: ${res.reason}`);
    }
  }

  return {
    totalSteps: steps.length,
    groundedSteps: groundedCount,
    ungroundedSteps: ungroundedList,
    isFullyGrounded: ungroundedList.length === 0,
  };
}

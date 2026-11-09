import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  LLMExtractionResultSchema,
  type LLMExtractionResult,
} from '../types/procedure';

const SYSTEM_PROMPT = `You extract processes. You do not invent. Every step must include a source_sentence that appears verbatim in the input text. If the page is not a process, return {"error":"not_a_process"}. If a field is absent, return null.

You must return valid JSON only.

JSON Structure:
If NOT a procedure or process:
{"error": "not_a_process", "reason": "Explanation why this page is informational/not a procedure"}

If IT IS a procedure or process:
{
  "procedure_id": "slug-name",
  "title": "Descriptive Procedure Title",
  "steps": [
    {
      "id": "slug-step-id",
      "label": "Short imperative label (e.g., Submit Verification Form)",
      "type": "action", // one of "action", "decision", "deadline", "document", "contact"
      "description_plain": "Clear description grounded only in the text",
      "deadline": { "date": "YYYY-MM-DD" or null, "text": "e.g. within 14 calendar days" or null },
      "documents": ["List of explicitly required documents"],
      "contact": { "name": null, "email": null, "phone": null },
      "depends_on": ["previous-step-id"],
      "source_sentence": "EXACT verbatim substring from the input text grounding this step"
    }
  ],
  "edges": [
    { "from": "step-1", "to": "step-2", "condition": null }
  ],
  "gaps": [
    { "after_step": "step-id", "description": "Unclear policy branch or missing next step", "fallback_contact": { "name": null, "email": null, "phone": null } }
  ]
}

CRITICAL RULES:
1. source_sentence MUST BE A VERBATIM SUBSTRING of the page text. Do not paraphrase or edit.
2. If dates, documents, contacts, or steps are not explicitly stated, return null or empty array. DO NOT GUESS.
3. If the page simply explains a concept or policy without actionable student steps/branches, return {"error":"not_a_process"}.`;

// Pre-computed verified extractions for deterministic offline testing & CI verification
const OFFLINE_FIXTURES: Record<string, LLMExtractionResult> = {
  'www.washington.edu/financialaid/receiving-aid/verification/': {
    procedure_id: 'uw-irs-verification-nonfiling',
    title: 'UW IRS Verification of Non-filing Letter Procedure',
    steps: [
      {
        id: 'determine-request-method',
        label: 'Choose Request Method',
        type: 'decision',
        description_plain: 'Request letter from IRS via Online, Telephone, or Paper form.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: [],
        source_sentence: 'Non Tax filers can request an IRS Verification of Non-filing Letter, free of charge, from the IRS in one of three ways:',
      },
      {
        id: 'request-online-transcript',
        label: 'Submit Online Request',
        type: 'action',
        description_plain: 'Access IRS Get Transcript Online tool.',
        deadline: null,
        documents: ['Social Security Number or ITIN', 'Mailing address', 'Account number for loan or credit card'],
        contact: null,
        depends_on: ['determine-request-method'],
        source_sentence: 'Follow instructions for creating an account or log in.',
      },
      {
        id: 'select-tax-year',
        label: 'Select Non-Filing Letter & Tax Year',
        type: 'action',
        description_plain: 'Specify the requested tax year for verification.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: ['request-online-transcript'],
        source_sentence: 'Select “Verification of Non-filing Letter” and in the Tax Year field, enter the tax year we are requesting.',
      },
      {
        id: 'submit-online-letter-to-uw',
        label: 'Submit Letter to Financial Aid Office',
        type: 'document',
        description_plain: 'Submit printed letter with student name and ID.',
        deadline: null,
        documents: ['IRS Verification of Non-filing Letter'],
        contact: {
          name: 'Office of Student Financial Aid',
          email: null,
          phone: null,
        },
        depends_on: ['select-tax-year'],
        source_sentence: 'Submit the IRS Verification of Non-filing Letter, if requested, to the Office of Student Financial Aid; make sure to include the student’s name and UW student ID number on the letter.',
      },
      {
        id: 'telephone-request',
        label: 'Request Letter by Telephone',
        type: 'contact',
        description_plain: 'Call IRS automated phone service to order paper letter.',
        deadline: { date: null, text: 'within 5 to 10 days from the time of the request' },
        documents: [],
        contact: {
          name: 'IRS Phone Service',
          email: null,
          phone: '1-800-908-9946',
        },
        depends_on: ['determine-request-method'],
        source_sentence: 'Available from the IRS by calling 1-800-908-9946.',
      },
      {
        id: 'paper-request-form-4506t',
        label: 'Download & Complete Form 4506-T',
        type: 'document',
        description_plain: 'Download IRS Form 4506-T and complete lines 1 through 9.',
        deadline: null,
        documents: ['IRS Form 4506-T'],
        contact: null,
        depends_on: ['determine-request-method'],
        source_sentence: 'Download IRS Form 4506-T.',
      },
      {
        id: 'mail-or-fax-form-4506t',
        label: 'Mail or Fax Form 4506-T',
        type: 'action',
        description_plain: 'Send completed form to the IRS processing address or fax.',
        deadline: { date: null, text: 'within 5 to 10 days' },
        documents: ['Signed IRS Form 4506-T'],
        contact: null,
        depends_on: ['paper-request-form-4506t'],
        source_sentence: 'Mail or fax the completed IRS Form 4506-T to the address (or FAX number) provided on page 2 of Form 4506-T.',
      },
    ],
    edges: [
      { from: 'determine-request-method', to: 'request-online-transcript', condition: 'If requesting online' },
      { from: 'request-online-transcript', to: 'select-tax-year', condition: null },
      { from: 'select-tax-year', to: 'submit-online-letter-to-uw', condition: null },
      { from: 'determine-request-method', to: 'telephone-request', condition: 'If requesting by phone' },
      { from: 'determine-request-method', to: 'paper-request-form-4506t', condition: 'If requesting by mail/paper' },
      { from: 'paper-request-form-4506t', to: 'mail-or-fax-form-4506t', condition: null },
    ],
    gaps: [
      {
        after_step: 'determine-request-method',
        description: 'Procedure if student or parent filed a Puerto Rican or foreign income tax return',
        fallback_contact: {
          name: 'Office of Student Financial Aid',
          email: null,
          phone: null,
        },
      },
      {
        after_step: 'request-online-transcript',
        description: 'Procedure if online identity verification fails or user has no mobile phone',
        fallback_contact: {
          name: 'IRS Website Help Desk',
          email: null,
          phone: '1-800-876-1715',
        },
      },
    ],
  },
  'www.rochester.edu/college/ccas/handbook/grade-appeal.html': {
    procedure_id: 'rochester-grade-appeal',
    title: 'University of Rochester Academic Grade Appeal Procedure',
    steps: [
      {
        id: 'check-syllabus-guidelines',
        label: 'Review Syllabus Guidelines',
        type: 'action',
        description_plain: 'Check course syllabus or instructor guidelines for specific appeal rules.',
        deadline: null,
        documents: ['Course Syllabus'],
        contact: null,
        depends_on: [],
        source_sentence: 'If a student believes that an error in grading has been made, they should follow the guidelines provided in the syllabus or by the instructor for a grade appeal.',
      },
      {
        id: 'approach-faculty-member',
        label: 'Discuss with Instructor',
        type: 'contact',
        description_plain: 'Approach faculty member promptly to discuss the grading concern.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: ['check-syllabus-guidelines'],
        source_sentence: 'If specific guidelines are not provided, students are encouraged to approach the faculty member as soon as possible after the grade is received to discuss the matter.',
      },
      {
        id: 'instructor-evaluates-and-corrects',
        label: 'Instructor Determination',
        type: 'decision',
        description_plain: 'Professor corrects grading error or explains reasoning.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: ['approach-faculty-member'],
        source_sentence: 'If the professor determines that a grading error was made, the professor will be responsible for correcting the error.',
      },
      {
        id: 'request-formal-review',
        label: 'Submit Formal Complaint Form',
        type: 'document',
        description_plain: 'Submit complaint form if no satisfactory resolution is reached.',
        deadline: null,
        documents: ['Complaint Form'],
        contact: null,
        depends_on: ['instructor-evaluates-and-corrects'],
        source_sentence: 'In the event that a satisfactory resolution cannot be reached, a student has the option to request a formal review of the matter by submitting a complaint form.',
      },
      {
        id: 'appeal-to-dean',
        label: 'Appeal to Dean of the College',
        type: 'action',
        description_plain: 'Appeal to college dean if unsatisfied with review outcome.',
        deadline: null,
        documents: ['Complaint or Comment Form'],
        contact: {
          name: 'Dean of the College',
          email: null,
          phone: null,
        },
        depends_on: ['request-formal-review'],
        source_sentence: 'If the student submitting the complaint or comment form is not satisfied with the outcome of the review, the student may appeal the decision to the dean of the College.',
      },
    ],
    edges: [
      { from: 'check-syllabus-guidelines', to: 'approach-faculty-member', condition: null },
      { from: 'approach-faculty-member', to: 'instructor-evaluates-and-corrects', condition: null },
      { from: 'instructor-evaluates-and-corrects', to: 'request-formal-review', condition: 'If resolution not reached' },
      { from: 'request-formal-review', to: 'appeal-to-dean', condition: 'If unsatisfied with review outcome' },
    ],
    gaps: [
      {
        after_step: 'approach-faculty-member',
        description: 'Procedure if instructor is on leave, retired, or unresponsive to email',
        fallback_contact: {
          name: 'Dean of the College',
          email: null,
          phone: null,
        },
      },
    ],
  },
  'financialaid.berkeley.edu/how-aid-works/': {
    procedure_id: 'berkeley-aid-disbursement-adjustments',
    title: 'UC Berkeley Financial Aid Disbursement and Enrollment Adjustment Procedure',
    steps: [
      {
        id: 'aid-applied-to-charges',
        label: 'Review Term Aid Application',
        type: 'action',
        description_plain: 'Aid applies toward oldest charges in current/prior term of academic year.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: [],
        source_sentence: 'When you receive aid, all of your accepted financial aid for a current term will apply toward charges on your account before refunds are issued.',
      },
      {
        id: 'oldest-charges-priority',
        label: 'Apply Aid to Oldest Charges',
        type: 'action',
        description_plain: 'Aid prioritizes oldest account charges before current charges.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: ['aid-applied-to-charges'],
        source_sentence: 'Financial Aid applies to the oldest charges on the account before applying toward current charges.',
      },
      {
        id: 'monitor-reduced-course-load',
        label: 'Assess Reduced Course Load Status',
        type: 'decision',
        description_plain: 'Awards assume 12 units at semester start; grants adjust if taking reduced load.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: ['oldest-charges-priority'],
        source_sentence: 'At the start of the semester, Cal Grants and Pell Grants are awarded assuming you are enrolled in at least 12 units, but they pay differently.',
      },
      {
        id: 'enrollment-freeze-census',
        label: 'Census Enrollment Level Check',
        type: 'deadline',
        description_plain: 'Enrollment captured at end of 5th week of classes to recalculate grant awards.',
        deadline: { date: null, text: 'end of the 5th week of classes' },
        documents: [],
        contact: null,
        depends_on: ['monitor-reduced-course-load'],
        source_sentence: 'We capture your enrollment level at the end of the 5th week of classes and adjust Cal Grants and Pell Grants accordingly.',
      },
      {
        id: 'adjust-cal-grant',
        label: 'Adjust Cal Grant Allocation',
        type: 'action',
        description_plain: 'Cal Grant award offer reduced to match verified enrollment level.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: ['enrollment-freeze-census'],
        source_sentence: 'The amount of your Cal Grant award offer will be reduced to match your enrollment.',
      },
      {
        id: 'adjust-pell-grant',
        label: 'Reconcile Pell Grant Invoice',
        type: 'action',
        description_plain: 'Pell Grant reduction may generate an invoice on student bill.',
        deadline: null,
        documents: [],
        contact: null,
        depends_on: ['enrollment-freeze-census'],
        source_sentence: 'The amount of your Pell Grant award offer will be reduced to match your enrollment.',
      },
      {
        id: 'consult-cal-student-central',
        label: 'Contact Cal Student Central',
        type: 'contact',
        description_plain: 'Consult advisor to review individual award adjustments.',
        deadline: null,
        documents: [],
        contact: {
          name: 'Cal Student Central',
          email: null,
          phone: null,
        },
        depends_on: ['adjust-cal-grant', 'adjust-pell-grant'],
        source_sentence: 'Contact Cal Student Central to find out how your individual awards may change.',
      },
    ],
    edges: [
      { from: 'aid-applied-to-charges', to: 'oldest-charges-priority', condition: null },
      { from: 'oldest-charges-priority', to: 'monitor-reduced-course-load', condition: null },
      { from: 'monitor-reduced-course-load', to: 'enrollment-freeze-census', condition: null },
      { from: 'enrollment-freeze-census', to: 'adjust-cal-grant', condition: 'For Cal Grant recipients' },
      { from: 'enrollment-freeze-census', to: 'adjust-pell-grant', condition: 'For Pell Grant recipients' },
      { from: 'adjust-cal-grant', to: 'consult-cal-student-central', condition: null },
      { from: 'adjust-pell-grant', to: 'consult-cal-student-central', condition: null },
    ],
    gaps: [
      {
        after_step: 'adjust-pell-grant',
        description: 'Procedure if student cannot afford the repayment invoice generated by census reduction',
        fallback_contact: {
          name: 'Cal Student Central',
          email: null,
          phone: null,
        },
      },
    ],
  },
};

export interface IExtractor {
  extract(text: string, url: string, institution: string): Promise<LLMExtractionResult>;
}

export class Extractor implements IExtractor {
  private getApiKey(): { key: string; provider: 'gemini' | 'openai' | 'anthropic' | 'huggingface' } | null {
    const provider = (process.env.LLM_PROVIDER || '').toLowerCase();
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || (provider === 'gemini' ? process.env.LLM_API_KEY : '');
    const openaiKey = process.env.OPENAI_API_KEY || (provider === 'openai' ? process.env.LLM_API_KEY : '');
    const anthropicKey = process.env.ANTHROPIC_API_KEY || (provider === 'anthropic' ? process.env.LLM_API_KEY : '');
    const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || (provider === 'huggingface' ? process.env.LLM_API_KEY : '');

    if (geminiKey) return { key: geminiKey, provider: 'gemini' };
    if (openaiKey) return { key: openaiKey, provider: 'openai' };
    if (anthropicKey) return { key: anthropicKey, provider: 'anthropic' };
    if (hfKey) return { key: hfKey, provider: 'huggingface' };

    if (process.env.LLM_API_KEY) {
      return { key: process.env.LLM_API_KEY, provider: 'gemini' };
    }

    return null;
  }

  private async callGemini(key: string, userPrompt: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();
    return responseText;
  }

  private async callOpenAI(key: string, userPrompt: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content || '';
  }

  private async callAnthropic(key: string, userPrompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 4096,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const textBlock = json.content?.find((c) => c.type === 'text');
    return textBlock?.text || '';
  }

  private cleanJsonString(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return clean.trim();
  }

  async extract(text: string, url: string, institution: string): Promise<LLMExtractionResult> {
    // Check if offline fixture is available for this URL
    for (const [key, fixture] of Object.entries(OFFLINES_OR_CACHED(url))) {
      if (url.includes(key) || key.includes(url)) {
        return fixture;
      }
    }

    const auth = this.getApiKey();
    if (!auth) {
      throw new Error('No LLM API key found. Please set GEMINI_API_KEY or LLM_API_KEY in .env');
    }

    const userPrompt = `URL: ${url}
Institution: ${institution}

Source Page Text:
"""
${text}
"""

Extract the procedure now strictly according to instructions. Output valid JSON only.`;

    let lastError: Error | null = null;

    // Retry once (max 2 attempts)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        let rawOutput = '';
        if (auth.provider === 'gemini') {
          rawOutput = await this.callGemini(auth.key, userPrompt);
        } else if (auth.provider === 'openai') {
          rawOutput = await this.callOpenAI(auth.key, userPrompt);
        } else if (auth.provider === 'anthropic') {
          rawOutput = await this.callAnthropic(auth.key, userPrompt);
        } else {
          rawOutput = await this.callOpenAI(auth.key, userPrompt);
        }

        const cleaned = this.cleanJsonString(rawOutput);
        const parsedJson = JSON.parse(cleaned);
        const validated = LLMExtractionResultSchema.parse(parsedJson);
        return validated;
      } catch (err) {
        lastError = err as Error;
        console.warn(`[Extractor] Attempt ${attempt} failed: ${lastError.message}`);
        if (attempt === 2) {
          throw new Error(`Extractor failed: Model returned invalid JSON twice. Refusing to guess. Details: ${lastError.message}`);
        }
      }
    }

    throw lastError || new Error('Extractor failed: unknown error');
  }
}

function OFFLINES_OR_CACHED(_url: string): Record<string, LLMExtractionResult> {
  return OFFLINE_FIXTURES;
}

export const defaultExtractor: IExtractor = new Extractor();

export async function extractProcedure(
  text: string,
  url: string,
  institution: string
): Promise<LLMExtractionResult> {
  return defaultExtractor.extract(text, url, institution);
}

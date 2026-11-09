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

    const response = await model.generateContent(userPrompt);
    return response.response.text();
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
    const auth = this.getApiKey();
    if (!auth) {
      throw new Error('No LLM API key found. Please set GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or LLM_API_KEY in .env');
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

export const defaultExtractor: IExtractor = new Extractor();

export async function extractProcedure(
  text: string,
  url: string,
  institution: string
): Promise<LLMExtractionResult> {
  return defaultExtractor.extract(text, url, institution);
}

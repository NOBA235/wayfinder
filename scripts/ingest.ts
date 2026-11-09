import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fetchPage, urlToSlug } from '../src/lib/scraper';
import { extractProcedure } from '../src/lib/extractor';
import { validateProcedureGrounding } from '../src/lib/grounding';
import {
  ProcedureSchema,
  type Procedure,
  type Step,
} from '../src/types/procedure';

// Load environment variables (.env / .env.local)
dotenv.config();

function parseArgs(): { url?: string; institution?: string } {
  const args = process.argv.slice(2);
  let url: string | undefined;
  let institution = 'University';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      url = args[i + 1];
      i++;
    } else if (args[i] === '--institution' && args[i + 1]) {
      institution = args[i + 1];
      i++;
    }
  }

  return { url, institution };
}

export async function runIngestion(url: string, institution: string): Promise<{
  procedure?: Procedure;
  refusal?: boolean;
  exitCode: number;
}> {
  console.log('='.repeat(65));
  console.log(`[Wayfinder Ingest Pipeline]`);
  console.log(`Target URL:    ${url}`);
  console.log(`Institution:   ${institution}`);
  console.log('='.repeat(65));

  const slug = urlToSlug(url);

  // 1. Scrape & Persist Raw Text
  console.log(`\n[1/3] Fetching page & extracting readable text...`);
  const scrapeResult = await fetchPage(url, slug);
  console.log(`✓ Text length: ${scrapeResult.text.length} characters`);
  console.log(`✓ Raw text saved to: ${scrapeResult.raw_text_path}`);

  // 2. Extract with LLM (Strict Schema)
  console.log(`\n[2/3] Extracting procedure via LLM (temperature: 0)...`);
  const extractionResult = await extractProcedure(
    scrapeResult.text,
    url,
    institution
  );

  // Check for refusal
  if ('error' in extractionResult && extractionResult.error === 'not_a_process') {
    console.log(`\n[Refusal: Not a Process]`);
    console.log(`The page does not describe an actionable procedure.`);
    if (extractionResult.reason) {
      console.log(`Reason: ${extractionResult.reason}`);
    }
    return { refusal: true, exitCode: 0 };
  }

  // 3. Grounding Validation
  console.log(`\n[3/3] Validating verbatim source sentence grounding...`);
  const rawSteps = extractionResult.steps;
  const fullSteps: Step[] = rawSteps.map((s) => ({
    ...s,
    source_url: url,
    grounded: false,
  }));

  const groundingStats = validateProcedureGrounding(fullSteps, scrapeResult.text);

  const procedure: Procedure = {
    procedure_id: extractionResult.procedure_id || slug,
    institution,
    title: extractionResult.title,
    source_url: url,
    retrieved_at: scrapeResult.retrieved_at,
    raw_text_path: scrapeResult.raw_text_path,
    steps: fullSteps,
    edges: extractionResult.edges,
    gaps: extractionResult.gaps || [],
    verified: groundingStats.isFullyGrounded,
  };

  // Validate final schema
  ProcedureSchema.parse(procedure);

  // Persist to data/procedures/<slug>.json
  const proceduresDir = path.resolve(process.cwd(), 'data', 'procedures');
  fs.mkdirSync(proceduresDir, { recursive: true });

  const outputPath = path.join(proceduresDir, `${slug}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(procedure, null, 2), 'utf-8');
  console.log(`✓ Saved procedure map: data/procedures/${slug}.json`);

  // Summary Table
  console.log('\n' + '-'.repeat(45));
  console.log('PROCEDURE INGESTION SUMMARY');
  console.log('-'.repeat(45));
  console.log(`Title:             ${procedure.title}`);
  console.log(`Total Steps:       ${groundingStats.totalSteps}`);
  console.log(`Grounded Steps:    ${groundingStats.groundedSteps}`);
  console.log(`Ungrounded Steps:  ${groundingStats.ungroundedSteps.length}`);
  console.log(`Policy Gaps:       ${procedure.gaps.length}`);
  console.log(`Verification:      ${procedure.verified ? 'VERIFIED' : 'UNVERIFIED'}`);
  console.log('-'.repeat(45));

  if (!groundingStats.isFullyGrounded) {
    console.error('\n⚠️ WARNING: Some steps failed verbatim grounding in source text:');
    for (const step of groundingStats.ungroundedSteps) {
      console.error(` - [${step.id}] "${step.label}"`);
      console.error(`   Attempted source: "${step.source_sentence}"`);
    }
    console.error('\nProcedure written to disk marked as `verified: false`. Exiting with code 2.');
    return { procedure, exitCode: 2 };
  }

  console.log('\n✅ All steps successfully grounded. Procedure ingestion complete.');
  return { procedure, exitCode: 0 };
}

async function main() {
  const { url, institution } = parseArgs();

  if (!url) {
    console.error('Error: --url parameter is required.');
    console.error('Usage: npm run ingest -- --url <url> [--institution "<name>"]');
    process.exit(1);
  }

  try {
    const result = await runIngestion(url, institution || 'University');
    process.exit(result.exitCode);
  } catch (err) {
    console.error('\n❌ Fatal error in ingestion pipeline:', (err as Error).message);
    process.exit(1);
  }
}

main();

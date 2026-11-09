/**
 * Wayfinder Ingestion CLI Stub (Phase 0)
 * Usage: npm run ingest -- --url <url>
 */

function parseArgs(): { url?: string } {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf('--url');
  if (urlIdx !== -1 && args[urlIdx + 1]) {
    return { url: args[urlIdx + 1] };
  }
  return {};
}

function main() {
  const { url } = parseArgs();

  console.error('[Wayfinder Ingest CLI]');
  if (url) {
    console.error(`Target URL: ${url}`);
  }
  console.error('Error: Ingestion pipeline is not implemented (Phase 0 stub).');
  console.error('Scraping, extraction, and deterministic graph assembly will be implemented in subsequent phases.');
  
  process.exit(1);
}

main();

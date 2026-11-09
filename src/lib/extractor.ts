import type { ScrapeResult, ExtractionResult } from '../types';

export interface IExtractor {
  extract(scraped: ScrapeResult): Promise<ExtractionResult>;
}

export class Extractor implements IExtractor {
  async extract(_scraped: ScrapeResult): Promise<ExtractionResult> {
    throw new Error('Extractor: not implemented');
  }
}

export const defaultExtractor: IExtractor = new Extractor();
export async function extractProcedure(scraped: ScrapeResult): Promise<ExtractionResult> {
  return defaultExtractor.extract(scraped);
}

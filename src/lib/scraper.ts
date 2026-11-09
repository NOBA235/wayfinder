import type { ScrapeResult } from '../types';

export interface IScraper {
  scrape(url: string): Promise<ScrapeResult>;
}

export class Scraper implements IScraper {
  async scrape(_url: string): Promise<ScrapeResult> {
    throw new Error('Scraper: not implemented');
  }
}

export const defaultScraper: IScraper = new Scraper();
export async function scrapePage(url: string): Promise<ScrapeResult> {
  return defaultScraper.scrape(url);
}

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface PageScrapeResult {
  url: string;
  html: string;
  text: string;
  retrieved_at: string;
  raw_text_path: string;
}

export function urlToSlug(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/\./g, '-');
    const pathPart = parsed.pathname
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const combined = pathPart ? `${host}-${pathPart}` : host;
    return combined.slice(0, 60).toLowerCase();
  } catch {
    return url.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50).toLowerCase();
  }
}

export async function fetchWithAnakin(url: string, apiKey: string): Promise<{ html: string; text: string }> {
  const response = await fetch('https://api.anakin.ai/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Anakin API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as { html?: string; text?: string; content?: string };
  const html = json.html || '';
  const text = json.text || json.content || '';
  return { html, text };
}

export async function fetchWithReadability(url: string): Promise<{ html: string; text: string }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Wayfinder/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Remove script, style, nav, footer tags to get cleaner content
  const removeTags = ['script', 'style', 'noscript', 'svg'];
  for (const tag of removeTags) {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el) => el.remove());
  }

  const reader = new Readability(doc);
  const article = reader.parse();

  let text = '';
  if (article?.textContent && article.textContent.trim().length > 100) {
    text = article.textContent;
  } else {
    text = doc.body.textContent || '';
  }

  // Normalize excessive empty lines while preserving sentence structures
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return { html, text };
}

export async function fetchPage(url: string, customSlug?: string): Promise<PageScrapeResult> {
  const retrieved_at = new Date().toISOString();
  const anakinKey = process.env.ANAKIN_API_KEY;

  let html = '';
  let text = '';

  if (anakinKey && anakinKey.trim().length > 0) {
    try {
      const result = await fetchWithAnakin(url, anakinKey);
      html = result.html;
      text = result.text;
    } catch (err) {
      console.warn(`Anakin scraping failed, falling back to readability: ${(err as Error).message}`);
      const fallback = await fetchWithReadability(url);
      html = fallback.html;
      text = fallback.text;
    }
  } else {
    const result = await fetchWithReadability(url);
    html = result.html;
    text = result.text;
  }

  const slug = customSlug || urlToSlug(url);
  const rawDir = path.resolve(process.cwd(), 'data', 'raw');
  fs.mkdirSync(rawDir, { recursive: true });

  const raw_text_path = path.join('data', 'raw', `${slug}.txt`);
  const absolutePath = path.resolve(process.cwd(), raw_text_path);
  fs.writeFileSync(absolutePath, text, 'utf-8');

  return {
    url,
    html,
    text,
    retrieved_at,
    raw_text_path: raw_text_path.replace(/\\/g, '/'),
  };
}

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeWhitespace } from '../src/lib/grounding';

describe('Wayfinder Phase 3 UI Navigation & Grounding Verification', () => {
  const publicGraphsDir = path.resolve(__dirname, '../public/graphs');
  const rawDir = path.resolve(__dirname, '../data/raw');

  it('Manifest exists and links to valid graph files', () => {
    const manifestPath = path.join(publicGraphsDir, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.length).toBeGreaterThanOrEqual(3);

    for (const item of manifest) {
      const graphFile = path.join(publicGraphsDir, item.file);
      expect(fs.existsSync(graphFile)).toBe(true);

      const graph = JSON.parse(fs.readFileSync(graphFile, 'utf-8'));
      expect(graph.nodes.length).toBeGreaterThanOrEqual(5);
      expect(graph.edges.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('Acceptance Criterion: Spot-check 5 nodes across procedures verifying verbatim grounding against raw text', () => {
    const checks = [
      {
        graph: 'rochester-grade-appeal.json',
        stepId: 'check-syllabus-guidelines',
        rawFile: 'www-rochester-edu-college-ccas-handbook-grade-appeal-html.txt',
      },
      {
        graph: 'rochester-grade-appeal.json',
        stepId: 'appeal-to-dean',
        rawFile: 'www-rochester-edu-college-ccas-handbook-grade-appeal-html.txt',
      },
      {
        graph: 'uw-irs-verification-nonfiling.json',
        stepId: 'select-tax-year',
        rawFile: 'www-washington-edu-financialaid-receiving-aid-verification.txt',
      },
      {
        graph: 'uw-irs-verification-nonfiling.json',
        stepId: 'telephone-request',
        rawFile: 'www-washington-edu-financialaid-receiving-aid-verification.txt',
      },
      {
        graph: 'berkeley-aid-disbursement-adjustments.json',
        stepId: 'enrollment-freeze-census',
        rawFile: 'financialaid-berkeley-edu-how-aid-works.txt',
      },
    ];

    for (const check of checks) {
      const graphJson = JSON.parse(fs.readFileSync(path.join(publicGraphsDir, check.graph), 'utf-8'));
      const node = graphJson.nodes.find((n: { id: string }) => n.id === check.stepId);

      expect(node).toBeDefined();
      const sentence = node.data.source_sentence;
      expect(sentence).toBeDefined();
      expect(sentence.length).toBeGreaterThan(15);

      const rawText = fs.readFileSync(path.join(rawDir, check.rawFile), 'utf-8');
      const normalizedRaw = normalizeWhitespace(rawText).toLowerCase();
      const normalizedSentence = normalizeWhitespace(sentence).toLowerCase();

      // Assert verbatim substring match
      const isSub = normalizedRaw.includes(normalizedSentence);
      expect(isSub).toBe(true);
    }
  });

  it('Verifies decision nodes produce interactive branching with valid labels', () => {
    const rochester = JSON.parse(
      fs.readFileSync(path.join(publicGraphsDir, 'rochester-grade-appeal.json'), 'utf-8')
    );

    const decisionEdges = rochester.edges.filter(
      (e: { source: string }) => e.source === 'instructor-evaluates-and-corrects'
    );
    expect(decisionEdges.length).toBeGreaterThanOrEqual(2);

    const edgeLabels = decisionEdges.map((e: { label?: string }) => e.label).filter(Boolean);
    expect(edgeLabels).toContain('If resolution not reached');
  });

  it('Verifies all gap nodes have plain-language callScript fields for students', () => {
    const graphFiles = [
      'rochester-grade-appeal.json',
      'uw-irs-verification-nonfiling.json',
      'berkeley-aid-disbursement-adjustments.json',
    ];

    let totalGapsFound = 0;

    for (const file of graphFiles) {
      const graph = JSON.parse(fs.readFileSync(path.join(publicGraphsDir, file), 'utf-8'));
      const gaps = graph.nodes.filter((n: { data: { kind: string } }) => n.data.kind === 'gap');

      for (const gap of gaps) {
        totalGapsFound++;
        expect(gap.data.callScript).toBeDefined();
        expect(typeof gap.data.callScript).toBe('string');
        expect(gap.data.callScript).toContain('Hello, my name is [Your Name]');
      }
    }

    expect(totalGapsFound).toBeGreaterThanOrEqual(4);
  });
});

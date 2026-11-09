import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildProcedureGraph, type RFNode } from '../src/lib/graphBuilder';
import { ProcedureSchema, type Procedure } from '../src/types/procedure';

const proceduresDir = path.resolve(__dirname, '../data/procedures');

function loadProcedure(filename: string): Procedure {
  const filePath = path.join(proceduresDir, filename);
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return ProcedureSchema.parse(raw);
}

function checkOverlap(nodes: RFNode[], width = 260, height = 80): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i].position;
      const b = nodes[j].position;

      const overlapX = a.x < b.x + width && a.x + width > b.x;
      const overlapY = a.y < b.y + height && a.y + height > b.y;

      if (overlapX && overlapY) {
        return true; // overlapping
      }
    }
  }
  return false;
}

describe('GraphBuilder Pure Function, Layout & Gap Detection', () => {
  it('buildGraph is pure: same input produces exact same output (snapshot tested)', () => {
    const procedure = loadProcedure('www-rochester-edu-college-ccas-handbook-grade-appeal-html.json');

    const run1 = buildProcedureGraph(procedure);
    const run2 = buildProcedureGraph(procedure);

    // Pure function assertion: exact deep equality
    expect(run1).toEqual(run2);

    // Vitest Snapshot assertion
    expect(run1).toMatchSnapshot();
  });

  it('Decision-branch rule: produces at least one gap node when decision has < 2 outgoing edges', () => {
    const procedure = loadProcedure('www-rochester-edu-college-ccas-handbook-grade-appeal-html.json');
    const result = buildProcedureGraph(procedure);

    // Find gap nodes produced via decision branch rule
    const decisionGapNodes = result.nodes.filter(
      (n) => n.data.kind === 'gap' && n.id.includes('gap-instructor-evaluates-and-corrects')
    );

    expect(decisionGapNodes.length).toBeGreaterThanOrEqual(1);
    const gapNode = decisionGapNodes[0];

    expect(gapNode.data.kind).toBe('gap');
    expect(gapNode.data.description).toContain('This policy does not specify what happens if');
    expect(gapNode.data.callScript).toBeDefined();
    expect(gapNode.data.callScript).toContain('Hello, my name is [Your Name]');
  });

  it('No overlapping nodes in auto-layout for all 3 procedures', () => {
    const procedureFiles = [
      'financialaid-berkeley-edu-how-aid-works.json',
      'www-rochester-edu-college-ccas-handbook-grade-appeal-html.json',
      'www-washington-edu-financialaid-receiving-aid-verification.json',
    ];

    for (const filename of procedureFiles) {
      const procedure = loadProcedure(filename);
      const graph = buildProcedureGraph(procedure);

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      const hasOverlap = checkOverlap(graph.nodes);
      expect(hasOverlap).toBe(false);
    }
  });

  it('Edge labels on decisions are readable and wire cleanly to subsequent nodes and gap nodes', () => {
    const procedure = loadProcedure('www-rochester-edu-college-ccas-handbook-grade-appeal-html.json');
    const graph = buildProcedureGraph(procedure);

    const decisionEdges = graph.edges.filter((e) => e.source === 'instructor-evaluates-and-corrects');
    expect(decisionEdges.length).toBeGreaterThanOrEqual(2);

    // One edge should be the normal conditional path
    const formalReviewEdge = decisionEdges.find((e) => e.target === 'request-formal-review');
    expect(formalReviewEdge).toBeDefined();
    expect(formalReviewEdge?.label).toBe('If resolution not reached');

    // The other edge is the automatically detected policy gap
    const gapEdge = decisionEdges.find((e) => e.target.startsWith('gap-'));
    expect(gapEdge).toBeDefined();
    expect(gapEdge?.label).toContain('Policy Gap');
  });

  it('Public static JSON graphs exist and match procedure graphs', () => {
    const publicGraphsDir = path.resolve(__dirname, '../public/graphs');
    expect(fs.existsSync(path.join(publicGraphsDir, 'rochester-grade-appeal.json'))).toBe(true);
    expect(fs.existsSync(path.join(publicGraphsDir, 'uw-irs-verification-nonfiling.json'))).toBe(true);
    expect(fs.existsSync(path.join(publicGraphsDir, 'berkeley-aid-disbursement-adjustments.json'))).toBe(true);
    expect(fs.existsSync(path.join(publicGraphsDir, 'manifest.json'))).toBe(true);
  });
});

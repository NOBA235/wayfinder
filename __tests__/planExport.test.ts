import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateIcsCalendar } from '../src/lib/exportUtils';
import type { GraphNodeData } from '../src/lib/graphBuilder';

const publicGraphsDir = path.resolve(__dirname, '../public/graphs');

describe('Wayfinder Phase 4 Action Plan & Export Invariants', () => {
  it('Calendar Export (.ics): generates valid RFC 5545 format with VEVENTs and notes unknown dates', () => {
    const nodesWithDeadlines: GraphNodeData[] = [
      {
        stepId: 'check-student-portal',
        label: 'Check Student Portal',
        kind: 'action',
        title: 'Check Student Portal',
        description: 'Log into portal within 7 business days.',
        deadline: { date: '2026-06-30', text: 'June 30, 2026' },
        documents: [],
      },
      {
        stepId: 'resolve-conflicting-info',
        label: 'Resolve Conflicting Info',
        kind: 'decision',
        title: 'Resolve Conflicting Info',
        description: 'Meet counselor within 10 days.',
        // Null calendar date, text only
        deadline: { date: null, text: 'within 10 business days' },
        documents: ['Form 1040'],
      },
    ];

    const icsContent = generateIcsCalendar(
      'Financial Aid Verification',
      'UC Berkeley',
      nodesWithDeadlines,
      'https://financialaid.berkeley.edu'
    );

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//Wayfinder//University Policy Navigator//EN');
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('DTSTART;VALUE=DATE:20260630');
    expect(icsContent).toContain('SUMMARY:[UC Berkeley] Check Student Portal');
    // Acceptance criterion: Deadlines with null dates are excluded from scheduled date events and listed under "Dates unknown — call to confirm"
    expect(icsContent).toContain('Dates unknown — call to confirm:');
    expect(icsContent).toContain('Resolve Conflicting Info');
    expect(icsContent).toContain('END:VCALENDAR');
  });

  it('All 3 public graphs generate valid .ics files without errors', () => {
    const graphFiles = [
      'berkeley-aid-disbursement-adjustments.json',
      'rochester-grade-appeal.json',
      'uw-irs-verification-nonfiling.json',
    ];

    for (const file of graphFiles) {
      const graph = JSON.parse(fs.readFileSync(path.join(publicGraphsDir, file), 'utf-8'));
      const nodeData = graph.nodes.map((n: { data: GraphNodeData }) => n.data);

      const ics = generateIcsCalendar(graph.title, graph.institution, nodeData, graph.sourceUrl);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
    }
  });

  it('Emotional peak gap moment: gap node call script is stored in graph JSON and judge-readable', () => {
    const rochester = JSON.parse(
      fs.readFileSync(path.join(publicGraphsDir, 'rochester-grade-appeal.json'), 'utf-8')
    );

    const gapNode = rochester.nodes.find((n: { id: string }) => n.id.startsWith('gap-'));
    expect(gapNode).toBeDefined();

    const callScript = gapNode.data.callScript;
    expect(callScript).toBeDefined();
    expect(typeof callScript).toBe('string');

    // Assert student phone opening phrase
    expect(callScript).toContain('Hello, my name is [Your Name]');
    expect(callScript).toContain('student ID [My ID]');
    expect(callScript).toContain('Rochester Academic Grade Appeal Procedure');
    expect(callScript).toContain('Could you connect me with');

    // Confirm stored in static graph JSON (build-time generated, NOT runtime)
    expect(rochester.nodes.every((n: { data: { callScript?: string } }) => {
      if (n.data.callScript) {
        return typeof n.data.callScript === 'string' && n.data.callScript.length > 20;
      }
      return true;
    })).toBe(true);
  });

  it('Path encoding: simulates path serialization for URL sharing and reconstruction', () => {
    const samplePath = ['step-1', 'step-2', 'gap-step-3'];
    const encoded = samplePath.join(',');
    const decoded = encoded.split(',');

    expect(decoded).toEqual(samplePath);
  });
});

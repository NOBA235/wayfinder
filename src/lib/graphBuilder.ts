import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Procedure, Step, Contact, StepType } from '../types/procedure';

export type NodeKind = StepType | 'gap';

export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  kind: NodeKind;
  stepId: string;
  title: string;
  description: string;
  source_sentence?: string;
  deadline?: Step['deadline'];
  documents?: string[];
  contact?: Contact | null;
  callScript?: string;
  fallback_contact?: Contact | null;
  grounded?: boolean;
}

export type RFNode = Node<GraphNodeData>;
export type RFEdge = Edge;

export interface GraphBuildResult {
  nodes: RFNode[];
  edges: RFEdge[];
}

export interface IGraphBuilder {
  buildGraph(procedure: Procedure): GraphBuildResult;
}

function generateCallScript(
  procedureTitle: string,
  stepLabel: string,
  gapDescription: string,
  contactName?: string | null
): string {
  const target = contactName ? contactName : 'an academic advisor';
  const cleanDesc = gapDescription
    .replace(/^This policy does not specify what happens if\s*/i, '')
    .replace(/^Policy Gap:\s*/i, '');
  return `Hello, my name is [Your Name], student ID [My ID]. I am following the university's ${procedureTitle} for "${stepLabel}". The official policy does not specify what to do if ${cleanDesc}. Could you connect me with ${target} to confirm how I should proceed?`;
}

/**
 * Deterministically constructs a React Flow compatible graph from a Procedure object.
 * Enforces pure deterministic execution with Dagre auto-layout and rule-based gap detection.
 */
export function buildProcedureGraph(procedure: Procedure): GraphBuildResult {
  const nodes: RFNode[] = [];
  const edges: RFEdge[] = [];

  // Step 1: Map all explicit procedure steps to React Flow nodes
  for (const step of procedure.steps) {
    const node: RFNode = {
      id: step.id,
      type: 'default',
      position: { x: 0, y: 0 },
      data: {
        label: `[${step.type.toUpperCase()}] ${step.label}`,
        kind: step.type,
        stepId: step.id,
        title: step.label,
        description: step.description_plain,
        source_sentence: step.source_sentence,
        deadline: step.deadline,
        documents: step.documents,
        contact: step.contact,
        grounded: step.grounded,
      },
    };
    nodes.push(node);
  }

  // Step 2: Wire edges from procedure.edges
  for (const edge of procedure.edges) {
    const edgeId = `${edge.from}->${edge.to}`;
    if (!edges.some((e) => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source: edge.from,
        target: edge.to,
        label: edge.condition || undefined,
        type: 'smoothstep',
      });
    }
  }

  // Step 3: Wire edges from depends_on if not already wired
  for (const step of procedure.steps) {
    for (const depId of step.depends_on) {
      const edgeId = `${depId}->${step.id}`;
      if (!edges.some((e) => e.source === depId && e.target === step.id)) {
        edges.push({
          id: edgeId,
          source: depId,
          target: step.id,
          type: 'smoothstep',
        });
      }
    }
  }

  // Step 4: Deterministic Gap Detection (Rule-based, NO LLM)

  // Rule 4a: Decision branch rule
  // If a decision step has fewer than 2 outgoing edges, emit a gap node
  const decisionSteps = procedure.steps.filter((s) => s.type === 'decision');
  for (const decisionStep of decisionSteps) {
    const outgoing = edges.filter((e) => e.source === decisionStep.id);
    if (outgoing.length < 2) {
      const existingConditions = outgoing
        .map((e) => (typeof e.label === 'string' ? e.label : null))
        .filter((lbl): lbl is string => Boolean(lbl));

      const conditionText =
        existingConditions.length > 0
          ? `not ${existingConditions.join(' / ')}`
          : 'an alternate resolution occurs';

      const gapId = `gap-${decisionStep.id}-unhandled`;
      const description = `This policy does not specify what happens if ${conditionText}.`;
      const fallbackContact =
        procedure.gaps[0]?.fallback_contact ||
        decisionStep.contact || {
          name: 'Academic Affairs / Department Ombudsman',
          email: null,
          phone: null,
        };

      const callScript = generateCallScript(
        procedure.title,
        decisionStep.label,
        description,
        fallbackContact.name
      );

      const gapNode: RFNode = {
        id: gapId,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: `⚠️ [POLICY GAP] ${description}`,
          kind: 'gap',
          stepId: gapId,
          title: `Policy Gap: Unhandled Branch`,
          description,
          callScript,
          fallback_contact: fallbackContact,
        },
      };

      nodes.push(gapNode);
      edges.push({
        id: `${decisionStep.id}->${gapId}`,
        source: decisionStep.id,
        target: gapId,
        label: 'Policy Gap: Unhandled Branch',
        type: 'smoothstep',
        animated: true,
      });
    }
  }

  // Rule 4b: Deadline step with missing deadline rule
  // If step has type=deadline but deadline is null/empty, emit a gap node with fallback contact
  const deadlineSteps = procedure.steps.filter((s) => s.type === 'deadline');
  for (const dlStep of deadlineSteps) {
    const hasDeadline =
      dlStep.deadline &&
      (Boolean(dlStep.deadline.date) || Boolean(dlStep.deadline.text));

    if (!hasDeadline) {
      const gapId = `gap-${dlStep.id}-missing-deadline`;
      const description = `This policy does not specify an explicit calendar date or timeframe for "${dlStep.label}".`;
      const fallbackContact =
        procedure.gaps[0]?.fallback_contact ||
        dlStep.contact || {
          name: 'Office of the Registrar',
          email: null,
          phone: null,
        };

      const callScript = generateCallScript(
        procedure.title,
        dlStep.label,
        description,
        fallbackContact.name
      );

      const gapNode: RFNode = {
        id: gapId,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: `⚠️ [POLICY GAP] Unspecified Deadline`,
          kind: 'gap',
          stepId: gapId,
          title: 'Policy Gap: Unspecified Deadline',
          description,
          callScript,
          fallback_contact: fallbackContact,
        },
      };

      nodes.push(gapNode);
      edges.push({
        id: `${dlStep.id}->${gapId}`,
        source: dlStep.id,
        target: gapId,
        label: 'Policy Gap: Missing Deadline',
        type: 'smoothstep',
        animated: true,
      });
    }
  }

  // Rule 4c: Explicit gaps from procedure.gaps
  procedure.gaps.forEach((gap, idx) => {
    const gapId = `gap-${gap.after_step}-${idx}`;
    // Check if node already exists
    if (!nodes.some((n) => n.id === gapId)) {
      const parentStep = procedure.steps.find((s) => s.id === gap.after_step);
      const fallbackContact =
        gap.fallback_contact || {
          name: 'Student Ombudsperson / Dean of Students',
          email: null,
          phone: null,
        };

      const callScript = generateCallScript(
        procedure.title,
        parentStep?.label || 'General Policy',
        gap.description,
        fallbackContact.name
      );

      const gapNode: RFNode = {
        id: gapId,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: `⚠️ [POLICY GAP] ${gap.description}`,
          kind: 'gap',
          stepId: gapId,
          title: `Policy Gap: Uncovered Procedure`,
          description: gap.description,
          callScript,
          fallback_contact: fallbackContact,
        },
      };

      nodes.push(gapNode);
      if (parentStep) {
        edges.push({
          id: `${parentStep.id}->${gapId}`,
          source: parentStep.id,
          target: gapId,
          label: 'Policy Gap',
          type: 'smoothstep',
          animated: true,
        });
      }
    }
  });

  // Step 5: Auto-layout with Dagre (No manual coordinates)
  return layoutGraph(nodes, edges);
}

/**
 * Pure deterministic DAG auto-layout using Dagre.
 */
export function layoutGraph(
  nodes: RFNode[],
  edges: RFEdge[],
  direction: 'TB' | 'LR' = 'TB'
): GraphBuildResult {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 260;
  const nodeHeight = 80;

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const positionedNodes: RFNode[] = nodes.map((node) => {
    const nodePos = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: Math.round(nodePos.x - nodeWidth / 2),
        y: Math.round(nodePos.y - nodeHeight / 2),
      },
    };
  });

  return { nodes: positionedNodes, edges };
}

export class GraphBuilder implements IGraphBuilder {
  buildGraph(procedure: Procedure): GraphBuildResult {
    return buildProcedureGraph(procedure);
  }
}

export const defaultGraphBuilder: IGraphBuilder = new GraphBuilder();

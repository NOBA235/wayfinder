import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ProcedureNode, type CustomNodeData } from './ProcedureNode';
import { CitationSidePanel } from './CitationSidePanel';
import type { GraphNodeData } from '../lib/graphBuilder';

interface StaticProcedureGraph {
  id: string;
  title: string;
  institution: string;
  sourceUrl: string;
  retrieved_at: string;
  verified: boolean;
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
}

export default function MapView() {
  const { procedureId } = useParams<{ procedureId: string }>();
  const activeId = procedureId || 'rochester-grade-appeal';

  const [rawGraph, setRawGraph] = useState<StaticProcedureGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<GraphNodeData> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active branch path filtering: set of highlighted node IDs
  const [activeBranchChoice, setActiveBranchChoice] = useState<{
    decisionId: string;
    targetId: string;
    label: string;
  } | null>(null);

  // Load graph from /graphs/:procedureId.json
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setActiveBranchChoice(null);

    fetch(`/graphs/${activeId}.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Procedure "${activeId}" not found (HTTP ${res.status}).`);
        }
        return res.json() as Promise<StaticProcedureGraph>;
      })
      .then((data) => {
        setRawGraph(data);
        setLoading(false);
      })
      .catch((err) => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, [activeId]);

  // Handle keyboard navigation: Esc to close panel, Enter to open focused node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handler when user clicks a branch on a decision card or edge
  const handleSelectBranch = useCallback((decisionNodeId: string, targetNodeId: string) => {
    if (!rawGraph) return;

    // Find the edge connecting decision to target
    const edge = rawGraph.edges.find(
      (e) => e.source === decisionNodeId && e.target === targetNodeId
    );
    const branchLabel = typeof edge?.label === 'string' ? edge.label : 'Selected branch';

    // Toggle off if already selected
    if (activeBranchChoice?.decisionId === decisionNodeId && activeBranchChoice.targetId === targetNodeId) {
      setActiveBranchChoice(null);
    } else {
      setActiveBranchChoice({
        decisionId: decisionNodeId,
        targetId: targetNodeId,
        label: branchLabel,
      });
    }
  }, [rawGraph, activeBranchChoice]);

  // Compute downstream nodes from a starting node
  const downstreamNodeIds = useMemo(() => {
    if (!rawGraph || !activeBranchChoice) return null;

    const downstream = new Set<string>();
    const queue = [activeBranchChoice.targetId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      downstream.add(current);
      for (const edge of rawGraph.edges) {
        if (edge.source === current && !downstream.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    // Also include upstream nodes that led to the decision
    const upstream = new Set<string>();
    const upQueue = [activeBranchChoice.decisionId];
    while (upQueue.length > 0) {
      const curr = upQueue.shift()!;
      upstream.add(curr);
      for (const edge of rawGraph.edges) {
        if (edge.target === curr && !upstream.has(edge.source)) {
          upQueue.push(edge.source);
        }
      }
    }

    const activeSet = new Set<string>([...downstream, ...upstream]);
    return activeSet;
  }, [rawGraph, activeBranchChoice]);

  // Process nodes to inject branch handlers, outgoing branches, and dimmed states
  const renderedNodes = useMemo(() => {
    if (!rawGraph) return [];

    return rawGraph.nodes.map((node) => {
      const isSelected = selectedNode?.id === node.id;
      const isDimmed = downstreamNodeIds !== null && !downstreamNodeIds.has(node.id);
      const isHighlighted = downstreamNodeIds !== null && downstreamNodeIds.has(node.id);

      // Collect outgoing branches if it's a decision node
      const outgoingEdges = rawGraph.edges.filter((e) => e.source === node.id);
      const outgoingBranches = outgoingEdges.map((e) => ({
        targetId: e.target,
        label: typeof e.label === 'string' ? e.label : 'Branch',
        isSelected: activeBranchChoice?.targetId === e.target,
      }));

      const customData: CustomNodeData = {
        ...node.data,
        isDimmed,
        isSelected,
        isPathHighlighted: isHighlighted,
        onSelectBranch: handleSelectBranch,
        outgoingBranches: outgoingBranches.length > 0 ? outgoingBranches : undefined,
      };

      return {
        ...node,
        type: 'procedureNode',
        data: customData,
      };
    });
  }, [rawGraph, selectedNode, downstreamNodeIds, activeBranchChoice, handleSelectBranch]);

  // Process edges for highlighted / dimmed visual styling
  const renderedEdges = useMemo(() => {
    if (!rawGraph) return [];

    return rawGraph.edges.map((edge) => {
      const isFromDecision = activeBranchChoice?.decisionId === edge.source;
      const isChosenBranch = isFromDecision && activeBranchChoice?.targetId === edge.target;
      const isAltBranch = isFromDecision && activeBranchChoice?.targetId !== edge.target;

      let stroke = '#64748b'; // slate-500 default
      let strokeWidth = 2;
      let opacity = 0.8;

      if (downstreamNodeIds !== null) {
        if (downstreamNodeIds.has(edge.source) && downstreamNodeIds.has(edge.target)) {
          stroke = '#38bdf8'; // sky-400 active path
          strokeWidth = 3;
          opacity = 1;
        } else if (isAltBranch) {
          opacity = 0.25;
        } else {
          opacity = 0.35;
        }
      }

      if (isChosenBranch) {
        stroke = '#a855f7'; // purple-500
        strokeWidth = 3;
        opacity = 1;
      }

      return {
        ...edge,
        animated: edge.animated || isChosenBranch,
        style: {
          stroke,
          strokeWidth,
          opacity,
          transition: 'all 0.3s ease',
        },
        labelStyle: {
          fill: isChosenBranch ? '#d8b4fe' : '#94a3b8',
          fontWeight: isChosenBranch ? 700 : 500,
          fontSize: 11,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      };
    });
  }, [rawGraph, downstreamNodeIds, activeBranchChoice]);

  // React Flow custom node types registry
  const nodeTypes = useMemo(
    () => ({
      procedureNode: ProcedureNode,
      default: ProcedureNode,
    }),
    []
  );

  // Formatted date
  const formattedDate = useMemo(() => {
    if (!rawGraph?.retrieved_at) return '';
    try {
      const d = new Date(rawGraph.retrieved_at);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Nov 2026';
    }
  }, [rawGraph?.retrieved_at]);

  const gapCount = rawGraph?.nodes.filter((n) => n.data.kind === 'gap').length || 0;
  const isVerified = rawGraph?.verified ?? true;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl px-5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            aria-label="Back to all situations"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">All Situations</span>
          </Link>

          <div className="h-4 w-px bg-slate-800" />

          {rawGraph && (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1">
                  {rawGraph.title}
                </h1>
                <span className="text-xs text-slate-400 hidden md:inline">
                  • {rawGraph.institution}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span>Retrieved: {formattedDate}</span>
                {gapCount > 0 && (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    • <AlertTriangle className="w-3 h-3" /> {gapCount} Policy Gap{gapCount > 1 ? 's' : ''} detected
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Header Status / Branch Filter */}
        <div className="flex items-center gap-3">
          {activeBranchChoice && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs">
              <span className="text-purple-300 font-medium truncate max-w-[180px]">
                Branch: {activeBranchChoice.label}
              </span>
              <button
                type="button"
                onClick={() => setActiveBranchChoice(null)}
                className="text-purple-400 hover:text-white p-0.5 rounded hover:bg-purple-900"
                title="Reset branch highlight"
                aria-label="Reset branch highlight"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {rawGraph && (
            <div className="flex items-center gap-2">
              {isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Grounding
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Unverified Policy
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Canvas + Right Side Citation Panel */}
      <div className="flex-1 flex relative overflow-hidden bg-slate-950">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-30">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-medium text-slate-300">
                Loading procedure map...
              </div>
            </div>
          </div>
        )}

        {/* Error State: Procedure Not Found */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-30 p-6">
            <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Procedure Not Found</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                {error}
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Situations
              </Link>
            </div>
          </div>
        )}

        {/* React Flow Canvas */}
        {rawGraph && (
          <div className="flex-1 h-full w-full relative">
            <ReactFlow
              nodes={renderedNodes}
              edges={renderedEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              onNodeClick={(_event, node) => setSelectedNode(node as Node<GraphNodeData>)}
              onEdgeClick={(_event, edge) => {
                if (edge.source && edge.target) {
                  handleSelectBranch(edge.source, edge.target);
                }
              }}
              className="bg-slate-950"
            >
              <Background color="#1e293b" gap={24} size={1} />
              <Controls className="bg-slate-900 border-slate-800 fill-slate-300 stroke-slate-300 text-slate-300" />
              <MiniMap
                nodeColor={(node) => {
                  if (node.data?.kind === 'gap') return '#f59e0b';
                  if (node.data?.kind === 'decision') return '#a855f7';
                  return '#0ea5e9';
                }}
                className="bg-slate-900 border-slate-800"
              />
            </ReactFlow>

            {/* Instruction pill at bottom */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none z-10 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] text-slate-400 shadow-xl">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Click any node to inspect citations • Click decision branches to highlight paths</span>
            </div>
          </div>
        )}

        {/* Right-Side Citation and Step Panel */}
        {selectedNode && rawGraph && (
          <CitationSidePanel
            nodeData={selectedNode.data}
            sourceUrl={rawGraph.sourceUrl}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}

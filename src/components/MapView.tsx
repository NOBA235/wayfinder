import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
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
  Printer,
  CalendarPlus,
  Share2,
  Check,
  Calendar,
} from 'lucide-react';
import { ProcedureNode, type CustomNodeData } from './ProcedureNode';
import { CitationSidePanel } from './CitationSidePanel';
import { ChecklistView } from './ChecklistView';
import { generateIcsCalendar, downloadFile } from '../lib/exportUtils';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = procedureId || 'rochester-grade-appeal';

  const [rawGraph, setRawGraph] = useState<StaticProcedureGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<GraphNodeData> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Path state: ordered array of step IDs
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);
  const [checklistOpen, setChecklistOpen] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // Active branch choice state
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

        // Check if shared path is encoded in URL
        const pathParam = searchParams.get('path');
        if (pathParam) {
          const ids = pathParam.split(',').filter(Boolean);
          setSelectedPathIds(ids);
          // Auto-select the last node in the shared path for inspection
          const lastNode = data.nodes.find((n) => n.id === ids[ids.length - 1]);
          if (lastNode) {
            setSelectedNode(lastNode);
          }
        } else {
          // Initialize selectedPath with the natural initial root path
          const initialIds = data.nodes
            .filter((n) => n.data.kind !== 'gap')
            .slice(0, 3)
            .map((n) => n.id);
          setSelectedPathIds(initialIds);
        }
      })
      .catch((err) => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, [activeId, searchParams]);

  // Handle keyboard navigation: Esc to close panels, Enter on nodes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setChecklistOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update URL search params when selectedPathIds changes
  const updateUrlPath = useCallback(
    (newPath: string[]) => {
      setSelectedPathIds(newPath);
      const params = new URLSearchParams(searchParams);
      if (newPath.length > 0) {
        params.set('path', newPath.join(','));
      } else {
        params.delete('path');
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Handler when user clicks a branch on a decision card or edge
  const handleSelectBranch = useCallback(
    (decisionNodeId: string, targetNodeId: string) => {
      if (!rawGraph) return;

      const edge = rawGraph.edges.find(
        (e) => e.source === decisionNodeId && e.target === targetNodeId
      );
      const branchLabel = typeof edge?.label === 'string' ? edge.label : 'Selected branch';

      // Compute new path: preserve path up to decision, append targetNodeId and its downstream nodes
      const decisionIndex = selectedPathIds.indexOf(decisionNodeId);
      const prefix = decisionIndex !== -1 ? selectedPathIds.slice(0, decisionIndex + 1) : [decisionNodeId];

      const downstream: string[] = [targetNodeId];
      const queue = [targetNodeId];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const e of rawGraph.edges) {
          if (e.source === curr && !downstream.includes(e.target)) {
            downstream.push(e.target);
            queue.push(e.target);
          }
        }
      }

      const combinedPath = Array.from(new Set([...prefix, ...downstream]));
      updateUrlPath(combinedPath);

      setActiveBranchChoice({
        decisionId: decisionNodeId,
        targetId: targetNodeId,
        label: branchLabel,
      });

      // Focus the chosen target node in the inspector
      const targetNode = rawGraph.nodes.find((n) => n.id === targetNodeId);
      if (targetNode) {
        setSelectedNode(targetNode);
      }
    },
    [rawGraph, selectedPathIds, updateUrlPath]
  );

  // Handler when user clicks any node on the canvas
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
      setSelectedNode(node);
      // If node is not in selected path, append it
      if (!selectedPathIds.includes(node.id)) {
        updateUrlPath([...selectedPathIds, node.id]);
      }
    },
    [selectedPathIds, updateUrlPath]
  );

  // Set of active path node IDs for visual highlighting
  const activePathSet = useMemo(() => new Set(selectedPathIds), [selectedPathIds]);

  // Process nodes to inject branch handlers, outgoing branches, and dimmed states
  const renderedNodes = useMemo(() => {
    if (!rawGraph) return [];

    return rawGraph.nodes.map((node) => {
      const isSelected = selectedNode?.id === node.id;
      const isInPath = activePathSet.has(node.id);
      const isDimmed = activePathSet.size > 0 && !isInPath;

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
        isPathHighlighted: isInPath,
        onSelectBranch: handleSelectBranch,
        outgoingBranches: outgoingBranches.length > 0 ? outgoingBranches : undefined,
      };

      return {
        ...node,
        type: 'procedureNode',
        data: customData,
      };
    });
  }, [rawGraph, selectedNode, activePathSet, activeBranchChoice, handleSelectBranch]);

  // Process edges for highlighted / dimmed visual styling
  const renderedEdges = useMemo(() => {
    if (!rawGraph) return [];

    return rawGraph.edges.map((edge) => {
      const isSourceInPath = activePathSet.has(edge.source);
      const isTargetInPath = activePathSet.has(edge.target);
      const isInPath = isSourceInPath && isTargetInPath;

      const isFromDecision = activeBranchChoice?.decisionId === edge.source;
      const isChosenBranch = isFromDecision && activeBranchChoice?.targetId === edge.target;

      let stroke = '#64748b'; // slate-500 default
      let strokeWidth = 2;
      let opacity = 0.8;

      if (isInPath || isChosenBranch) {
        stroke = '#38bdf8'; // sky-400 active path
        strokeWidth = 3;
        opacity = 1;
      } else if (activePathSet.size > 0) {
        opacity = 0.25;
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
          fill: isInPath ? '#e0f2fe' : '#94a3b8',
          fontWeight: isInPath ? 700 : 500,
          fontSize: 11,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      };
    });
  }, [rawGraph, activePathSet, activeBranchChoice]);

  // Map node types
  const nodeTypes = useMemo(
    () => ({
      procedureNode: ProcedureNode,
      default: ProcedureNode,
    }),
    []
  );

  // Nodes currently in the student's selected path
  const pathNodes = useMemo(() => {
    if (!rawGraph) return [];
    return selectedPathIds
      .map((id) => rawGraph.nodes.find((n) => n.id === id)?.data)
      .filter((d): d is GraphNodeData => Boolean(d));
  }, [rawGraph, selectedPathIds]);

  // Stats for the sticky bottom bar
  const totalPathSteps = pathNodes.filter((n) => n.kind !== 'gap').length;
  const totalPathDocs = Array.from(
    new Set(pathNodes.flatMap((n) => n.documents || []))
  ).length;

  // Next deadline calculation
  const nextDeadline = useMemo(() => {
    for (const node of pathNodes) {
      if (node.deadline) {
        if (node.deadline.date) return node.deadline.date;
        if (node.deadline.text) return node.deadline.text;
      }
    }
    return null;
  }, [pathNodes]);

  // Handler for sharing path link
  const handleSharePath = async () => {
    const fullUrl = window.location.href;
    await navigator.clipboard.writeText(fullUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Handler for exporting calendar .ics
  const handleExportCalendar = () => {
    if (!rawGraph) return;
    const icsContent = generateIcsCalendar(
      rawGraph.title,
      rawGraph.institution,
      pathNodes,
      rawGraph.sourceUrl
    );
    downloadFile(icsContent, `${activeId}-deadlines.ics`, 'text/calendar;charset=utf-8');
  };

  // Reset Path
  const handleResetPath = () => {
    if (!rawGraph) return;
    const initialIds = rawGraph.nodes
      .filter((n) => n.data.kind !== 'gap')
      .slice(0, 3)
      .map((n) => n.id);
    updateUrlPath(initialIds);
    setActiveBranchChoice(null);
  };

  // Formatted retrieved date
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

        {/* Right Header Status & Share */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSharePath}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            title="Share this path with a counselor or friend"
          >
            {shareCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Path</span>
              </>
            )}
          </button>

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
              onNodeClick={handleNodeClick}
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] text-slate-400 shadow-xl">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Click branches to navigate your path • Unselected paths dim but stay visible</span>
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

      {/* PHASE 4: STICKY BOTTOM BAR */}
      {rawGraph && (
        <footer
          aria-label="Your Path Summary"
          className="h-16 border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-xl px-6 flex items-center justify-between z-20 shrink-0 shadow-2xl"
        >
          {/* Path Stats */}
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <span className="font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
              Your Path:
            </span>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                <strong className="text-white">{totalPathSteps}</strong> steps
              </span>
              <span>·</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                <strong className="text-white">{totalPathDocs}</strong> documents
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                next deadline:
                <strong className="text-rose-300 font-semibold ml-0.5">
                  {nextDeadline || 'None specified'}
                </strong>
              </span>
            </div>
          </div>

          {/* Action Buttons: Print Checklist & Add to Calendar */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetPath}
              className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset path to start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleExportCalendar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              title="Export deadlines to .ics calendar file"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Add to Calendar (.ics)</span>
              <span className="md:hidden">.ics</span>
            </button>

            <button
              type="button"
              onClick={() => setChecklistOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export Action Checklist</span>
            </button>
          </div>
        </footer>
      )}

      {/* Printable Checklist Modal */}
      {checklistOpen && rawGraph && (
        <ChecklistView
          procedureTitle={rawGraph.title}
          institution={rawGraph.institution}
          sourceUrl={rawGraph.sourceUrl}
          pathNodes={pathNodes}
          onClose={() => setChecklistOpen(false)}
        />
      )}
    </div>
  );
}

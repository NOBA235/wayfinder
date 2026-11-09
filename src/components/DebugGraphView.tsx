import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import { Compass, AlertTriangle, ShieldCheck, PhoneCall } from 'lucide-react';
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

const PROCEDURES = [
  { id: 'rochester-grade-appeal', label: 'Rochester: Grade Appeal' },
  { id: 'uw-irs-verification-nonfiling', label: 'UW: Tax Non-filing Verification' },
  { id: 'berkeley-aid-disbursement-adjustments', label: 'UC Berkeley: Aid Adjustments' },
];

export default function DebugGraphView() {
  const { procedureId } = useParams<{ procedureId: string }>();
  const activeId = procedureId || 'rochester-grade-appeal';

  const [graph, setGraph] = useState<StaticProcedureGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<GraphNodeData> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedNode(null);

    fetch(`/graphs/${activeId}.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status} loading /graphs/${activeId}.json`);
        }
        return res.json() as Promise<StaticProcedureGraph>;
      })
      .then((data) => {
        setGraph(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load graph:', err);
        setError((err as Error).message);
        setLoading(false);
      });
  }, [activeId]);

  const gapCount = graph?.nodes.filter((n) => n.data.kind === 'gap').length || 0;
  const stepCount = (graph?.nodes.length || 0) - gapCount;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Navigation & Procedure Selector */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/95 px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-white hover:text-sky-400 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-base">Wayfinder</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Debug Topology
              </span>
            </div>
          </Link>

          {/* Quick procedure switcher */}
          <nav className="flex items-center gap-2 pl-4 border-l border-slate-800">
            {PROCEDURES.map((p) => {
              const isActive = p.id === activeId;
              return (
                <Link
                  key={p.id}
                  to={`/debug/${p.id}`}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {p.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Stats Badges */}
        {graph && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
              Steps: <strong className="text-white">{stepCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Policy Gaps: <strong className="text-white">{gapCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verbatim Grounded
            </span>
          </div>
        )}
      </header>

      {/* Main Viewport */}
      <div className="flex-1 flex relative overflow-hidden bg-slate-950">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-30">
            <div className="text-sm font-medium text-slate-300 animate-pulse">
              Loading procedure graph topology...
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="p-6 max-w-md bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200">
              <h3 className="font-semibold text-base mb-1">Error Loading Procedure</h3>
              <p className="text-xs text-rose-300 font-mono">{error}</p>
            </div>
          </div>
        )}

        {/* React Flow Canvas (Default Nodes) */}
        {graph && (
          <div className="flex-1 h-full w-full relative">
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              onNodeClick={(_event, node) => setSelectedNode(node as Node<GraphNodeData>)}
              className="bg-slate-950"
            >
              <Background color="#1e293b" gap={20} size={1} />
              <Controls className="bg-slate-900 border-slate-800 fill-slate-300 stroke-slate-300 text-slate-300" />
              <MiniMap
                nodeColor={(node) => {
                  if (node.data?.kind === 'gap') return '#f59e0b';
                  if (node.data?.kind === 'decision') return '#8b5cf6';
                  return '#0284c7';
                }}
                className="bg-slate-900 border-slate-800"
              />
            </ReactFlow>
          </div>
        )}

        {/* Debug Node Inspection Panel */}
        {selectedNode && (
          <aside className="w-96 border-l border-slate-800 bg-slate-900/90 backdrop-blur-md p-5 flex flex-col gap-4 overflow-y-auto z-20 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    selectedNode.data.kind === 'gap'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {selectedNode.data.kind}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {selectedNode.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">
                {selectedNode.data.title || selectedNode.data.label}
              </h2>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {selectedNode.data.description}
              </p>
            </div>

            {/* Policy Gap: Phone Call Script */}
            {selectedNode.data.kind === 'gap' && selectedNode.data.callScript && (
              <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-1.5">
                  <PhoneCall className="w-3.5 h-3.5" />
                  What to Say on the Phone
                </div>
                <p className="text-xs italic leading-relaxed text-amber-100/90 bg-amber-950/60 p-2.5 rounded border border-amber-500/20 select-text">
                  "{selectedNode.data.callScript}"
                </p>
                {selectedNode.data.fallback_contact?.name && (
                  <p className="mt-2 text-[11px] text-amber-300/80 font-mono">
                    Target: {selectedNode.data.fallback_contact.name}
                  </p>
                )}
              </div>
            )}

            {/* Invariant 2: Grounded Verbatim Source Sentence */}
            {selectedNode.data.source_sentence && (
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-sky-400 mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verbatim Source Grounding
                </div>
                <blockquote className="text-xs italic text-slate-200 border-l-2 border-sky-500 pl-2.5 py-0.5 leading-relaxed select-text">
                  "{selectedNode.data.source_sentence}"
                </blockquote>
              </div>
            )}

            {/* Deadline information if present */}
            {selectedNode.data.deadline && (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">Deadline:</span>
                <span className="ml-2 font-mono text-white">
                  {selectedNode.data.deadline.text || selectedNode.data.deadline.date || 'None'}
                </span>
              </div>
            )}

            {/* Documents required */}
            {selectedNode.data.documents && selectedNode.data.documents.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs">
                <span className="text-slate-400 font-medium block mb-1">Required Documents:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-200">
                  {selectedNode.data.documents.map((doc, i) => (
                    <li key={i}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contact info if present */}
            {selectedNode.data.contact && (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs">
                <span className="text-slate-400 font-medium block mb-1">Contact:</span>
                <div className="space-y-0.5 text-slate-300 font-mono text-[11px]">
                  {selectedNode.data.contact.name && <div>{selectedNode.data.contact.name}</div>}
                  {selectedNode.data.contact.email && <div>{selectedNode.data.contact.email}</div>}
                  {selectedNode.data.contact.phone && <div>{selectedNode.data.contact.phone}</div>}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

import { ReactFlow, Background, Controls } from '@xyflow/react';
import { Compass, FileText } from 'lucide-react';

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* App Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 px-6 flex items-center justify-between backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              Wayfinder
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono font-normal">
                Phase 0
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Disabled Load Procedure Button */}
          <button
            type="button"
            disabled
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60"
            title="Load procedure is disabled in Phase 0"
          >
            <FileText className="w-3.5 h-3.5" />
            Load procedure
          </button>
        </div>
      </header>

      {/* Main Canvas Area: Empty React Flow Canvas */}
      <main className="flex-1 w-full relative bg-slate-950">
        <ReactFlow
          nodes={[]}
          edges={[]}
          fitView
          className="bg-slate-950"
        >
          <Background color="#334155" gap={24} size={1} />
          <Controls className="bg-slate-900 border-slate-800 fill-slate-300 stroke-slate-300 text-slate-300" />
        </ReactFlow>

        {/* Phase 0 Canvas Empty State Overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-md p-6 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md text-center shadow-2xl">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-medium text-slate-200">Interactive Policy Canvas</h2>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Wayfinder turns published university policies into deterministic visual procedure maps.
              Canvas mounted and ready for procedural graph ingestion.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

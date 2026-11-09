import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  MessageSquare,
  Check,
  Send,
  ExternalLink,
} from 'lucide-react';
import { wayfinderClient } from '../lib/client';
import type { SavedPath } from '../lib/repository/types';
import type { GraphNodeData } from '../lib/graphBuilder';

interface StaticProcedureGraph {
  id: string;
  title: string;
  institution: string;
  sourceUrl: string;
  retrieved_at: string;
  nodes: Array<{ id: string; data: GraphNodeData }>;
}

export default function CounselorView() {
  const { pathId } = useParams<{ pathId: string }>();

  const [savedPath, setSavedPath] = useState<SavedPath | null>(null);
  const [graphData, setGraphData] = useState<StaticProcedureGraph | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [savingNote, setSavingNote] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pathId) return;

    setLoading(true);
    wayfinderClient
      .getSavedPath(pathId)
      .then(async (path) => {
        if (!path) {
          throw new Error(`Saved path "${pathId}" could not be found.`);
        }
        setSavedPath(path);
        setNoteInput(path.counselorNote || '');

        // Fetch corresponding static graph for step details
        const res = await fetch(`/graphs/${path.procedureId}.json`);
        if (res.ok) {
          const json = await res.json();
          setGraphData(json);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, [pathId]);

  const handleSaveNote = async () => {
    if (!pathId || !noteInput.trim()) return;

    setSavingNote(true);
    try {
      const updated = await wayfinderClient.saveCounselorNote(pathId, noteInput.trim());
      setSavedPath(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert(`Failed to save counselor note: ${(err as Error).message}`);
    } finally {
      setSavingNote(false);
    }
  };

  // Find step data for chosen steps
  const pathStepDetails = (savedPath?.selectedStepIds || [])
    .map((id) => graphData?.nodes.find((n) => n.id === id)?.data)
    .filter((d): d is GraphNodeData => Boolean(d));

  const gaps = pathStepDetails.filter((d) => d.kind === 'gap');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-sky-500/30 selection:text-white">
      {/* Counselor Review Top Banner */}
      <div className="bg-indigo-950/80 border-b border-indigo-800/80 px-6 py-2.5 text-xs text-indigo-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <strong className="text-white font-semibold">Counselor Review Mode</strong>
          <span>• Read-only student roadmap review (Gate: Counselor Query/ID)</span>
        </div>
        <span className="text-[11px] font-mono text-indigo-300">
          No student PII collected
        </span>
      </div>

      {/* Main Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            to="/saved"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Saved Paths</span>
          </Link>

          <div className="h-4 w-px bg-slate-800" />

          {savedPath && (
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Reviewing Plan: {savedPath.studentName || 'Student'}
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                {savedPath.institution} • {savedPath.procedureTitle}
              </p>
            </div>
          )}
        </div>

        {savedPath && (
          <Link
            to={`/map/${savedPath.procedureId}?path=${savedPath.selectedStepIds.join(',')}&savedId=${savedPath.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition-colors"
          >
            <span>Open in Map View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </header>

      {/* Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
            Loading student roadmap for review...
          </div>
        ) : error || !savedPath ? (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <h2 className="text-base font-bold text-white">Review Link Not Found</h2>
            <p className="text-xs text-slate-400 font-mono">{error}</p>
            <Link
              to="/saved"
              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline pt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Saved Paths
            </Link>
          </div>
        ) : (
          <>
            {/* Student Journey Summary */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono">
                    Student Selected Path
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">
                    {savedPath.procedureTitle}
                  </h2>
                </div>
                <div className="text-right text-xs font-mono text-slate-400">
                  <div>{savedPath.selectedStepIds.length} steps selected</div>
                  <div>Saved: {new Date(savedPath.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Policy Gaps Encountered */}
              {gaps.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Student Encountered {gaps.length} Policy Gap{gaps.length > 1 ? 's' : ''}
                  </div>
                  <p className="text-xs text-amber-200/90">
                    The student reached unhandled branches where university policy provides no automated steps:
                  </p>
                  <ul className="space-y-2 pt-1">
                    {gaps.map((gap, i) => (
                      <li
                        key={i}
                        className="text-xs text-amber-100 bg-amber-950/50 p-2.5 rounded-lg border border-amber-500/20 space-y-1"
                      >
                        <div className="font-semibold text-amber-200">
                          {gap.title}
                        </div>
                        <div className="text-[11px] text-amber-300/80">
                          {gap.description}
                        </div>
                        {gap.callScript && (
                          <div className="text-[11px] italic bg-amber-950/80 p-2 rounded text-amber-100 border border-amber-500/30 mt-1">
                            <span className="font-bold not-italic block text-[10px] text-amber-400">
                              Student's Prepared Phone Script:
                            </span>
                            "{gap.callScript}"
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Steps in Order */}
              <div className="space-y-2.5 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Sequence of Steps Chosen by Student:
                </h3>
                <ol className="space-y-2">
                  {pathStepDetails.map((step, idx) => (
                    <li
                      key={step.stepId}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {step.title || step.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {step.kind !== 'gap' && step.grounded === false && (
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                                ⚠️ UNGROUNDED
                              </span>
                            )}
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {step.kind}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Counselor Note Section (Required by Phase 5) */}
            <section
              aria-labelledby="counselor-notes-heading"
              className="p-6 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 id="counselor-notes-heading" className="text-sm font-bold text-white uppercase tracking-wider">
                    Counselor Advisory Notes & Next Actions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add official recommendations or guidance for the student. These notes are saved alongside the path.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="counselor-note-textarea" className="sr-only">
                  Counselor Note
                </label>
                <textarea
                  id="counselor-note-textarea"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="e.g. Reviewed student grade appeal submission. Advised student to contact Professor Miller before Friday 5 PM. If no response by Monday, proceed directly to Department Chair review with Form A..."
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-slate-100 text-xs leading-relaxed outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-slate-400 font-mono">
                  {saveSuccess && (
                    <span className="text-emerald-400 flex items-center gap-1 font-sans font-medium animate-in fade-in">
                      <Check className="w-4 h-4" /> Note persisted successfully!
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={savingNote || !noteInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{savingNote ? 'Saving...' : 'Save Counselor Note'}</span>
                </button>
              </div>

              {/* Existing notes history if present */}
              {savedPath.counselorNotes && savedPath.counselorNotes.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Notes History ({savedPath.counselorNotes.length})
                  </h4>
                  <div className="space-y-2">
                    {savedPath.counselorNotes.map((n, i) => (
                      <div
                        key={i}
                        className="text-xs p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-200 italic"
                      >
                        "{n}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

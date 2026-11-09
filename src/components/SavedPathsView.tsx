import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  Building2,
  Trash2,
  Share2,
  Check,
  MessageSquare,
} from 'lucide-react';
import { wayfinderClient } from '../lib/client';
import type { SavedPath } from '../lib/repository/types';

export default function SavedPathsView() {
  const [paths, setPaths] = useState<SavedPath[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadPaths = async () => {
    setLoading(true);
    try {
      const data = await wayfinderClient.listSavedPaths();
      setPaths(data);
    } catch (err) {
      console.error('Failed to list saved paths:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaths();
  }, []);

  const handleDelete = async (pathId: string) => {
    if (window.confirm('Are you sure you want to delete this saved path?')) {
      await wayfinderClient.deleteSavedPath(pathId);
      await loadPaths();
    }
  };

  const handleShareCounselor = async (path: SavedPath) => {
    const counselorUrl = `${window.location.origin}/counselor/${path.id}`;
    await navigator.clipboard.writeText(counselorUrl);
    setCopiedId(path.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-sky-500/30 selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 sm:px-10 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Situations</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Bookmark className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold text-white tracking-tight">
              My Saved Paths
            </h1>
          </div>
        </div>

        <Link
          to="/"
          className="text-xs px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors font-medium border border-slate-700"
        >
          Explore New Situation
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 sm:px-10 py-10 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Your Bookmarked Action Plans
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Review your customized procedural journeys, resume exploration, or share with an academic counselor.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 animate-pulse text-sm">
            Loading saved paths...
          </div>
        ) : paths.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No saved paths yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore any university situation and click <strong className="text-slate-200">"Save Path"</strong> in the bottom bar to bookmark your journey here.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors"
            >
              Choose a Situation <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* List of Saved Paths */
          <div className="grid grid-cols-1 gap-4">
            {paths.map((p) => {
              const formattedDate = new Date(p.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const resumeUrl = `/map/${p.procedureId}?path=${p.selectedStepIds.join(',')}&savedId=${p.id}`;

              return (
                <div
                  key={p.id}
                  className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-lg"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-semibold text-sky-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {p.institution}
                      </span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                      {p.studentName && (
                        <>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-slate-300 font-medium font-sans">
                            Plan: {p.studentName}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">
                      {p.procedureTitle}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono pt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                        {p.selectedStepIds.length} steps chosen
                      </span>
                      {p.counselorNote && (
                        <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-sans font-medium">
                          <MessageSquare className="w-3.5 h-3.5" /> Counselor Note Added
                        </span>
                      )}
                    </div>

                    {/* Counselor note preview */}
                    {p.counselorNote && (
                      <p className="mt-2 text-xs italic text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        "{p.counselorNote}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleShareCounselor(p)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                      title="Copy Counselor Review Link"
                    >
                      {copiedId === p.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Counselor Link</span>
                        </>
                      )}
                    </button>

                    <Link
                      to={resumeUrl}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20"
                    >
                      <span>Resume Map</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                      title="Delete saved path"
                      aria-label="Delete saved path"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

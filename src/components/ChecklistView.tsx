import React from 'react';
import { X, Printer, ShieldCheck, FileText, Calendar, Building2, PhoneCall } from 'lucide-react';
import type { GraphNodeData } from '../lib/graphBuilder';

interface ChecklistViewProps {
  procedureTitle: string;
  institution: string;
  sourceUrl: string;
  pathNodes: GraphNodeData[];
  onClose: () => void;
}

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  procedureTitle,
  institution,
  sourceUrl,
  pathNodes,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  // Collect all unique documents across the path
  const allDocs = Array.from(
    new Set(pathNodes.flatMap((n) => n.documents || []))
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Student Action Plan Checklist"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
    >
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Action Header (Hidden on print) */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
              Action Plan
            </span>
            <span className="text-xs text-slate-400">
              {pathNodes.length} steps in your customized path
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-400 text-xs font-semibold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              aria-label="Close checklist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="printable-checklist"
          className="p-6 sm:p-10 overflow-y-auto space-y-6 bg-slate-950 text-slate-100 print:bg-white print:text-black print:p-0 print:space-y-4 print:text-xs"
        >
          {/* Printable Header */}
          <div className="border-b border-slate-800 print:border-black pb-4">
            <div className="flex items-center justify-between text-xs text-slate-400 print:text-gray-600 font-mono">
              <span>WAYFINDER • OFFICIAL STUDENT ACTION CHECKLIST</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-400 print:text-green-800">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Verbatim Grounded
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white print:text-black tracking-tight mt-1">
              {procedureTitle}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-300 print:text-gray-700 mt-1">
              <span className="font-semibold">{institution}</span>
              <span>•</span>
              <span className="truncate max-w-md font-mono text-[11px] text-slate-400 print:text-gray-600">
                {sourceUrl}
              </span>
            </div>
          </div>

          {/* Master Required Documents Box (If any) */}
          {allDocs.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 print:border-gray-400 print:bg-gray-50 print:p-2.5 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-green-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Required Documents Checklist (Gather Before Starting)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {allDocs.map((doc, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-200 print:text-black cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-700 print:border-gray-500 text-sky-500 focus:ring-0"
                    />
                    <span>{doc}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sequential Ordered Steps */}
          <div className="space-y-4 print:space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-gray-700">
              Ordered Step-by-Step Procedure
            </h2>

            <ol className="space-y-3 print:space-y-2">
              {pathNodes.map((step, index) => {
                const isGap = step.kind === 'gap';

                if (isGap) {
                  return (
                    <li
                      key={step.stepId}
                      className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 print:border-gray-800 print:bg-gray-100 print:p-2.5 space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 print:text-black border border-amber-500/40 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          !
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300 print:text-black uppercase tracking-wider">
                              {step.title || 'Policy Gap Encountered'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 print:text-black border border-amber-500/30 font-mono">
                              Policy Gap
                            </span>
                          </div>
                          <p className="text-xs text-amber-200/90 print:text-gray-800 mt-1">
                            {step.description}
                          </p>

                          {step.callScript && (
                            <div className="mt-2 p-2.5 rounded-lg bg-amber-950/50 print:bg-white print:border print:border-gray-400 text-xs text-amber-100 print:text-black italic">
                              <span className="font-semibold block not-italic text-[11px] text-amber-300 print:text-gray-700 mb-1 flex items-center gap-1">
                                <PhoneCall className="w-3 h-3" /> Script for Phone Call:
                              </span>
                              "{step.callScript}"
                            </div>
                          )}

                          {step.fallback_contact && (
                            <p className="mt-1.5 text-[11px] text-slate-400 print:text-gray-600 font-mono">
                              Fallback Office: {step.fallback_contact.name || 'Advising Center'}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={step.stepId}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 print:border-gray-300 print:bg-white print:p-2 flex items-start gap-3"
                  >
                    <input
                      type="checkbox"
                      aria-label={`Mark step ${index + 1} complete`}
                      className="w-4 h-4 mt-1 rounded border-slate-700 print:border-gray-500 text-sky-500 focus:ring-0 shrink-0"
                    />

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white print:text-black">
                          Step {index + 1}: {step.title || step.label}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 print:bg-gray-100 text-slate-300 print:text-gray-700 border border-slate-700 print:border-gray-300">
                          {step.kind}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Deadline & Contact Row */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 print:text-gray-600 font-mono">
                        {step.deadline && (
                          <span className="flex items-center gap-1 text-rose-300 print:text-red-800">
                            <Calendar className="w-3 h-3" />
                            Deadline: {step.deadline.text || step.deadline.date}
                          </span>
                        )}
                        {step.contact && (
                          <span className="flex items-center gap-1 text-cyan-300 print:text-blue-800">
                            <Building2 className="w-3 h-3" />
                            {step.contact.name || step.contact.phone || step.contact.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Verification Footnote */}
          <div className="pt-4 border-t border-slate-800 print:border-gray-300 text-[10px] text-slate-400 print:text-gray-500 flex items-center justify-between">
            <span>Generated deterministically by Wayfinder (IceHacks 2026).</span>
            <span>All procedural claims grounded in published university policy.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

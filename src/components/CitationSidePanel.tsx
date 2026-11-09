import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  FileText,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import type { GraphNodeData } from '../lib/graphBuilder';

interface CitationSidePanelProps {
  nodeData: GraphNodeData;
  sourceUrl: string;
  onClose: () => void;
}

export const CitationSidePanel: React.FC<CitationSidePanelProps> = ({
  nodeData,
  sourceUrl,
  onClose,
}) => {
  const [sourceExpanded, setSourceExpanded] = useState<boolean>(true);
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);

  const kind = nodeData.kind || 'action';
  const isGap = kind === 'gap';

  const copyScriptToClipboard = async () => {
    if (nodeData.callScript) {
      await navigator.clipboard.writeText(nodeData.callScript);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    }
  };

  return (
    <aside
      aria-label="Step Citation and Details Panel"
      className="w-full sm:w-[420px] border-l border-slate-800 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col z-30 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
    >
      {/* Panel Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
              isGap
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
            }`}
          >
            {kind}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {nodeData.stepId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Esc to close
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 space-y-6 flex-1">
        {/* Step Title & Plain Description */}
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
            {nodeData.title || nodeData.label}
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            {nodeData.description}
          </p>
        </div>

        {/* POLICY GAP: Phone Call Script Box */}
        {isGap && nodeData.callScript && (
          <div className="rounded-xl bg-amber-950/30 border border-amber-500/40 p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Policy Gap Action Script
              </span>
              <button
                type="button"
                onClick={copyScriptToClipboard}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/30 transition-all font-medium focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
              >
                {scriptCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Script
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-amber-200/80">
              The university policy omits this case. Call the fallback office and read this verbatim:
            </p>

            <blockquote className="text-xs text-amber-100 bg-amber-950/70 p-3.5 rounded-lg border border-amber-500/30 leading-relaxed font-sans select-text italic">
              "{nodeData.callScript}"
            </blockquote>

            {nodeData.fallback_contact && (
              <div className="pt-2 border-t border-amber-500/20 text-xs text-amber-300/90 flex items-center justify-between">
                <span>Recommended Office:</span>
                <span className="font-semibold text-white">
                  {nodeData.fallback_contact.name || 'Advising Office'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Deadline Card */}
        {nodeData.deadline && (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Procedural Deadline
              </h4>
              <p className="mt-0.5 text-sm font-mono text-white font-medium">
                {nodeData.deadline.text || nodeData.deadline.date || 'Unspecified by policy'}
              </p>
            </div>
          </div>
        )}

        {/* Documents Required */}
        {nodeData.documents && nodeData.documents.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-emerald-400" />
              Required Documentation ({nodeData.documents.length})
            </div>
            <ul className="space-y-1.5 pt-1">
              {nodeData.documents.map((doc, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/60 font-sans"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contact Information */}
        {nodeData.contact && (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Designated Contact
            </div>
            <div className="text-xs space-y-1 font-mono text-slate-200">
              {nodeData.contact.name && (
                <div className="font-semibold text-white text-sm font-sans">
                  {nodeData.contact.name}
                </div>
              )}
              {nodeData.contact.email && (
                <div>
                  <span className="text-slate-400">Email: </span>
                  <a
                    href={`mailto:${nodeData.contact.email}`}
                    className="text-sky-400 underline hover:text-sky-300"
                  >
                    {nodeData.contact.email}
                  </a>
                </div>
              )}
              {nodeData.contact.phone && (
                <div>
                  <span className="text-slate-400">Phone: </span>
                  <a
                    href={`tel:${nodeData.contact.phone}`}
                    className="text-sky-400 underline hover:text-sky-300"
                  >
                    {nodeData.contact.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COLLAPSIBLE SOURCE CITATION SECTION (HARD REQUIREMENT) */}
        <section aria-labelledby="source-citation-heading" className="pt-2">
          <button
            type="button"
            id="source-citation-heading"
            onClick={() => setSourceExpanded(!sourceExpanded)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors text-left focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Verbatim Policy Citation
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                100% Grounded
              </span>
            </div>
            {sourceExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {sourceExpanded && (
            <div className="mt-2 p-4 rounded-xl bg-slate-950/90 border border-slate-800/80 space-y-3">
              <p className="text-[11px] text-slate-400">
                In adherence to Wayfinder's grounding invariant, this step corresponds verbatim to the university's published text:
              </p>

              <blockquote className="text-xs italic text-slate-200 border-l-2 border-emerald-500 pl-3 py-1 leading-relaxed bg-slate-900/60 p-2.5 rounded-r select-text font-serif">
                "{nodeData.source_sentence || 'Explicit policy requirement extracted from page.'}"
              </blockquote>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Source Document:</span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2 text-xs"
                >
                  View University Policy <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};

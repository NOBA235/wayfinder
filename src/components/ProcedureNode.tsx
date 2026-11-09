import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  CheckCircle2,
  HelpCircle,
  Calendar,
  FileText,
  Building2,
  AlertTriangle,
  PhoneCall,
  ChevronRight,
} from 'lucide-react';
import type { GraphNodeData } from '../lib/graphBuilder';

export interface CustomNodeData extends GraphNodeData {
  isDimmed?: boolean;
  isSelected?: boolean;
  isPathHighlighted?: boolean;
  onSelectBranch?: (decisionNodeId: string, targetNodeId: string) => void;
  outgoingBranches?: Array<{ targetId: string; label: string; isSelected?: boolean }>;
}

function ProcedureNodeComponent({
  id,
  data,
  selected,
}: NodeProps & { data: CustomNodeData }) {
  const kind = data.kind || 'action';
  const isDimmed = data.isDimmed ?? false;
  const isHighlighted = data.isPathHighlighted ?? false;
  const isSelected = selected || data.isSelected;

  // Render appropriate kind visual styling
  const getKindBadge = () => {
    switch (kind) {
      case 'action':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CheckCircle2 className="w-3 h-3" /> Action
          </span>
        );
      case 'decision':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <HelpCircle className="w-3 h-3" /> Decision
          </span>
        );
      case 'deadline':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Calendar className="w-3 h-3" /> Deadline
          </span>
        );
      case 'document':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileText className="w-3 h-3" /> Document
          </span>
        );
      case 'contact':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Building2 className="w-3 h-3" /> Contact
          </span>
        );
      case 'gap':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Policy Gap
          </span>
        );
      default:
        return null;
    }
  };

  const getCardClasses = () => {
    let base =
      'w-[280px] p-4 rounded-xl transition-all duration-200 cursor-pointer text-left select-none outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ';

    if (isDimmed) {
      base += 'opacity-35 hover:opacity-80 scale-[0.98] grayscale-[30%] ';
    } else {
      base += 'opacity-100 shadow-lg ';
    }

    if (isSelected) {
      base += 'ring-2 ring-sky-400 shadow-sky-500/20 shadow-xl scale-[1.02] ';
    } else if (isHighlighted) {
      base += 'ring-1 ring-sky-500/60 shadow-md shadow-sky-500/10 ';
    }

    if (kind === 'gap') {
      base += 'bg-amber-950/20 border-2 border-dashed border-amber-500/60 hover:border-amber-400 ';
    } else if (kind === 'decision') {
      base += 'bg-slate-900/90 border border-purple-500/40 hover:border-purple-400/80 backdrop-blur-md ';
    } else {
      base += 'bg-slate-900/90 border border-slate-800 hover:border-slate-700 backdrop-blur-md ';
    }

    return base;
  };

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`${kind} step: ${data.title || data.label}`}
      className={getCardClasses()}
    >
      {/* React Flow Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-600 !w-3 !h-3 !border-2 !border-slate-900 hover:!bg-sky-400 transition-colors"
      />

      {/* Header with Kind Badge and Grounding Indicator */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {getKindBadge()}
        {data.grounded && kind !== 'gap' && (
          <span className="text-[10px] text-emerald-400/80 font-mono">
            Grounded ✓
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-100 tracking-tight leading-snug line-clamp-2">
        {data.title || data.label}
      </h3>

      {/* Visual Content Specific to Kind */}
      {kind === 'action' && (
        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {data.description}
        </p>
      )}

      {kind === 'decision' && (
        <div className="mt-2 pt-2 border-t border-purple-500/20">
          <p className="text-xs text-purple-200/90 mb-2 font-medium">
            Select your situation branch:
          </p>
          {data.outgoingBranches && data.outgoingBranches.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {data.outgoingBranches.map((branch) => (
                <button
                  key={branch.targetId}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (data.onSelectBranch) {
                      data.onSelectBranch(id, branch.targetId);
                    }
                  }}
                  className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                    branch.isSelected
                      ? 'bg-purple-600 text-white border-purple-400 font-semibold shadow-sm'
                      : 'bg-purple-950/40 text-purple-300 border-purple-800/60 hover:bg-purple-900/60 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-1">
                    {branch.label || 'Default path'}
                  </span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {kind === 'deadline' && (
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-medium">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {data.deadline?.text || data.deadline?.date || 'Unspecified'}
          </span>
        </div>
      )}

      {kind === 'document' && data.documents && data.documents.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400">
          <FileText className="w-3.5 h-3.5" />
          <span className="truncate font-medium">
            {data.documents.length === 1
              ? data.documents[0]
              : `${data.documents.length} required documents`}
          </span>
        </div>
      )}

      {kind === 'contact' && data.contact && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-cyan-300">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {data.contact.name || data.contact.email || data.contact.phone || 'Advising Office'}
          </span>
        </div>
      )}

      {kind === 'gap' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
          <PhoneCall className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-medium underline underline-offset-2">
            Click to see phone script
          </span>
        </div>
      )}

      {/* React Flow Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-600 !w-3 !h-3 !border-2 !border-slate-900 hover:!bg-sky-400 transition-colors"
      />
    </div>
  );
}

export const ProcedureNode = memo(ProcedureNodeComponent);

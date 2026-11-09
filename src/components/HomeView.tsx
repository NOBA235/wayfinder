import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  GraduationCap,
  Scale,
  Building2,
  FileCheck2,
  Bookmark,
} from 'lucide-react';

interface ProcedureManifestItem {
  id: string;
  title: string;
  institution: string;
  file: string;
}

const SITUATION_CARDS = [
  {
    id: 'berkeley-aid-disbursement-adjustments',
    title: 'I got a surprise fee',
    tagline: 'Aid adjustments, reduced course load & census invoices',
    institution: 'UC Berkeley',
    summary: 'Navigate what happens when enrollment drops below 12 units at census freeze, and how grant reductions trigger repayment invoices.',
    icon: Receipt,
    badgeColor: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    accentColor: 'hover:border-rose-500/60',
    stepsCount: 7,
    gapsCount: 1,
  },
  {
    id: 'rochester-grade-appeal',
    title: 'I need to appeal a grade',
    tagline: 'Syllabus rules, instructor discussion & formal review',
    institution: 'University of Rochester',
    summary: 'Step-by-step guidance from syllabus review to formal complaint forms and dean appeals when an instructor grading error is suspected.',
    icon: GraduationCap,
    badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    accentColor: 'hover:border-purple-500/60',
    stepsCount: 5,
    gapsCount: 1,
  },
  {
    id: 'uw-irs-verification-nonfiling',
    title: 'My financial aid is on hold',
    tagline: 'IRS non-filing letter requirements & documentation',
    institution: 'University of Washington',
    summary: 'How non-tax-filers obtain required verification letters from the IRS via online, phone, or Form 4506-T to release aid holds.',
    icon: Scale,
    badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    accentColor: 'hover:border-sky-500/60',
    stepsCount: 7,
    gapsCount: 2,
  },
];

export default function HomeView() {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [procedures, setProcedures] = useState<ProcedureManifestItem[]>([]);

  useEffect(() => {
    fetch('/graphs/manifest.json')
      .then((res) => res.json())
      .then((data: ProcedureManifestItem[]) => setProcedures(data))
      .catch((err) => console.warn('Could not load manifest:', err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-sky-500/30 selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 sm:px-10 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg text-white">
              Wayfinder
            </span>
            <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Interactive Policy Maps
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            to="/saved"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            <Bookmark className="w-3.5 h-3.5 text-sky-400" />
            <span>My Saved Paths</span>
          </Link>
          <button
            type="button"
            onClick={() => setBrowseOpen(!browseOpen)}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            {browseOpen ? 'Hide catalog' : 'Browse procedures'}
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 py-12 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="max-w-2xl space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Deterministic • Zero Runtime Hallucination • 100% Verbatim Grounded</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Select your situation. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400">
              Navigate university bureaucracy.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
            Wayfinder turns convoluted university policies into interactive, branching visual maps.
            Every single step is grounded in verbatim policy text. No chat boxes, no guessing.
          </p>
        </div>

        {/* 3 Situation Cards (The Demo Spine) */}
        <section aria-labelledby="situation-cards-heading" className="space-y-4">
          <h2 id="situation-cards-heading" className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Choose a situation to explore:
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SITUATION_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.id}
                  to={`/map/${card.id}`}
                  className={`group relative flex flex-col p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 ${card.accentColor} hover:bg-slate-900 transition-all duration-200 hover:shadow-2xl hover:shadow-sky-500/5 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none`}
                  aria-label={`${card.title} - ${card.institution}`}
                >
                  {/* Card Header Icon & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5 text-sky-400" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1 font-mono">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {card.institution}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-sky-300 transition-colors">
                    "{card.title}"
                  </h3>
                  <p className="text-xs font-medium text-sky-400/90 mt-1 mb-2 font-mono">
                    {card.tagline}
                  </p>

                  <p className="text-xs text-slate-400 leading-relaxed flex-1 mb-6">
                    {card.summary}
                  </p>

                  {/* Card Footer: Metadata and Call to Action */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {card.stepsCount} steps
                      </span>
                      <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                        • <AlertTriangle className="w-3 h-3" /> {card.gapsCount} gap
                      </span>
                    </div>

                    <span className="flex items-center gap-1 font-semibold text-white group-hover:text-sky-400 transition-colors">
                      Explore Map <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Browse Procedures Drawer (When opened) */}
        {browseOpen && (
          <section
            aria-labelledby="browse-catalog-heading"
            className="mt-8 p-6 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-sky-400" />
                <h3 id="browse-catalog-heading" className="text-sm font-bold text-white uppercase tracking-wider">
                  Full Policy Directory
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {procedures.length} procedures available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {procedures.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2 col-span-full">
                  <p className="text-sm text-slate-300 font-medium">No Ingested Procedures Available</p>
                  <p className="text-xs text-slate-500 font-mono">
                    Wayfinder strictly forbids fabricated or mock data. Run <span className="text-sky-400">npm run ingest -- --url &lt;url&gt;</span> to extract real policies.
                  </p>
                </div>
              ) : (
                procedures.map((p) => (
                  <Link
                    key={p.id}
                    to={`/map/${p.id}`}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-950 text-left transition-all group focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                  >
                    <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                      {p.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      {p.institution}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>
        )}

        {/* Architecture Invariants Footer */}
        <section className="mt-14 pt-8 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-0.5">Build-Time Extracted</h4>
              <p className="leading-relaxed text-slate-400 text-[11px]">
                Deterministic data only. No runtime LLM calls happen when you click or explore nodes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-0.5">Verbatim Citations</h4>
              <p className="leading-relaxed text-slate-400 text-[11px]">
                Every single node carries a verbatim substring of the scraped university policy.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-0.5">Policy Gaps & Scripts</h4>
              <p className="leading-relaxed text-slate-400 text-[11px]">
                When regulations omit next steps, Wayfinder detects the gap and provides what to say on the phone.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

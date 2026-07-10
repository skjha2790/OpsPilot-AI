import { Clock, Flame, ShieldAlert, TrendingUp } from 'lucide-react';

import type { InvestigationHistoryItem } from '../../hooks/useInvestigationHistory';

function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

function severityTone(severity: InvestigationHistoryItem['severity']) {
  if (severity === 'P0') return 'border-rose-400/20 bg-rose-500/10 text-rose-100';
  if (severity === 'P1') return 'border-amber-400/20 bg-amber-500/10 text-amber-100';
  return 'border-sky-400/20 bg-sky-500/10 text-sky-100';
}

function outcomeTone(outcome: InvestigationHistoryItem['outcome']) {
  if (outcome === 'completed') return 'text-emerald-200';
  if (outcome === 'rejected') return 'text-amber-200';
  return 'text-rose-200';
}

export function InvestigationHistory({
  items,
}: {
  items: InvestigationHistoryItem[];
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#111827]/90 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/5 p-2 text-cyan-300">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Investigation History</p>
            <p className="mt-1 text-sm text-slate-300">Recent incidents</p>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
          {items.length} total
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">
            No investigations yet. Run one to populate this feed.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{item.incident}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityTone(item.severity)}`}>
                      {item.severity}
                    </span>
                    <span className={`text-xs font-semibold ${outcomeTone(item.outcome)}`}>
                      {item.outcome.toUpperCase()}
                    </span>
                    {typeof item.confidence === 'number' ? (
                      <span className="text-xs font-medium text-slate-400">Confidence {item.confidence}%</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(item.ts)}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                {item.outcome === 'completed' ? (
                  <ShieldAlert className="h-4 w-4 text-emerald-300" />
                ) : item.outcome === 'rejected' ? (
                  <Flame className="h-4 w-4 text-amber-300" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-rose-300" />
                )}
                <span>Recorded by local history (browser storage)</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}


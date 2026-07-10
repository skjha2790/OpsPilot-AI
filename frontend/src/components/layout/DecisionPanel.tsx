import { CheckCircle2, Hand, ShieldAlert, XCircle } from 'lucide-react';

export type IncidentSeverity = 'P0' | 'P1' | 'P2';

export function DecisionPanel({
  severity,
  awaitingApproval,
  approved,
  rejected,
  onApprove,
  onReject,
  explanation,
}: {
  severity: IncidentSeverity;
  awaitingApproval: boolean;
  approved: boolean;
  rejected: boolean;
  onApprove: () => void;
  onReject: () => void;
  explanation: string;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#111827]/90 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/5 p-2 text-cyan-300">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Decision Engine</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {severity === 'P0' ? 'Auto remediation enabled' : severity === 'P1' ? 'Approval required' : 'RCA only'}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{explanation}</p>
          </div>
        </div>

        {severity === 'P1' ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onApprove}
              disabled={!awaitingApproval || approved || rejected}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={!awaitingApproval || approved || rejected}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          </div>
        ) : severity === 'P0' ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
            <Hand className="h-4 w-4" />
            No approval needed
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100">
            <Hand className="h-4 w-4" />
            Remediation disabled
          </div>
        )}
      </div>
    </section>
  );
}


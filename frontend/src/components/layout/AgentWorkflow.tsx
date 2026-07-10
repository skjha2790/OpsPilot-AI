import { CheckCircle2, CircleDashed, Loader2, Timer } from 'lucide-react';

export type AgentRunStatus = 'waiting' | 'running' | 'completed';

export interface AgentRunStep {
  id: string;
  title: string;
  status: AgentRunStatus;
  durationMs?: number;
}

function formatDuration(durationMs?: number) {
  if (!durationMs || durationMs <= 0) return '--';
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function AgentWorkflow({ steps }: { steps: AgentRunStep[] }) {
  return (
    <section className="rounded-xl border border-[#0F172A] bg-[#0F172A] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Agent Workflow</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-50">Execution pipeline</h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
          <Timer className="h-3.5 w-3.5 text-cyan-300" />
          Live timings
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const running = step.status === 'running';
          const completed = step.status === 'completed';

          return (
            <div
              key={step.id}
              className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition duration-200 hover:-translate-y-0.5 ${
                completed
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-50'
                  : running
                    ? 'border-blue-400/25 bg-blue-500/10 text-slate-50'
                    : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  completed
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : running
                      ? 'bg-blue-500/15 text-blue-200'
                      : 'bg-slate-950/70 text-slate-400'
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CircleDashed className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${running ? 'animate-pulseSoft' : ''}`}>{step.title}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      completed
                        ? 'w-full bg-emerald-400'
                        : running
                          ? 'w-3/4 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 animate-pulse'
                          : index === 0
                            ? 'w-1/4 bg-slate-600'
                            : 'w-[8%] bg-slate-700'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-semibold text-slate-400">Time</span>
                <span className={`text-xs font-semibold ${completed ? 'text-emerald-200' : running ? 'text-cyan-200' : 'text-slate-500'}`}>
                  {formatDuration(step.durationMs)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

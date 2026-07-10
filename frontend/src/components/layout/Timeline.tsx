import type { LucideIcon } from 'lucide-react';

interface TimelineStep {
  label: string;
  completed: boolean;
  icon?: LucideIcon;
}

interface TimelineProps {
  steps: TimelineStep[];
}

export function Timeline({ steps }: TimelineProps) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#111827]/90 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Agent Timeline</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Execution progress</h3>
        </div>
        <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.75)] animate-pulse" />
      </div>

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                step.completed
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                  : 'border-white/10 bg-white/5 text-slate-400'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  step.completed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-950/70 text-slate-500'
                }`}
              >
                {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.label}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      step.completed ? 'w-full bg-emerald-400' : 'w-1/4 bg-slate-600'
                    }`}
                  />
                </div>
              </div>
              <div className={`text-xs font-semibold ${step.completed ? 'text-emerald-300' : 'text-slate-500'}`}>
                {step.completed ? 'Complete' : 'Pending'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

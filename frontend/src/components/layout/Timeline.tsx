interface TimelineStep {
  label: string;
  completed: boolean;
}

interface TimelineProps {
  steps: TimelineStep[];
}

export function Timeline({ steps }: TimelineProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">Agent Timeline</h3>
        <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(52,214,255,0.9)] animate-pulseSoft" />
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
              step.completed
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                : 'border-white/10 bg-slate-950/40 text-slate-400'
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-bold">
              {step.completed ? '✓' : '•'}
            </span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


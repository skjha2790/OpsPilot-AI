const workflowSteps = [
  'Investigation Started',
  'Tool Registry',
  'Pod Tool',
  'Prompt Builder',
  'OpenAI Analysis',
  'Report Generated',
];

export function Sidebar() {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200/90">Agent Workflow</p>
      </div>
      <div className="space-y-3">
        {workflowSteps.map((step) => (
          <div
            key={step}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-200"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
              ✓
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}


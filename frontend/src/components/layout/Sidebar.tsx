import { Bot, CheckCircle2, Radar, ShieldCheck, Sparkles, Workflow } from 'lucide-react';

const workflowSteps = [
  { label: 'Investigation Started', icon: Workflow },
  { label: 'Tool Registry', icon: Radar },
  { label: 'Pod Tool', icon: Bot },
  { label: 'Prompt Builder', icon: Sparkles },
  { label: 'OpenAI Analysis', icon: ShieldCheck },
  { label: 'Report Generated', icon: CheckCircle2 },
];

interface SidebarProps {
  loading?: boolean;
  resultReady?: boolean;
}

export function Sidebar({ loading = false, resultReady = false }: SidebarProps) {
  return (
    <aside className="rounded-[2rem] border border-white/10 bg-[#111827]/90 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Agent Workflow</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Execution Rail</h3>
        </div>
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            loading ? 'bg-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.8)]' : 'bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.8)]'
          }`}
        />
      </div>

      <div className="mt-5 space-y-3">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const active = resultReady ? true : loading ? index < 4 : index === 0;

          return (
            <div
              key={step.label}
              className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition duration-200 hover:-translate-y-0.5 ${
                active
                  ? 'border-blue-400/20 bg-blue-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-400'
              }`}
            >
              <div
                className={`rounded-xl p-2 ${
                  active ? 'bg-blue-500/15 text-blue-200' : 'bg-slate-950/70 text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-slate-400">
                  {index === 0 ? 'Entry point' : active ? 'Executed in current flow' : 'Queued for future execution'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Mode</p>
          <p className="mt-2 text-sm font-medium text-white">Advisor</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Status</p>
          <p className="mt-2 text-sm font-medium text-emerald-300">Healthy</p>
        </div>
      </div>
    </aside>
  );
}

import { Terminal } from 'lucide-react';

export interface TerminalLine {
  id: string;
  ts: number;
  text: string;
  tone?: 'default' | 'success' | 'warning';
}

const toneClasses: Record<NonNullable<TerminalLine['tone']>, string> = {
  default: 'text-slate-200',
  success: 'text-emerald-200',
  warning: 'text-amber-200',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

export function TerminalPanel({ lines }: { lines: TerminalLine[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#0B1220]/90 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white/5 p-2 text-cyan-300">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Agent Terminal</p>
            <p className="mt-1 text-sm text-slate-300">Live execution trace</p>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
          {lines.length} lines
        </div>
      </div>

      <div className="mt-4 max-h-[280px] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-[12.5px] leading-6">
        {lines.length === 0 ? (
          <p className="text-slate-500">No output yet.</p>
        ) : (
          <div className="space-y-1">
            {lines.map((line) => (
              <div key={line.id} className="flex items-start gap-3">
                <span className="shrink-0 text-slate-500">[{formatTime(line.ts)}]</span>
                <span className={toneClasses[line.tone ?? 'default']}>{line.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


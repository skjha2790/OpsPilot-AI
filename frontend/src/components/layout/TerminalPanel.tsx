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
    <section className="rounded-[18px] border border-[#E7EAF2] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-[#E7EAF2] bg-[#F8FBFF] p-2 text-indigo-600">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Agent Terminal</p>
            <p className="mt-1 text-sm text-slate-600">Live execution trace</p>
          </div>
        </div>
        <div className="rounded-full border border-[#E7EAF2] bg-[#F8FBFF] px-3 py-1 text-xs font-medium text-slate-700">
          {lines.length} lines
        </div>
      </div>

      <div className="mt-4 max-h-[280px] overflow-auto rounded-2xl border border-[#E7EAF2] bg-[#0B1220] p-4 font-mono text-[12.5px] leading-6">
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

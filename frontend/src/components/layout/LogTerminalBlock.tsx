export function LogTerminalBlock({ lines }: { lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#0F172A] bg-[#0F172A] shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs font-semibold text-slate-200">logs</span>
      </div>
      <div className="max-h-[360px] overflow-auto p-4 font-mono text-[12.5px] leading-6 text-[#F8FAFC]">
        {lines.length === 0 ? (
          <p className="text-slate-300">No logs available.</p>
        ) : (
          <div className="space-y-1">
            {lines.map((line) => (
              <div key={line} className="whitespace-pre-wrap">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

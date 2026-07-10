interface StatusDotProps {
  label: string;
  tone?: 'green' | 'blue' | 'amber' | 'rose';
}

const toneClasses: Record<NonNullable<StatusDotProps['tone']>, string> = {
  green: 'border-[#E7EAF2] bg-white text-emerald-600',
  blue: 'border-[#E7EAF2] bg-white text-indigo-600',
  amber: 'border-[#E7EAF2] bg-white text-amber-600',
  rose: 'border-[#E7EAF2] bg-white text-rose-600',
};

export function StatusDot({ label, tone = 'green' }: StatusDotProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 ${toneClasses[tone]}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          tone === 'green' ? 'bg-emerald-500' : tone === 'blue' ? 'bg-indigo-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
        } shadow-[0_0_0_4px_rgba(79,70,229,0.10)]`}
      />
      <span className="text-slate-700">{label}</span>
    </div>
  );
}

interface StatusDotProps {
  label: string;
  tone?: 'green' | 'blue' | 'amber' | 'rose';
}

const toneClasses: Record<NonNullable<StatusDotProps['tone']>, string> = {
  green: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  blue: 'border-blue-400/25 bg-blue-400/10 text-blue-200',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  rose: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
};

export function StatusDot({ label, tone = 'green' }: StatusDotProps) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${toneClasses[tone]}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${tone === 'green' ? 'bg-emerald-400' : tone === 'blue' ? 'bg-blue-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-rose-400'} shadow-[0_0_18px_currentColor]`} />
      <span>{label}</span>
    </div>
  );
}

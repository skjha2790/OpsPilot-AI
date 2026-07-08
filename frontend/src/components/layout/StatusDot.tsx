interface StatusDotProps {
  label: string;
  tone?: 'green' | 'blue';
}

const toneClasses: Record<NonNullable<StatusDotProps['tone']>, string> = {
  green: 'bg-emerald-400/20 text-emerald-300 ring-emerald-400/30',
  blue: 'bg-cyan-400/20 text-cyan-200 ring-cyan-400/30',
};

export function StatusDot({ label, tone = 'green' }: StatusDotProps) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${toneClasses[tone]}`}>
      <span className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_18px_currentColor]" />
      <span>{label}</span>
    </div>
  );
}


import type { ReactNode } from 'react';

function Sparkline({ points, color = '#4F46E5' }: { points: number[]; color?: string }) {
  const width = 120;
  const height = 34;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const step = width / Math.max(1, points.length - 1);
  const d = points
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={d} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  icon,
  sparkline,
  accent = '#4F46E5',
}: {
  label: string;
  value: string;
  delta?: string;
  icon: ReactNode;
  sparkline: number[];
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-[#E7EAF2] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.08),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.10),transparent_50%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {delta ? <p className="mt-2 text-xs font-medium text-slate-500">{delta}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-2xl border border-[#E7EAF2] bg-white p-2 text-slate-700">{icon}</div>
          <Sparkline points={sparkline} color={accent} />
        </div>
      </div>
    </div>
  );
}


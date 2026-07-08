import type { ReactNode } from 'react';

interface ResultCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ResultCard({ title, children, className = '' }: ResultCardProps) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}


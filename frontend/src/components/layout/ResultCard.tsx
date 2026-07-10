import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

interface ResultCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
}

export function ResultCard({ title, children, className = '', icon: Icon }: ResultCardProps) {
  return (
    <section
      className={`rounded-xl border border-white/10 bg-[#0F172A] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ${className}`}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[#60A5FA]">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

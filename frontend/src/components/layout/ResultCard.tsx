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
      className={`rounded-[1.75rem] border border-white/10 bg-[#111827]/90 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl ${className}`}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="rounded-2xl bg-white/5 p-2 text-cyan-300">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

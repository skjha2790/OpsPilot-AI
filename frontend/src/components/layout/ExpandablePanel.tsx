import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export function ExpandablePanel({
  title,
  subtitle,
  defaultOpen = false,
  children,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-[18px] border border-[#E7EAF2] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 focus:outline-none">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-800">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-700">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {rightSlot ? <div className="hidden sm:block">{rightSlot}</div> : null}
          <div className="rounded-2xl border border-[#E7EAF2] bg-[#F8FBFF] p-2 text-slate-700 transition duration-200 group-hover:bg-white group-open:rotate-180">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </summary>
      <div className="px-5 pb-5 pt-0">
        <div className="relative overflow-hidden rounded-2xl border border-[#E7EAF2] bg-[#F8FBFF] p-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-[#E7EAF2] to-transparent opacity-0 group-open:opacity-100 group-open:animate-glowSweep" />
          <div className="animate-fadeUp">{children}</div>
        </div>
      </div>
    </details>
  );
}

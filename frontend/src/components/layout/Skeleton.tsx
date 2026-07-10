export function SkeletonLine({ widthClass = 'w-full' }: { widthClass?: string }) {
  return <div className={`h-3.5 ${widthClass} rounded-full bg-white/10 animate-pulse`} />;
}

import type { ReactNode } from 'react';

export function SkeletonBlock({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>{children}</div>;
}

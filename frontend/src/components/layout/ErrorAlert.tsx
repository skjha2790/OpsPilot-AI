import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry: () => void;
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="rounded-[1.75rem] border border-rose-300/30 bg-gradient-to-br from-rose-950 via-rose-900 to-slate-950 p-5 text-rose-50 shadow-[0_24px_100px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="rounded-2xl bg-white/10 p-2 text-rose-100 ring-1 ring-white/10">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-200">Investigation Error</p>
            <p className="mt-2 text-sm leading-7 text-rose-50">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
        >
          <RefreshCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}

import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry: () => void;
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-5 text-rose-50 shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="rounded-2xl bg-rose-500/15 p-2 text-rose-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-200/80">Investigation Error</p>
            <p className="mt-2 text-sm leading-7 text-rose-100/90">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/15 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:-translate-y-0.5 hover:bg-rose-400/25"
        >
          <RefreshCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}

interface ErrorAlertProps {
  message: string;
  onRetry: () => void;
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5 text-rose-100 shadow-glow backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-200/80">Investigation Error</p>
          <p className="mt-2 text-sm leading-6 text-rose-100/90">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-rose-300/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
        >
          Retry
        </button>
      </div>
    </div>
  );
}


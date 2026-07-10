import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ExecutableStep {
  id: string;
  title: string;
  command: string;
  explanation: string;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function TerminalCommandBlock({ command }: { command: string }) {
  return (
    <pre className="overflow-auto rounded-2xl border border-[#E7EAF2] bg-white p-4 font-mono text-[12.5px] leading-6 text-slate-900">
      <code className="text-slate-900">$ {command}</code>
    </pre>
  );
}

export function ExecutableSteps({ steps }: { steps: ExecutableStep[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return undefined;
    const timer = window.setTimeout(() => setCopiedId(null), 1400);
    return () => window.clearTimeout(timer);
  }, [copiedId]);

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className="rounded-[18px] border border-[#E7EAF2] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{`Step ${index + 1}`}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{step.explanation}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await copyToClipboard(step.command);
                setCopiedId(step.id);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E7EAF2] bg-[#F8FBFF] px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
            >
              {copiedId === step.id ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
          </div>

          <div className="mt-4">
            <TerminalCommandBlock command={step.command} />
          </div>
        </div>
      ))}
    </div>
  );
}

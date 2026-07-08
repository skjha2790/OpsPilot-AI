import { FormEvent, useEffect, useState } from 'react';

import { ConfidenceBadge } from '../components/layout/ConfidenceBadge';
import { ErrorAlert } from '../components/layout/ErrorAlert';
import { ResultCard } from '../components/layout/ResultCard';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusDot } from '../components/layout/StatusDot';
import { TechnologyBadges } from '../components/layout/TechnologyBadges';
import { Timeline } from '../components/layout/Timeline';
import { useInvestigation } from '../hooks/useInvestigation';

const loadingSteps = [
  { label: 'Receiving Incident', completed: true },
  { label: 'Selecting Tools', completed: true },
  { label: 'Collecting Kubernetes Evidence', completed: true },
  { label: 'Building Prompt', completed: true },
  { label: 'Calling OpenAI', completed: false },
  { label: 'Generating Investigation Report', completed: false },
];

export function DashboardPage() {
  const {
    incident,
    setIncident,
    result,
    loading,
    error,
    startedAt,
    completedAt,
    runInvestigation,
  } = useInvestigation();
  const [timelineIndex, setTimelineIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setTimelineIndex(loadingSteps.length);
      return;
    }

    setTimelineIndex(0);
    const timer = window.setInterval(() => {
      setTimelineIndex((current) => Math.min(current + 1, loadingSteps.length));
    }, 700);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runInvestigation();
  }

  const confidence = result?.confidence ?? 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(23,184,255,0.22),_transparent_32%),linear-gradient(180deg,#050816_0%,#09111f_55%,#050816_100%)] text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-white/10 bg-white/5 px-5 py-5 shadow-glow backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-200/80">OpsPilot AI</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Autonomous Kubernetes Incident Investigation Platform
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Investigate production Kubernetes incidents with an AI-native workflow that gathers evidence,
                reasons over the signals, and returns actionable remediation guidance.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StatusDot label="Backend" />
              <StatusDot label="OpenAI" />
              <StatusDot label="Agent" />
              <StatusDot label="Tool Registry" tone="blue" />
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.7fr]">
          <main className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-3 block text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">
                    Incident Input
                  </span>
                  <textarea
                    value={incident}
                    onChange={(event) => setIncident(event.target.value)}
                    placeholder="Example: CrashLoopBackOff in payment-service namespace after latest deployment."
                    className="min-h-[170px] w-full rounded-3xl border border-white/10 bg-slate-950/70 px-5 py-4 text-base text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                        Investigating
                      </>
                    ) : (
                      '🔍 Investigate Incident'
                    )}
                  </button>
                  <p className="text-sm text-slate-400">
                    Existing backend endpoint: <span className="text-slate-200">POST /api/v1/investigate</span>
                  </p>
                </div>
              </form>
            </section>

            {error ? <ErrorAlert message={error} onRetry={() => runInvestigation()} /> : null}

            {loading ? (
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <Timeline
                  steps={loadingSteps.map((step, index) => ({
                    ...step,
                    completed: index < timelineIndex,
                  }))}
                />
                <ResultCard title="Live Execution">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_24px_rgba(52,214,255,0.9)]" />
                      <p className="text-sm text-slate-300">Agent is analyzing Kubernetes signals and shaping the prompt.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </ResultCard>
              </div>
            ) : null}

            {result ? (
              <section className="grid gap-6 xl:grid-cols-2">
                <ResultCard title="Summary">
                  <p className="text-sm leading-7 text-slate-200">{result.summary}</p>
                </ResultCard>

                <ResultCard title="Root Cause">
                  <p className="text-sm leading-7 text-slate-200">{result.root_cause}</p>
                </ResultCard>

                <ResultCard title="Confidence">
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-semibold tracking-tight text-white">{result.confidence}</span>
                      <span className="text-2xl font-semibold text-slate-400">%</span>
                    </div>
                    <ConfidenceBadge confidence={confidence} />
                  </div>
                </ResultCard>

                <ResultCard title="Evidence">
                  <ul className="space-y-3 text-sm leading-6 text-slate-200">
                    {result.evidence.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </ResultCard>

                <ResultCard title="Recommended Remediation" className="xl:col-span-2">
                  <p className="text-sm leading-7 text-slate-200">{result.remediation}</p>
                </ResultCard>

                <ResultCard title="Recovery Steps" className="xl:col-span-2">
                  <ol className="space-y-3 text-sm leading-6 text-slate-200">
                    {result.recovery_steps.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-cyan-200">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </ResultCard>
              </section>
            ) : (
              <section className="grid gap-6 xl:grid-cols-2">
                <ResultCard title="Summary">
                  <p className="text-sm text-slate-400">
                    Run an investigation to see the executive summary and incident analysis.
                  </p>
                </ResultCard>
                <ResultCard title="Root Cause">
                  <p className="text-sm text-slate-400">
                    The root cause will appear here after the OpenAI response is returned.
                  </p>
                </ResultCard>
                <ResultCard title="Confidence">
                  <p className="text-sm text-slate-400">Confidence score will be shown as a prominent badge.</p>
                </ResultCard>
                <ResultCard title="Evidence">
                  <p className="text-sm text-slate-400">Evidence will be displayed as a bullet list.</p>
                </ResultCard>
                <ResultCard title="Recommended Remediation" className="xl:col-span-2">
                  <p className="text-sm text-slate-400">Recommended remediation guidance will appear here.</p>
                </ResultCard>
                <ResultCard title="Recovery Steps" className="xl:col-span-2">
                  <p className="text-sm text-slate-400">Recovery steps will appear here once the investigation completes.</p>
                </ResultCard>
              </section>
            )}
          </main>

          <aside className="space-y-6">
            <Sidebar />

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">Investigation Metadata</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <span>Started</span>
                  <span>{startedAt ? new Date(startedAt).toLocaleTimeString() : 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <span>Completed</span>
                  <span>{completedAt ? new Date(completedAt).toLocaleTimeString() : 'Pending'}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <footer className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-5 py-5 shadow-glow backdrop-blur-xl">
          <TechnologyBadges />
        </footer>
      </div>
    </div>
  );
}

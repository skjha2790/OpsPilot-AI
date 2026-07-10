import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  Gauge,
  Loader2,
  Radar,
  ServerCog,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';

import type { AgentRunStep } from '../components/layout/AgentWorkflow';
import { AgentWorkflow } from '../components/layout/AgentWorkflow';
import { ConfidenceBadge } from '../components/layout/ConfidenceBadge';
import { ErrorAlert } from '../components/layout/ErrorAlert';
import { ResultCard } from '../components/layout/ResultCard';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusDot } from '../components/layout/StatusDot';
import type { TerminalLine } from '../components/layout/TerminalPanel';
import { TerminalPanel } from '../components/layout/TerminalPanel';
import { TechnologyBadges } from '../components/layout/TechnologyBadges';
import { useInvestigation } from '../hooks/useInvestigation';

const agentPipeline = [
  { id: 'intake', title: 'Incident Intake Agent' },
  { id: 'classification', title: 'Incident Classification Agent' },
  { id: 'discovery', title: 'Kubernetes Discovery Agent' },
  { id: 'pod', title: 'Pod Inspection Agent' },
  { id: 'events', title: 'Events Collection Agent' },
  { id: 'logs', title: 'Logs Collection Agent' },
  { id: 'rca', title: 'Root Cause Analysis Agent' },
  { id: 'risk', title: 'Risk Assessment Agent' },
  { id: 'decision', title: 'Decision Agent' },
  { id: 'verification', title: 'Verification Agent' },
  { id: 'report', title: 'Report Generation Agent' },
] as const;

const operationalSignals = [
  { label: 'Backend', tone: 'green' as const },
  { label: 'OpenAI', tone: 'green' as const },
  { label: 'Agent', tone: 'green' as const },
  { label: 'Tool Registry', tone: 'blue' as const },
];

const featureCards = [
  {
    title: 'Incident Command',
    description: 'Capture the incident in one sentence and trigger the investigation workflow.',
    icon: TerminalSquare,
  },
  {
    title: 'AI Reasoning',
    description: 'OpenAI Responses API returns the investigation, evidence interpretation, and remediation plan.',
    icon: Brain,
  },
  {
    title: 'Operational Guardrails',
    description: 'All remediation is advisory-only and requires human approval before any execution path exists.',
    icon: ShieldAlert,
  },
];

function makeAgentSteps(currentIndex: number, durations: Record<string, number | undefined>): AgentRunStep[] {
  return agentPipeline.map((agent, index) => {
    const status = index < currentIndex ? 'completed' : index === currentIndex ? 'running' : 'waiting';
    const durationMs = durations[agent.id];
    return { ...agent, status, durationMs };
  });
}

function makeTerminalLine(text: string, tone?: TerminalLine['tone']): TerminalLine {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    text,
    tone,
  };
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const tone =
    confidence >= 80
      ? 'from-emerald-400 via-emerald-500 to-cyan-400'
      : confidence >= 50
        ? 'from-amber-400 via-yellow-400 to-orange-400'
        : 'from-rose-500 via-red-500 to-orange-500';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Confidence</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{confidence}%</p>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950/80">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-700`}
          style={{ width: `${Math.max(confidence, 8)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Confidence is derived from the model response and should be validated against operational context.
      </p>
    </div>
  );
}

function EmptyStatePanel() {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      {[
        ['Summary', 'The executive summary will appear here after the investigation finishes.'],
        ['Root Cause', 'A clear root cause hypothesis will be shown once evidence has been analyzed.'],
        ['Confidence', 'Confidence will be visualized as a large score with risk-aware color coding.'],
        ['Evidence', 'Evidence bullets from the investigation will appear here.'],
        ['Recommended Remediation', 'Advisory remediation guidance will populate this card.'],
        ['Recovery Steps', 'Recovery steps will appear as an ordered sequence.'],
      ].map(([title, description]) => (
        <ResultCard key={title} title={title}>
          <p className="text-sm leading-7 text-slate-400">{description}</p>
        </ResultCard>
      ))}
    </section>
  );
}

function ResultSkeleton() {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <ResultCard title="Summary" icon={Activity}>
        <div className="space-y-3">
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-9/12 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-7/12 animate-pulse rounded-full bg-white/10" />
        </div>
      </ResultCard>
      <ResultCard title="Root Cause" icon={AlertTriangle}>
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-10/12 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-8/12 animate-pulse rounded-full bg-white/10" />
        </div>
      </ResultCard>
      <ConfidenceMeter confidence={72} />
      <ResultCard title="Evidence" icon={DatabaseZap}>
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-9/12 animate-pulse rounded-full bg-white/10" />
        </div>
      </ResultCard>
      <ResultCard title="Recommended Remediation" className="xl:col-span-2" icon={ShieldAlert}>
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-white/10" />
        </div>
      </ResultCard>
      <ResultCard title="Recovery Steps" className="xl:col-span-2" icon={ClipboardList}>
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-10/12 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-8/12 animate-pulse rounded-full bg-white/10" />
        </div>
      </ResultCard>
    </section>
  );
}

export function DashboardPage() {
  const { incident, setIncident, result, loading, error, startedAt, completedAt, runInvestigation } = useInvestigation();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [durations, setDurations] = useState<Record<string, number | undefined>>({});
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const agentStartTsRef = useRef<number>(0);
  const agentIndexRef = useRef<number>(0);
  const durationsRef = useRef<Record<string, number | undefined>>({});

  useEffect(() => {
    if (!loading) return undefined;

    // Reset workflow state for a new investigation.
    setCurrentAgentIndex(0);
    agentIndexRef.current = 0;
    agentStartTsRef.current = Date.now();
    setDurations({});
    durationsRef.current = {};
    setTerminalLines([makeTerminalLine('[Agent] Incident received')]);

    const timer = window.setInterval(() => {
      const now = Date.now();
      const currentIndex = agentIndexRef.current;
      const currentAgent = agentPipeline[currentIndex];

      if (!currentAgent) return;

      // If we're at the last agent, keep it running until the backend completes.
      if (currentIndex >= agentPipeline.length - 1) {
        return;
      }

      const stepDuration = now - agentStartTsRef.current;
      const nextIndex = currentIndex + 1;
      const nextAgent = agentPipeline[nextIndex];

      durationsRef.current = { ...durationsRef.current, [currentAgent.id]: stepDuration };
      setDurations(durationsRef.current);

      agentIndexRef.current = nextIndex;
      agentStartTsRef.current = now;
      setCurrentAgentIndex(nextIndex);

      // Emit terminal-style trace lines as the pipeline advances.
      setTerminalLines((lines) => {
        const nextLines: TerminalLine[] = [...lines];

        if (currentAgent.id === 'classification') {
          nextLines.push(makeTerminalLine('[Classifier] Severity P1', 'warning'));
        }
        if (nextAgent.id === 'discovery') {
          nextLines.push(makeTerminalLine('[Kubernetes] Discovering cluster context'));
          nextLines.push(makeTerminalLine('[Kubernetes] Getting pods'));
        }
        if (nextAgent.id === 'events') {
          nextLines.push(makeTerminalLine('[Kubernetes] Getting events'));
        }
        if (nextAgent.id === 'logs') {
          nextLines.push(makeTerminalLine('[Logs] Collecting logs'));
        }
        if (nextAgent.id === 'rca') {
          nextLines.push(makeTerminalLine('[AI] Generating RCA'));
        }
        if (nextAgent.id === 'decision') {
          nextLines.push(makeTerminalLine('[Decision] Human approval required', 'warning'));
        }

        // Keep the terminal from growing unbounded.
        return nextLines.slice(-80);
      });
    }, 720);

    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (!result) return;

    // Finalize any running agent timing once we have a response.
    const now = Date.now();
    const lastIndex = Math.min(agentIndexRef.current, agentPipeline.length - 1);
    const runningAgent = agentPipeline[lastIndex];
    if (runningAgent && durationsRef.current[runningAgent.id] == null) {
      const lastDuration = now - agentStartTsRef.current;
      durationsRef.current = { ...durationsRef.current, [runningAgent.id]: lastDuration };
      setDurations(durationsRef.current);
    }

    setCurrentAgentIndex(agentPipeline.length);
    setTerminalLines((lines) => {
      const next = [...lines, makeTerminalLine('[Reporter] Report generated', 'success')];
      return next.slice(-80);
    });
  }, [loading, result]);

  const confidence = result?.confidence ?? 0;
  const confidenceTone = useMemo(() => {
    if (confidence >= 80) return 'text-emerald-400';
    if (confidence >= 50) return 'text-amber-400';
    return 'text-rose-400';
  }, [confidence]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runInvestigation();
  }

  const agentSteps = useMemo(() => {
    if (loading) return makeAgentSteps(currentAgentIndex, durations);
    if (!result) return agentPipeline.map((agent) => ({ ...agent, status: 'waiting' as const, durationMs: durations[agent.id] }));
    return agentPipeline.map((agent) => ({ ...agent, status: 'completed' as const, durationMs: durations[agent.id] }));
  }, [currentAgentIndex, durations, loading, result]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1220] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,#0B1220_0%,#0A1020_45%,#050816_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)] opacity-50 blur-3xl" />

      <div className="relative mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 px-5 py-5 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                <Radar className="h-3.5 w-3.5" />
                AI SRE Platform
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
                  OpsPilot AI
                </h1>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Enterprise Incident Intelligence
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                Investigate Kubernetes incidents with a premium operator console that blends AI reasoning, evidence
                gathering, remediation guidance, and incident reporting into one commercial-grade experience.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[420px]">
              {operationalSignals.map((signal) => (
                <StatusDot key={signal.label} label={signal.label} tone={signal.tone} />
              ))}
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <main className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.36)] backdrop-blur-2xl lg:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-400">Incident Intake</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Describe the incident, then let the agent investigate
                  </h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {featureCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.title}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
                      >
                        <Icon className="h-4 w-4 text-cyan-300" />
                        <div>
                          <p className="text-sm font-medium text-white">{card.title}</p>
                          <p className="text-xs text-slate-400">{card.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Incident details</span>
                  <textarea
                    value={incident}
                    onChange={(event) => setIncident(event.target.value)}
                    placeholder="Example: CrashLoopBackOff in payment-service namespace after latest deployment."
                    className="min-h-[180px] w-full rounded-[1.5rem] border border-white/10 bg-[#0B1220]/90 px-4 py-4 text-[15px] leading-7 text-slate-100 placeholder:text-slate-500 outline-none transition duration-200 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/15"
                  />
                </label>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">FastAPI</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Responses API</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Mock Kubernetes Tools</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(59,130,246,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(59,130,246,0.34)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Investigating
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Investigate Incident
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {error ? <ErrorAlert message={error} onRetry={() => runInvestigation()} /> : null}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-500/15 p-2 text-blue-300">
                    <ServerCog className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Backend</p>
                    <p className="text-sm font-medium text-white">API Connected</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-cyan-500/15 p-2 text-cyan-300">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">OpenAI</p>
                    <p className="text-sm font-medium text-white">Responses Flow</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-500/15 p-2 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Agent</p>
                    <p className="text-sm font-medium text-white">Orchestration Ready</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-500/15 p-2 text-amber-300">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Workflow</p>
                    <p className="text-sm font-medium text-white">Evidence Pipeline</p>
                  </div>
                </div>
              </div>
            </section>

            {!loading ? <AgentWorkflow steps={agentSteps} /> : null}

            {loading ? (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <AgentWorkflow steps={agentSteps} />
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Execution State</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">Agent is synthesizing evidence</h3>
                      </div>
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        Live
                      </div>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-950/80">
                      <div className="h-full w-3/4 animate-pulse rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" />
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      The platform is selecting tools, gathering mock Kubernetes evidence, and preparing the prompt for
                      the OpenAI reasoning pass.
                    </p>
                  </div>
                  <ResultSkeleton />
                </div>
              </div>
            ) : result ? (
              <section className="grid gap-5 xl:grid-cols-2">
                <ResultCard title="Summary" icon={Sparkles}>
                  <p className="text-sm leading-7 text-slate-200">{result.summary}</p>
                </ResultCard>

                <ResultCard title="Root Cause" icon={AlertTriangle}>
                  <p className="text-sm leading-7 text-slate-200">{result.root_cause}</p>
                </ResultCard>

                <ConfidenceMeter confidence={confidence} />

                <ResultCard title="Evidence" icon={DatabaseZap}>
                  <ul className="space-y-3">
                    {result.evidence.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-slate-200">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </ResultCard>

                <ResultCard title="Recommended Remediation" className="xl:col-span-2" icon={ShieldAlert}>
                  <p className="text-sm leading-7 text-slate-200">{result.remediation}</p>
                </ResultCard>

                <ResultCard title="Recovery Steps" className="xl:col-span-2" icon={ClipboardList}>
                  <ol className="grid gap-3 md:grid-cols-2">
                    {result.recovery_steps.map((step, index) => (
                      <li
                        key={step}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-7 text-slate-200"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-200">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </ResultCard>
              </section>
            ) : (
              <EmptyStatePanel />
            )}

            <TerminalPanel lines={terminalLines} />
          </main>

          <aside className="space-y-6">
            <Sidebar loading={loading} resultReady={Boolean(result)} />

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Investigation Metadata</p>
                <Gauge className={`h-5 w-5 ${confidenceTone}`} />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Started', startedAt ? new Date(startedAt).toLocaleString() : 'Pending'],
                  ['Completed', completedAt ? new Date(completedAt).toLocaleString() : 'Pending'],
                  ['Incident', incident || 'No incident submitted'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0B1220]/85 px-4 py-3"
                  >
                    <span className="text-sm text-slate-400">{label}</span>
                    <span className="max-w-[55%] truncate text-sm font-medium text-white">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 backdrop-blur-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Platform Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">Frontend</span>
                  <span className="text-sm font-medium text-emerald-300">Responsive SaaS UI</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">API Contract</span>
                  <span className="text-sm font-medium text-cyan-300">Unchanged</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">Controls</span>
                  <span className="text-sm font-medium text-amber-300">Advisory Only</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <footer className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 px-5 py-5 shadow-[0_24px_100px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
          <TechnologyBadges />
        </footer>
      </div>
    </div>
  );
}

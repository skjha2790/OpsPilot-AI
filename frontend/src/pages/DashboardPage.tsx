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
  Boxes,
  Cpu,
  Layers,
  MemoryStick,
  Timer,
} from 'lucide-react';

import type { AgentRunStep } from '../components/layout/AgentWorkflow';
import { AgentWorkflow } from '../components/layout/AgentWorkflow';
import { ConfidenceBadge } from '../components/layout/ConfidenceBadge';
import type { IncidentSeverity } from '../components/layout/DecisionPanel';
import { DecisionPanel } from '../components/layout/DecisionPanel';
import { DemoIncidentLibrary } from '../components/layout/DemoIncidentLibrary';
import { ErrorAlert } from '../components/layout/ErrorAlert';
import { ExpandablePanel } from '../components/layout/ExpandablePanel';
import type { ExecutableStep } from '../components/layout/ExecutableSteps';
import { ExecutableSteps } from '../components/layout/ExecutableSteps';
import { KubectlDescribeBlock } from '../components/layout/KubectlDescribeBlock';
import { LogTerminalBlock } from '../components/layout/LogTerminalBlock';
import { ResultCard } from '../components/layout/ResultCard';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusPill } from '../components/layout/StatusPill';
import { StatusDot } from '../components/layout/StatusDot';
import type { TerminalLine } from '../components/layout/TerminalPanel';
import { TerminalPanel } from '../components/layout/TerminalPanel';
import { TechnologyBadges } from '../components/layout/TechnologyBadges';
import { YamlCodeBlock } from '../components/layout/YamlCodeBlock';
import { SkeletonBlock, SkeletonLine } from '../components/layout/Skeleton';
import { InvestigationHistory } from '../components/layout/InvestigationHistory';
import { MetricCard } from '../components/layout/MetricCard';
import { useInvestigationHistory } from '../hooks/useInvestigationHistory';
import { usePlatformTelemetry } from '../hooks/usePlatformTelemetry';
import { useStreamingInvestigation } from '../hooks/useStreamingInvestigation';
import type { AgentEvent } from '../hooks/useStreamingInvestigation';
import type { DemoIncidentScenario } from '../demo/incidents';
import { DEMO_INCIDENTS } from '../demo/incidents';
import { KpiCard } from '../components/layout/KpiCard';
import robotIllustrationUrl from '../assets/opspilot-robot.svg';
import {
  getHtmlReportUrl,
  getInvestigationReport,
  getPdfReportUrl,
  type InvestigationReport,
} from '../services/reportService';

function pipelineForIncident(incidentId: string) {
  const base = [
    { id: 'intake', title: 'Incident Intake Agent' },
    { id: 'classification', title: 'Incident Classification Agent' },
    { id: 'discovery', title: 'Kubernetes Discovery Agent' },
  ];

  if (incidentId === 'imagepullbackoff') {
    return [
      ...base,
      { id: 'pod', title: 'Pod Inspection Agent' },
      { id: 'events', title: 'Events Collection Agent' },
      { id: 'registry', title: 'Registry Validation Agent' },
      { id: 'rca', title: 'Root Cause Analysis Agent' },
      { id: 'risk', title: 'Risk Assessment Agent' },
      { id: 'decision', title: 'Decision Agent' },
      { id: 'verification', title: 'Verification Agent' },
      { id: 'report', title: 'Report Generation Agent' },
    ] as const;
  }

  if (incidentId === 'oomkilled') {
    return [
      ...base,
      { id: 'pod', title: 'Pod Inspection Agent' },
      { id: 'resources', title: 'Resource Pressure Agent' },
      { id: 'rca', title: 'Root Cause Analysis Agent' },
      { id: 'risk', title: 'Risk Assessment Agent' },
      { id: 'report', title: 'Report Generation Agent' },
    ] as const;
  }

  if (incidentId === 'configmapmissing') {
    return [
      ...base,
      { id: 'pod', title: 'Pod Inspection Agent' },
      { id: 'events', title: 'Events Collection Agent' },
      { id: 'config', title: 'Configuration Validation Agent' },
      { id: 'rca', title: 'Root Cause Analysis Agent' },
      { id: 'report', title: 'Report Generation Agent' },
    ] as const;
  }

  if (incidentId === 'nodenotready') {
    return [
      ...base,
      { id: 'node', title: 'Node Diagnostics Agent' },
      { id: 'events', title: 'Events Collection Agent' },
      { id: 'rca', title: 'Root Cause Analysis Agent' },
      { id: 'risk', title: 'Risk Assessment Agent' },
      { id: 'decision', title: 'Decision Agent' },
      { id: 'verification', title: 'Verification Agent' },
      { id: 'report', title: 'Report Generation Agent' },
    ] as const;
  }

  // crashloopbackoff (default)
  return [
    ...base,
    { id: 'pod', title: 'Pod Inspection Agent' },
    { id: 'events', title: 'Events Collection Agent' },
    { id: 'logs', title: 'Logs Collection Agent' },
    { id: 'rca', title: 'Root Cause Analysis Agent' },
    { id: 'risk', title: 'Risk Assessment Agent' },
    { id: 'decision', title: 'Decision Agent' },
    { id: 'verification', title: 'Verification Agent' },
    { id: 'report', title: 'Report Generation Agent' },
  ] as const;
}

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

function makeAgentSteps(pipeline: ReadonlyArray<{ id: string; title: string }>, currentIndex: number, durations: Record<string, number | undefined>): AgentRunStep[] {
  return pipeline.map((agent, index) => {
    const status = index < currentIndex ? 'completed' : index === currentIndex ? 'running' : 'waiting';
    const durationMs = durations[agent.id] ?? durations[agent.title];
    return { ...agent, status, durationMs };
  });
}

function makeAgentStepsFromEvents(
  pipeline: ReadonlyArray<{ id: string; title: string }>,
  agentEvents: AgentEvent[],
  durations: Record<string, number | undefined>,
  severity: IncidentSeverity,
  approvalState: 'idle' | 'awaiting' | 'approved' | 'rejected',
  resultReady: boolean,
): AgentRunStep[] {
  const titleToStatus = new Map<string, AgentRunStep['status']>();
  for (const event of agentEvents) {
    if (event.type === 'agent_step' && event.agent && event.status) {
      titleToStatus.set(event.agent, event.status);
    }
  }

  return pipeline.map((agent) => {
    let status = titleToStatus.get(agent.title) ?? 'waiting';
    if (agent.id === 'decision' && severity === 'P1' && resultReady) {
      status = approvalState === 'approved' || approvalState === 'rejected'
        ? 'completed'
        : 'running';
    }
    if (agent.id === 'verification' && severity === 'P1' && approvalState === 'approved') {
      status = 'completed';
    }
    if (agent.id === 'report' && resultReady) {
      status = 'completed';
    }
    return { ...agent, status, durationMs: durations[agent.id] ?? durations[agent.title] };
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

function deriveAgentDurationsFromEvents(agentEvents: AgentEvent[], loading: boolean): Record<string, number> {
  const started = new Map<string, number>();
  const durations: Record<string, number> = {};
  const now = Date.now();

  for (const event of agentEvents) {
    if (event.type !== 'agent_step' || !event.agent) continue;
    const ts = event.ts ?? now;
    if (event.status === 'running') {
      started.set(event.agent, ts);
      continue;
    }
    if (event.status === 'completed') {
      const start = started.get(event.agent) ?? ts - 100;
      const elapsed = Math.max(100, ts - start);
      durations[event.agent] = (durations[event.agent] ?? 0) + elapsed;
      started.delete(event.agent);
    }
  }

  if (loading) {
    for (const [agent, start] of started.entries()) {
      durations[agent] = Math.max(durations[agent] ?? 0, Math.max(100, now - start));
    }
  }

  return durations;
}

function extractToolEntries(reportData: InvestigationReport | null, toolName: string) {
  const rawValues = Object.values(reportData?.kubernetes_evidence.tool_results ?? {});
  return rawValues.filter((value) => {
    if (!value || typeof value !== 'object') return false;
    return (value as { tool?: string }).tool === toolName;
  }) as Array<{ tool: string; arguments?: Record<string, unknown>; output?: Record<string, unknown> }>;
}

function extractLiveLogs(reportData: InvestigationReport | null, fallback: string[]) {
  for (const entry of extractToolEntries(reportData, 'get_pod_logs')) {
    const logs = entry.output?.logs;
    if (typeof logs === 'string' && logs.trim()) {
      return logs.split('\n').filter(Boolean);
    }
  }
  return fallback;
}

function extractLiveEvents(reportData: InvestigationReport | null, fallback: string[]) {
  const namespaceEvents = extractToolEntries(reportData, 'get_events');
  for (const entry of namespaceEvents) {
    const events = entry.output?.events;
    if (Array.isArray(events) && events.length > 0) {
      return [
        'Events:',
        '  Type     Reason                Count  Object                   Message',
        '  ----     ------                -----  ------                   -------',
        ...events.slice(0, 8).map((evt) => {
          const event = evt as Record<string, unknown>;
          return `  ${String(event.type ?? 'Normal').padEnd(8)} ${String(event.reason ?? 'Unknown').padEnd(20)} ${String(event.count ?? 1).padEnd(5)} ${String(event.object ?? '-').padEnd(24)} ${String(event.message ?? '')}`;
        }),
      ];
    }
  }
  return [
    'Events:',
    '  Type     Reason     Age    From               Message',
    '  ----     ------     ---    ----               -------',
    ...fallback.map((evt) => `  Warning  Event      0s     kubelet/node-xyz     ${evt}`),
  ];
}

function extractDeploymentYaml(reportData: InvestigationReport | null, deploymentName: string | null, fallback: string) {
  for (const entry of extractToolEntries(reportData, 'get_deployments')) {
    const deployments = entry.output?.deployments;
    if (!Array.isArray(deployments)) continue;
    const match = deployments.find((item) => {
      if (!item || typeof item !== 'object') return false;
      if (!deploymentName) return true;
      return (item as { name?: string }).name === deploymentName;
    }) as { manifest_yaml?: string } | undefined;
    if (typeof match?.manifest_yaml === 'string' && match.manifest_yaml.trim()) {
      return match.manifest_yaml;
    }
  }
  return fallback;
}

function extractPrimaryPodName(reportData: InvestigationReport | null) {
  for (const entry of extractToolEntries(reportData, 'describe_pod')) {
    const name = entry.output?.name;
    if (typeof name === 'string' && name) return name;
  }
  for (const entry of extractToolEntries(reportData, 'get_pod_logs')) {
    const name = entry.output?.pod_name;
    if (typeof name === 'string' && name) return name;
  }
  return '<pod-name>';
}

function buildLiveReasoning(
  reportData: InvestigationReport | null,
  result: { root_cause?: string; confidence?: number } | null,
  fallback: string,
) {
  if (!reportData || !result) return [fallback];
  const tools = reportData.kubernetes_evidence.selected_tools;
  const evidenceKeys = Object.keys(reportData.kubernetes_evidence.tool_results);
  return [
    `The agent validated the incident using real cluster evidence collected through ${tools.length > 0 ? tools.join(', ') : 'Kubernetes tools'}.`,
    `Root cause selection was based on ${evidenceKeys.length} captured evidence block(s), then ranked against the live pod, event, and workload state.`,
    `The current RCA concludes: ${result.root_cause ?? reportData.root_cause}. Confidence remained at ${result.confidence ?? reportData.ai_confidence}% after cross-checking the gathered evidence.`,
  ];
}

function commandStepsForLiveInvestigation(
  scenario: DemoIncidentScenario,
  reportData: InvestigationReport | null,
  namespace: string | null,
  deploymentName: string | null,
): ExecutableStep[] {
  const resolvedNamespace = namespace || 'default';
  const resolvedDeployment = deploymentName || '<deployment>';
  const resolvedPod = extractPrimaryPodName(reportData);

  const realRestartCommand =
    reportData?.recommended_remediation.find((item: InvestigationReport['recommended_remediation'][number]) => item.kubectl_command)?.kubectl_command ||
    `kubectl rollout restart deployment/${resolvedDeployment} -n ${resolvedNamespace}`;

  return [
    {
      id: `${scenario.id}-logs`,
      title: 'Collect logs',
      command: `kubectl -n ${resolvedNamespace} logs ${resolvedPod} --tail=200`,
      explanation: 'Capture recent pod logs from the affected workload to confirm the startup or runtime error signature.',
    },
    {
      id: `${scenario.id}-describe`,
      title: 'Describe pod',
      command: `kubectl -n ${resolvedNamespace} describe pod ${resolvedPod}`,
      explanation: 'Review container state, exit codes, conditions, warnings, and pod-level events from the affected pod.',
    },
    {
      id: `${scenario.id}-restart`,
      title: 'Restart deployment',
      command: realRestartCommand,
      explanation: 'Apply the primary remediation against the workload that the investigation identified as impacted.',
    },
    {
      id: `${scenario.id}-rollout-status`,
      title: 'Watch rollout status',
      command: `kubectl rollout status deployment/${resolvedDeployment} -n ${resolvedNamespace} --timeout=120s`,
      explanation: 'Wait until Kubernetes confirms the new ReplicaSet is available and the rollout finishes cleanly.',
    },
    {
      id: `${scenario.id}-pods`,
      title: 'Verify pods',
      command: `kubectl get pods -n ${resolvedNamespace} -o wide`,
      explanation: 'Verify that replacement pods are Running and Ready on healthy nodes and that restart counts stabilize.',
    },
  ];
}

function decisionExplanation(severity: IncidentSeverity) {
  if (severity === 'P0') {
    return 'P0 incidents trigger auto remediation in the UI workflow. The platform will simulate a safe restart, wait, verify, and close the incident.';
  }
  if (severity === 'P1') {
    return 'P1 incidents require explicit human approval before any remediation steps proceed. Approving will continue the workflow; rejecting will stop remediation and keep analysis visible.';
  }
  return 'P2 incidents are RCA-only. The platform generates analysis and a report, but does not proceed with remediation.';
}

function commandStepsForScenario(scenario: DemoIncidentScenario): ExecutableStep[] {
  const base: ExecutableStep[] = [
    {
      id: `${scenario.id}-logs`,
      title: 'Collect logs',
      command: scenario.kubectlCommands.find((c) => c.includes('logs')) ?? scenario.kubectlCommands[0] ?? 'kubectl logs <pod>',
      explanation: 'Capture recent log lines around the failure window to confirm the error signature and crash trigger.',
    },
    {
      id: `${scenario.id}-describe`,
      title: 'Describe pod',
      command: scenario.kubectlCommands.find((c) => c.includes('describe')) ?? 'kubectl describe pod <pod-name> -n <ns>',
      explanation: 'Review events, container state, probes, mounts, and termination reasons to validate the failure mode.',
    },
  ];

  const remediation = scenario.kubectlCommands.find((c) => c.includes('rollout restart')) ?? 'kubectl rollout restart deployment/<deployment> -n <ns>';
  const status = 'kubectl rollout status deployment/<deployment> -n <ns> --timeout=120s';
  const pods = 'kubectl get pods -n <ns> -o wide';

  return [
    ...base,
    {
      id: `${scenario.id}-restart`,
      title: 'Restart deployment',
      command: remediation,
      explanation: 'Apply a controlled restart to pick up corrected config/image and force new pods to be created.',
    },
    {
      id: `${scenario.id}-rollout-status`,
      title: 'Watch rollout status',
      command: status,
      explanation: 'Wait for the new ReplicaSet to become available and confirm the rollout completes without errors.',
    },
    {
      id: `${scenario.id}-pods`,
      title: 'Verify pods',
      command: pods,
      explanation: 'Confirm pods are Running/Ready and restart counts stop increasing; ensure they are scheduled on healthy nodes.',
    },
  ];
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const tone =
    confidence >= 80
      ? 'from-emerald-400 via-emerald-500 to-cyan-400'
      : confidence >= 50
        ? 'from-amber-400 via-yellow-400 to-orange-400'
        : 'from-rose-500 via-red-500 to-orange-500';

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-600">Confidence</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{confidence}%</p>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#E2E8F0]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-700`}
          style={{ width: `${Math.max(confidence, 8)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Confidence is derived from the model response and should be validated against operational context.
      </p>
    </div>
  );
}

function EmptyStatePanel() {
  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-600">Ready</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Start an investigation</h3>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Choose an incident scenario or describe the incident to generate a full, expandable report with evidence, logs,
            events, YAML inspection, and executable remediation steps.
          </p>
        </div>
        <div className="hidden md:block">
          <div className="relative h-24 w-40 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-blue-500/15 via-cyan-500/10 to-emerald-500/10">
            <div className="absolute inset-0 opacity-60 blur-2xl" />
            <div className="absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent animate-glowSweep" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Summary', 'Executive summary for on-call and stakeholders.'],
          ['Root Cause', 'Clear hypothesis tied to evidence.'],
          ['Evidence', 'Bullets the agent used to decide.'],
          ['Commands', 'Copy-ready kubectl steps with explanations.'],
        ].map(([title, description]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultSkeleton() {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <SkeletonBlock>
        <div className="space-y-3">
          <SkeletonLine widthClass="w-1/3" />
          <SkeletonLine widthClass="w-11/12" />
          <SkeletonLine widthClass="w-9/12" />
          <SkeletonLine widthClass="w-7/12" />
        </div>
      </SkeletonBlock>
      <SkeletonBlock>
        <div className="space-y-3">
          <SkeletonLine widthClass="w-1/3" />
          <SkeletonLine widthClass="w-full" />
          <SkeletonLine widthClass="w-10/12" />
          <SkeletonLine widthClass="w-8/12" />
        </div>
      </SkeletonBlock>
      <ConfidenceMeter confidence={72} />
      <SkeletonBlock>
        <div className="space-y-3">
          <SkeletonLine widthClass="w-1/3" />
          <SkeletonLine widthClass="w-full" />
          <SkeletonLine widthClass="w-11/12" />
          <SkeletonLine widthClass="w-9/12" />
        </div>
      </SkeletonBlock>
      <SkeletonBlock className="xl:col-span-2">
        <div className="space-y-3">
          <SkeletonLine widthClass="w-1/3" />
          <SkeletonLine widthClass="w-full" />
          <SkeletonLine widthClass="w-11/12" />
        </div>
      </SkeletonBlock>
      <SkeletonBlock className="xl:col-span-2">
        <div className="space-y-3">
          <SkeletonLine widthClass="w-1/3" />
          <SkeletonLine widthClass="w-full" />
          <SkeletonLine widthClass="w-10/12" />
          <SkeletonLine widthClass="w-8/12" />
        </div>
      </SkeletonBlock>
    </section>
  );
}

export function DashboardPage() {
  const {
    incident, setIncident, result, loading, error,
    startedAt, completedAt, runInvestigation,
    investigationId, agentEvents, namespace, deploymentName,
  } = useStreamingInvestigation();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [durations, setDurations] = useState<Record<string, number | undefined>>({});
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [reportData, setReportData] = useState<InvestigationReport | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<DemoIncidentScenario>(() => {
    return DEMO_INCIDENTS.find((scenario) => scenario.incidentText === incident) ?? DEMO_INCIDENTS[0];
  });
  const [approvalState, setApprovalState] = useState<'idle' | 'awaiting' | 'approved' | 'rejected'>('idle');
  const agentStartTsRef = useRef<number>(0);
  const agentIndexRef = useRef<number>(0);
  const durationsRef = useRef<Record<string, number | undefined>>({});
  const lastRecordedAtRef = useRef<string | null>(null);
  const history = useInvestigationHistory();
  const { telemetry, status } = usePlatformTelemetry({ pollMs: 5000, openaiHealthy: Boolean(result) || !error });
  const severity = selectedDemo.severity as IncidentSeverity;
  const eventDurations = useMemo(() => deriveAgentDurationsFromEvents(agentEvents, loading), [agentEvents, loading]);
  const effectiveDurations = agentEvents.length > 0 ? eventDurations : durations;

  useEffect(() => {
    if (!investigationId) return;
    let active = true;
    void getInvestigationReport(investigationId)
      .then((payload: InvestigationReport) => {
        if (active) setReportData(payload);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [investigationId]);

// Drive terminal from real SSE events
  useEffect(() => {
    if (agentEvents.length === 0) return;
  const last = agentEvents[agentEvents.length - 1];
  if (!last) return;
  if (last.type === 'tool_call' && last.tool) {
    setTerminalLines((lines) => [
      ...lines,
      makeTerminalLine(`[Tool] ${last.tool}(${JSON.stringify(last.args ?? {})})`),
    ].slice(-80));
  }
  if (last.type === 'tool_result' && last.tool) {
    setTerminalLines((lines) => [
      ...lines,
      makeTerminalLine(`[Result] ${last.tool} - data received`, 'success'),
    ].slice(-80));
  }
  if (last.type === 'complete' && last.result) {
    setTerminalLines((lines) => [
      ...lines,
      makeTerminalLine(`[AI] Root cause: ${(last.result as any)?.root_cause ?? ''}`, 'success'),
      makeTerminalLine('[Reporter] RCA saved to database', 'success'),
    ].slice(-80));
  }
  if (last.type === 'error') {
    setTerminalLines((lines) => [
      ...lines,
      makeTerminalLine(`[Error] ${last.message ?? 'Unknown'}`, 'warning'),
    ].slice(-80));
  }
  }, [agentEvents]);
  useEffect(() => {
    if (!loading) return;

    // Reset workflow state for a new investigation.
    setReportData(null);
    setCurrentAgentIndex(0);
    agentIndexRef.current = 0;
    agentStartTsRef.current = Date.now();
    setDurations({});
    durationsRef.current = {};
    setApprovalState('idle');
    setTerminalLines([
      makeTerminalLine('[Agent] Incident received'),
      makeTerminalLine(`[Agent] Scenario: ${selectedDemo.title}`),
      makeTerminalLine(
        `[Classifier] Severity ${selectedDemo.severity}`,
        selectedDemo.severity === 'P0' ? 'warning' : 'default',
      ),
    ]);
  }, [loading, selectedDemo]);

  useEffect(() => {
    if (severity === 'P1' && result && investigationId && approvalState === 'idle') {
      setApprovalState('awaiting');
      setTerminalLines((lines) => [
        ...lines,
        makeTerminalLine('[Decision] Human approval required', 'warning'),
      ].slice(-80));
    }
  }, [approvalState, investigationId, result, severity]);

  useEffect(() => {
    if (loading) return;
    if (!result) return;

    // Finalize any running agent timing once we have a response.
    const now = Date.now();
    const pipeline = pipelineForIncident(selectedDemo.id);
    const lastIndex = Math.min(agentIndexRef.current, pipeline.length - 1);
    const runningAgent = pipeline[lastIndex];
    if (runningAgent && durationsRef.current[runningAgent.id] == null) {
      const lastDuration = now - agentStartTsRef.current;
      durationsRef.current = { ...durationsRef.current, [runningAgent.id]: lastDuration };
      setDurations(durationsRef.current);
    }

    setCurrentAgentIndex(pipeline.length);
    setTerminalLines((lines) => {
        const next = [
          ...lines,
          makeTerminalLine(`[AI] Summary: ${result.summary ?? ''}`),
          makeTerminalLine('[Reporter] Report generated', 'success'),
        ];
        return next.slice(-80);
      });

    if (completedAt && lastRecordedAtRef.current !== completedAt) {
      lastRecordedAtRef.current = completedAt;
      history.add({
        incident,
        severity: selectedDemo.severity,
        outcome: approvalState === 'rejected' ? 'rejected' : 'completed',
        confidence: result.confidence ?? selectedDemo.confidence,
      });
    }
  }, [approvalState, completedAt, history, incident, loading, result, selectedDemo.id, selectedDemo.severity]);

  const confidence = result?.confidence ?? 0;
  const confidenceTone = useMemo(() => {
    if (confidence >= 80) return 'text-emerald-400';
    if (confidence >= 50) return 'text-amber-400';
    return 'text-rose-700';
  }, [confidence]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runInvestigation();
  }

  const agentSteps = useMemo(() => {
    const pipeline = pipelineForIncident(selectedDemo.id);
    if (agentEvents.length > 0) {
      return makeAgentStepsFromEvents(pipeline, agentEvents, effectiveDurations, severity, approvalState, Boolean(result));
    }
    if (loading) return makeAgentSteps(pipeline, currentAgentIndex, effectiveDurations);
    if (!result) {
      return pipeline.map((agent) => ({
        ...agent,
        status: 'waiting' as const,
        durationMs: effectiveDurations[agent.id] ?? effectiveDurations[agent.title],
      }));
    }
    return pipeline.map((agent) => ({
      ...agent,
      status: 'completed' as const,
      durationMs: effectiveDurations[agent.id] ?? effectiveDurations[agent.title],
    }));
  }, [agentEvents, approvalState, currentAgentIndex, effectiveDurations, loading, result, selectedDemo.id, severity]);

  const awaitingApproval =
    severity === 'P1' &&
    !loading &&
    Boolean(result) &&
    Boolean(investigationId) &&
    approvalState !== 'approved' &&
    approvalState !== 'rejected';
  const approved = approvalState === 'approved';
  const rejected = approvalState === 'rejected';

  const kpiSparks = useMemo(() => {
    const base = [12, 14, 13, 15, 18, 16, 17, 20, 19, 22];
    const wobble = (seed: number) => base.map((v, i) => v + Math.sin((i + 1) * 0.9 + seed) * 2.2);
    return {
      incidents: wobble(1.2),
      mttr: wobble(2.3),
      confidence: wobble(3.1),
      remediations: wobble(4.2),
    };
  }, []);

  const liveLogs = useMemo(() => extractLiveLogs(reportData, selectedDemo.logs), [reportData, selectedDemo.logs]);
  const liveEvents = useMemo(() => extractLiveEvents(reportData, selectedDemo.events), [reportData, selectedDemo.events]);
  const liveDeploymentYaml = useMemo(
    () => extractDeploymentYaml(reportData, deploymentName, selectedDemo.deploymentYaml),
    [deploymentName, reportData, selectedDemo.deploymentYaml],
  );
  const liveReasoning = useMemo(
    () => buildLiveReasoning(reportData, result, selectedDemo.aiReasoning),
    [reportData, result, selectedDemo.aiReasoning],
  );
  const liveCommandSteps = useMemo(
    () => commandStepsForLiveInvestigation(selectedDemo, reportData, namespace, deploymentName),
    [deploymentName, namespace, reportData, selectedDemo],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-slate-900">
      <div className="relative mx-auto max-w-[1700px] px-4 py-8 sm:px-6 lg:px-10">
        <header className="rounded-[22px] border border-[#E7EAF2] bg-[radial-gradient(circle_at_18%_12%,#F8FBFF_0%,transparent_55%),radial-gradient(circle_at_82%_10%,#F7F5FF_0%,transparent_58%),linear-gradient(180deg,#FFFFFF_0%,#FBFDFF_100%)] px-6 py-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center">
                <div className="shrink-0">
                <div className="relative h-[220px] w-[220px] sm:h-[240px] sm:w-[240px]">
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.25),transparent_55%)]" />
                  <div className="pointer-events-none absolute inset-6 rounded-full bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.14),transparent_60%)]" />
                  <img
                    src={robotIllustrationUrl}
                    alt="OpsPilot AI"
                    className="relative h-full w-full select-none drop-shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                    draggable={false}
                  />
                </div>
                </div>
                <div className="max-w-3xl">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h1 className="bg-gradient-to-r from-[#0F172A] to-[#4F46E5] bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
                    OpsPilot AI
                  </h1>
                  <span className="rounded-full border border-[#60A5FA] bg-[#EFF6FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#1D4ED8]">
                    ENTERPRISE INCIDENT INTELLIGENCE
                  </span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#334155] md:text-base">
                  AI-powered Kubernetes incident investigation platform that autonomously performs RCA, correlates evidence and recommends safe remediation actions.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[420px]">
              {operationalSignals.map((signal) => (
                <StatusDot key={signal.label} label={signal.label} tone={signal.tone} />
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Active Incidents"
              value={`${Math.max(1, history.recent.length)}`}
              delta="last 24h"
              icon={<ShieldAlert className="h-5 w-5 text-[#4F46E5]" />}
              sparkline={kpiSparks.incidents}
              accent="#4F46E5"
            />
            <KpiCard
              label="MTTR"
              value={completedAt && startedAt ? `${Math.max(1, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000))}m` : '12m'}
              delta="rolling 7d"
              icon={<Timer className="h-5 w-5 text-[#60A5FA]" />}
              sparkline={kpiSparks.mttr}
              accent="#60A5FA"
            />
            <KpiCard
              label="AI Confidence"
              value={`${result?.confidence ?? selectedDemo.confidence}%`}
              delta="current investigation"
              icon={<Brain className="h-5 w-5 text-[#4F46E5]" />}
              sparkline={kpiSparks.confidence}
              accent="#4F46E5"
            />
            <KpiCard
              label="Remediations"
              value={severity === 'P2' ? '0' : severity === 'P1' && awaitingApproval ? '1' : '2'}
              delta="recommended"
              icon={<CheckCircle2 className="h-5 w-5 text-[#22C55E]" />}
              sparkline={kpiSparks.remediations}
              accent="#22C55E"
            />
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <main className="space-y-6">
            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">Platform Status</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Ops Overview</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">Live health and cluster telemetry.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill label="Backend" status={status.backend} />
                  <StatusPill label="OpenAI" status={status.openai} />
                  <StatusPill label="Kubernetes" status={status.kubernetes} />
                  <StatusPill label="AI Agents" status={status.agents} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard label="Running Pods" value={`${telemetry.runningPods}`} icon={<Boxes className="h-5 w-5" />} />
                <MetricCard label="Healthy Pods" value={`${telemetry.healthyPods}`} icon={<CheckCircle2 className="h-5 w-5" />} />
                <MetricCard label="Deployments" value={`${telemetry.deployments}`} icon={<Layers className="h-5 w-5" />} />
                <MetricCard label="Namespaces" value={`${telemetry.namespaces}`} icon={<Layers className="h-5 w-5" />} />
                <MetricCard label="CPU" value={`${Math.round(telemetry.cpuPercent)}%`} helper="node utilization" icon={<Cpu className="h-5 w-5" />} />
                <MetricCard label="Memory" value={`${Math.round(telemetry.memoryPercent)}%`} helper="node utilization" icon={<MemoryStick className="h-5 w-5" />} />
              </div>
            </section>

            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] lg:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-600">Incident Intake</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    Describe the incident, then let the agent investigate
                  </h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {featureCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.title}
                        className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FBFF] px-4 py-3"
                      >
                        <Icon className="h-4 w-4 text-[#4F46E5]" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{card.title}</p>
                          <p className="text-xs text-slate-600">{card.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <DemoIncidentLibrary
                  incidents={DEMO_INCIDENTS}
                  selectedId={selectedDemo.id}
                  onSelect={(scenario) => {
                    setSelectedDemo(scenario);
                    setIncident(scenario.incidentText);
                    setApprovalState('idle');
                    setTerminalLines([
                      makeTerminalLine(`[Agent] Scenario selected: ${scenario.title}`, 'success'),
                      makeTerminalLine('[Agent] Prefilled incident input'),
                    ]);
                  }}
                />

                <ResultCard
                  title="Incident Scenario"
                  className="border-[#0F172A] bg-[#0F172A] shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
                >
                  <div className="scrollbar-slim max-h-[520px] space-y-4 overflow-auto pr-1">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Summary</p>
                      <p className="mt-2 text-sm leading-7 text-slate-100">{selectedDemo.summary}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Events</p>
                        <ul className="mt-2 space-y-2 text-xs leading-6 text-slate-100">
                          {selectedDemo.events.slice(0, 3).map((evt) => (
                            <li key={evt} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#60A5FA]" />
                              <span className="line-clamp-2">{evt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Logs</p>
                        <div className="mt-2 space-y-1 font-mono text-[12px] leading-6 text-slate-100">
                          {selectedDemo.logs.slice(0, 3).map((line) => (
                            <div key={line} className="truncate">
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Suggested kubectl</p>
                      <div className="mt-2 space-y-1 font-mono text-[12px] leading-6 text-slate-100">
                        {selectedDemo.kubectlCommands.slice(0, 3).map((cmd) => (
                          <div key={cmd} className="truncate">
                            {cmd}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">AI reasoning</p>
                      <p className="mt-2 text-sm leading-7 text-slate-100">{selectedDemo.aiReasoning}</p>
                    </div>
                  </div>
                </ResultCard>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Incident details</span>
                  <textarea
                    value={incident}
                    onChange={(event) => setIncident(event.target.value)}
                    placeholder="Example: CrashLoopBackOff in payment-service namespace after latest deployment."
                    className="min-h-[180px] w-full rounded-[18px] border border-[#E2E8F0] bg-[#F8FBFF] px-4 py-4 text-[15px] leading-7 text-slate-900 placeholder:text-slate-500 outline-none transition duration-200 focus:border-[#4F46E5] focus:ring-4 focus:ring-indigo-500/15"
                  />
                </label>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
                    <span className="rounded-full border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-1">FastAPI</span>
                    <span className="rounded-full border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-1">Responses API</span>
                    <span className="rounded-full border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-1">Kubernetes Python Client</span>
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
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] p-2 text-[#4F46E5]">
                    <ServerCog className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">Backend</p>
                    <p className="text-sm font-semibold text-slate-900">API Connected</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] p-2 text-[#4F46E5]">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">OpenAI</p>
                    <p className="text-sm font-semibold text-slate-900">Responses Flow</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] p-2 text-[#22C55E]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">Agent</p>
                    <p className="text-sm font-semibold text-slate-900">Orchestration Ready</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] p-2 text-[#F59E0B]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">Workflow</p>
                    <p className="text-sm font-semibold text-slate-900">Evidence Pipeline</p>
                  </div>
                </div>
              </div>
            </section>

            {!loading ? <AgentWorkflow steps={agentSteps} /> : null}

            <DecisionPanel
              severity={severity}
              awaitingApproval={awaitingApproval}
              approved={approved}
              rejected={rejected}
              explanation={decisionExplanation(severity)}
              onApprove={async () => {
                setApprovalState('approved');
                if (investigationId) {
                  try {
                    const { approveRemediation } = await import('../services/remediationService');
                    const rem = await approveRemediation(investigationId);
                    setTerminalLines((lines) => [
                      ...lines,
                      makeTerminalLine(
                        rem.verified_healthy
                          ? `[Remediator] ? ${rem.deployment_name} restarted — pods verified healthy`
                          : `[Remediator] ? ${rem.deployment_name} restarted — verify manually`,
                        rem.verified_healthy ? 'success' : 'warning',
                      ),
                    ]);
                  } catch (err) {
                    setTerminalLines((lines) => [
                      ...lines,
                      makeTerminalLine(`[Remediator] Error: ${(err as Error).message}`, 'warning'),
                    ]);
                  }
                }
                setTerminalLines((lines) => [
                  ...lines,
                  makeTerminalLine('[Decision] Approved by human operator', 'success'),
                  makeTerminalLine('[Remediator] Executing: kubectl rollout restart deployment/<deployment>', 'warning'),
                ]);
              }}
              onReject={async () => {
                setApprovalState('rejected');
                if (investigationId) {
                  const { rejectRemediation } = await import('../services/remediationService');
                  await rejectRemediation(investigationId).catch(() => null);
                }
                setTerminalLines((lines) => [
                  ...lines,
                  makeTerminalLine('[Decision] Rejected by human operator', 'warning'),
                  makeTerminalLine('[Remediator] Remediation skipped'),
                ]);
              }}
            />

            {investigationId ? (
              <div className="flex flex-wrap justify-end gap-3">
                <a
                  href={getHtmlReportUrl(investigationId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:text-[#1D4ED8]"
                >
                  <ClipboardList className="h-4 w-4" />
                  Open RCA Report
                </a>
                <a
                  href={getPdfReportUrl(investigationId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:text-[#1D4ED8]"
                >
                  <ClipboardList className="h-4 w-4" />
                  Open PDF Report
                </a>
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <AgentWorkflow steps={agentSteps} />
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-700">Execution State</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">Agent is synthesizing evidence</h3>
                      </div>
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        Live
                      </div>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-950/80">
                      <div className="h-full w-3/4 animate-pulse rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" />
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-700">
                      The platform is selecting tools, gathering live Kubernetes evidence, and preparing the prompt for
                      the OpenAI reasoning pass.
                    </p>
                  </div>
                  <ResultSkeleton />
                </div>
              </div>
            ) : null}

            <section className="space-y-4">
              <ExpandablePanel
                title="Summary"
                defaultOpen
                subtitle="Executive summary of what is happening and why it matters."
                rightSlot={<ConfidenceBadge confidence={result?.confidence ?? selectedDemo.confidence} />}
              >
                <p className="text-sm leading-7 text-slate-700">{result?.summary ?? selectedDemo.summary}</p>
              </ExpandablePanel>

              <ExpandablePanel title="Root Cause" subtitle="Most likely root cause based on evidence and signals.">
                <p className="text-sm leading-7 text-slate-700">
                  {result?.root_cause ?? 'Run an investigation to generate a root cause hypothesis.'}
                </p>
              </ExpandablePanel>

              <ExpandablePanel title="Evidence" subtitle="Evidence bullets used to support the conclusion.">
                <ul className="space-y-2 text-sm leading-7 text-slate-700">
                  {(result?.evidence ?? selectedDemo.evidence).map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#60A5FA]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </ExpandablePanel>

              <ExpandablePanel title="Logs" subtitle="Captured application logs or latest pod output.">
                <LogTerminalBlock lines={liveLogs} />
              </ExpandablePanel>

              <ExpandablePanel title="Events" subtitle="kubectl describe-like output for recent event history.">
                <KubectlDescribeBlock lines={liveEvents} />
              </ExpandablePanel>

              <ExpandablePanel title="Deployment YAML" subtitle="Relevant Kubernetes manifests used for inspection.">
                <YamlCodeBlock yaml={liveDeploymentYaml} />
              </ExpandablePanel>

              <ExpandablePanel title="AI Reasoning" subtitle="Why the agent reached this conclusion.">
                <div className="space-y-3">
                  {liveReasoning.map((item) => (
                    <p key={item} className="text-sm leading-7 text-slate-700">
                      {item}
                    </p>
                  ))}
                </div>
              </ExpandablePanel>

              <ExpandablePanel title="Verification" subtitle="What to check after remediation or change.">
                <ul className="space-y-2 text-sm leading-7 text-slate-700">
                  {(result?.recovery_steps ?? selectedDemo.verification).map((step) => (
                    <li key={step} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </ExpandablePanel>

              <ExpandablePanel title="Commands" subtitle="Suggested kubectl commands for evidence, remediation, and verification.">
                <ExecutableSteps steps={result ? liveCommandSteps : commandStepsForScenario(selectedDemo)} />
                <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">Recommended remediation</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{result?.remediation ?? selectedDemo.remediation}</p>
                </div>
              </ExpandablePanel>
            </section>

            <TerminalPanel lines={terminalLines} />
          </main>

          <aside className="space-y-6">
            <Sidebar loading={loading} resultReady={Boolean(result)} />

            <InvestigationHistory items={history.recent} />

            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-600">Investigation Metadata</p>
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
                    className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] px-4 py-3"
                  >
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className="max-w-[55%] truncate text-sm font-semibold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-600">Platform Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Frontend</span>
                  <span className="text-sm font-semibold text-emerald-600">Responsive SaaS UI</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">API Contract</span>
                  <span className="text-sm font-semibold text-sky-700">Unchanged</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Controls</span>
                  <span className="text-sm font-semibold text-amber-700">Advisory Only</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <footer className="mt-6 rounded-xl border border-[#E2E8F0] bg-white px-6 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <TechnologyBadges />
        </footer>
      </div>
    </div>
  );
}


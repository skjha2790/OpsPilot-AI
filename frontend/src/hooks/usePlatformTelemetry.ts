import { useEffect, useMemo, useRef, useState } from 'react';

import { checkBackendStatus, type HealthStatus } from '../services/platformStatusService';

export interface ClusterTelemetry {
  runningPods: number;
  healthyPods: number;
  deployments: number;
  namespaces: number;
  cpuPercent: number;
  memoryPercent: number;
}

export interface PlatformStatusSnapshot {
  backend: HealthStatus;
  openai: HealthStatus;
  kubernetes: HealthStatus;
  agents: HealthStatus;
  lastCheckedAt: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function statusFromPercent(value: number): HealthStatus {
  if (value >= 90) return 'red';
  if (value >= 75) return 'yellow';
  return 'green';
}

function nextTelemetry(previous: ClusterTelemetry): ClusterTelemetry {
  const cpuDelta = (Math.random() - 0.5) * 8;
  const memDelta = (Math.random() - 0.5) * 6;
  const runningDelta = Math.round((Math.random() - 0.5) * 4);
  const runningPods = clamp(previous.runningPods + runningDelta, 18, 64);
  const healthyPods = clamp(runningPods - clamp(Math.round(Math.random() * 3), 0, 6), 16, runningPods);

  return {
    ...previous,
    runningPods,
    healthyPods,
    cpuPercent: clamp(previous.cpuPercent + cpuDelta, 10, 98),
    memoryPercent: clamp(previous.memoryPercent + memDelta, 12, 96),
  };
}

const INITIAL_TELEMETRY: ClusterTelemetry = {
  runningPods: 34,
  healthyPods: 32,
  deployments: 14,
  namespaces: 9,
  cpuPercent: 48,
  memoryPercent: 55,
};

export function usePlatformTelemetry({
  pollMs = 5000,
  openaiHealthy = true,
}: {
  pollMs?: number;
  openaiHealthy?: boolean;
} = {}) {
  const [telemetry, setTelemetry] = useState<ClusterTelemetry>(INITIAL_TELEMETRY);
  const [status, setStatus] = useState<PlatformStatusSnapshot>(() => ({
    backend: 'yellow',
    openai: openaiHealthy ? 'green' : 'yellow',
    kubernetes: 'yellow',
    agents: 'green',
    lastCheckedAt: Date.now(),
  }));

  const openaiHealthyRef = useRef(openaiHealthy);
  openaiHealthyRef.current = openaiHealthy;

  useEffect(() => {
    const controller = new AbortController();

    async function tick() {
      const backend = await checkBackendStatus(controller.signal);
      const next = nextTelemetry(telemetry);
      setTelemetry(next);

      setStatus({
        backend,
        openai: openaiHealthyRef.current ? 'green' : 'yellow',
        kubernetes: statusFromPercent(Math.max(next.cpuPercent, next.memoryPercent)),
        agents: 'green',
        lastCheckedAt: Date.now(),
      });
    }

    void tick();
    const timer = window.setInterval(() => void tick(), pollMs);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  const derived = useMemo(() => {
    const overall: HealthStatus =
      status.backend === 'red' ? 'red' : status.kubernetes === 'red' ? 'red' : status.openai === 'yellow' ? 'yellow' : 'green';
    return { overall };
  }, [status.backend, status.kubernetes, status.openai]);

  return { telemetry, status, derived };
}


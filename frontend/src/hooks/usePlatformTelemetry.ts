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

const API_BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env
  .VITE_API_BASE_URL ?? '';

const FALLBACK_TELEMETRY: ClusterTelemetry = {
  runningPods: 0,
  healthyPods: 0,
  deployments: 0,
  namespaces: 0,
  cpuPercent: 0,
  memoryPercent: 0,
};

async function fetchRealTelemetry(signal: AbortSignal): Promise<ClusterTelemetry | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/telemetry`, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.source === 'unavailable') return null;
    return {
      runningPods: data.running_pods ?? 0,
      healthyPods: data.healthy_pods ?? 0,
      deployments: data.deployments ?? 0,
      namespaces: data.namespaces ?? 0,
      // CPU and memory are not returned by the basic telemetry endpoint;
      // keep zeros until a metrics-server integration is added.
      cpuPercent: data.cpu_percent ?? 0,
      memoryPercent: data.memory_percent ?? 0,
    };
  } catch {
    return null;
  }
}

export function usePlatformTelemetry({
  pollMs = 10000,
  openaiHealthy = true,
}: {
  pollMs?: number;
  openaiHealthy?: boolean;
} = {}) {
  const [telemetry, setTelemetry] = useState<ClusterTelemetry>(FALLBACK_TELEMETRY);
  const [k8sAvailable, setK8sAvailable] = useState(false);
  const [status, setStatus] = useState<PlatformStatusSnapshot>({
    backend: 'yellow',
    openai: openaiHealthy ? 'green' : 'yellow',
    kubernetes: 'yellow',
    agents: 'green',
    lastCheckedAt: Date.now(),
  });

  const openaiHealthyRef = useRef(openaiHealthy);
  openaiHealthyRef.current = openaiHealthy;

  useEffect(() => {
    const controller = new AbortController();

    async function tick() {
      const [backend, real] = await Promise.all([
        checkBackendStatus(controller.signal),
        fetchRealTelemetry(controller.signal),
      ]);

      if (real) {
        setTelemetry(real);
        setK8sAvailable(true);
      } else {
        setK8sAvailable(false);
      }

      setStatus({
        backend,
        openai: openaiHealthyRef.current ? 'green' : 'yellow',
        kubernetes: real ? 'green' : 'yellow',
        agents: backend === 'green' ? 'green' : 'yellow',
        lastCheckedAt: Date.now(),
      });
    }

    void tick();
    const timer = window.setInterval(() => void tick(), pollMs);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [pollMs]);

  const derived = useMemo(() => {
    const overall: HealthStatus =
      status.backend === 'red' ? 'red' : status.kubernetes === 'red' ? 'red' : status.openai === 'yellow' ? 'yellow' : 'green';
    return { overall, k8sAvailable };
  }, [status.backend, status.kubernetes, status.openai, k8sAvailable]);

  return { telemetry, status, derived };
}

import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "";

export type HealthStatus = "green" | "yellow" | "red";

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

const FALLBACK: ClusterTelemetry = {
  runningPods: 0, healthyPods: 0, deployments: 0,
  namespaces: 0, cpuPercent: 0, memoryPercent: 0,
};

async function fetchTelemetry(signal: AbortSignal): Promise<ClusterTelemetry | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/telemetry`, { signal });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.source === "unavailable") return null;
    return {
      runningPods: d.running_pods ?? 0,
      healthyPods: d.healthy_pods ?? 0,
      deployments: d.deployments ?? 0,
      namespaces: d.namespaces ?? 0,
      cpuPercent: d.cpu_percent ?? 0,
      memoryPercent: d.memory_percent ?? 0,
    };
  } catch { return null; }
}

async function checkBackend(signal: AbortSignal): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal });
    return res.ok ? "green" : "yellow";
  } catch { return "red"; }
}

export function usePlatformTelemetry({ pollMs = 10000, openaiHealthy = true } = {}) {
  const [telemetry, setTelemetry] = useState<ClusterTelemetry>(FALLBACK);
  const [k8sAvailable, setK8sAvailable] = useState(false);
  const [status, setStatus] = useState<PlatformStatusSnapshot>({
    backend: "yellow", openai: "yellow",
    kubernetes: "yellow", agents: "green",
    lastCheckedAt: Date.now(),
  });
  const openaiRef = useRef(openaiHealthy);
  openaiRef.current = openaiHealthy;

  useEffect(() => {
    const ctrl = new AbortController();
    async function tick() {
      const [backend, real] = await Promise.all([
        checkBackend(ctrl.signal),
        fetchTelemetry(ctrl.signal),
      ]);
      if (real) { setTelemetry(real); setK8sAvailable(true); }
      else setK8sAvailable(false);
      setStatus({
        backend,
        openai: openaiRef.current ? "green" : "yellow",
        kubernetes: real ? "green" : "yellow",
        agents: backend === "green" ? "green" : "yellow",
        lastCheckedAt: Date.now(),
      });
    }
    void tick();
    const t = window.setInterval(() => void tick(), pollMs);
    return () => { ctrl.abort(); window.clearInterval(t); };
  }, [pollMs]);

  const derived = useMemo(() => ({
    overall: status.backend === "red" ? "red" as HealthStatus
      : status.kubernetes === "red" ? "red" as HealthStatus
      : status.openai === "yellow" ? "yellow" as HealthStatus
      : "green" as HealthStatus,
    k8sAvailable,
  }), [status, k8sAvailable]);

  return { telemetry, status, derived };
}

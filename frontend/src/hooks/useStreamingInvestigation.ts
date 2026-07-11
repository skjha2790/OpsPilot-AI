import { useCallback, useRef, useState } from 'react';

import type { InvestigationResponse } from '../types/investigation';

export interface AgentEvent {
  type: 'agent_step' | 'tool_call' | 'tool_result' | 'complete' | 'saved' | 'error';
  agent?: string;
  status?: 'waiting' | 'running' | 'completed';
  tool?: string;
  args?: Record<string, unknown>;
  output?: unknown;
  result?: InvestigationResponse;
  tools_called?: string[];
  investigation_id?: number;
  namespace?: string;
  deployment_name?: string;
  message?: string;
}

export interface StreamingState {
  incident: string;
  result: InvestigationResponse | null;
  loading: boolean;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  investigationId: number | null;
  namespace: string | null;
  deploymentName: string | null;
  toolsCalled: string[];
  agentEvents: AgentEvent[];
}

const API_BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env
  .VITE_API_BASE_URL ?? '';

export function useStreamingInvestigation() {
  const [incident, setIncident] = useState(
    'CrashLoopBackOff in payment-service namespace after latest deployment.',
  );
  const [state, setState] = useState<Omit<StreamingState, 'incident'>>({
    result: null,
    loading: false,
    error: null,
    startedAt: null,
    completedAt: null,
    investigationId: null,
    namespace: null,
    deploymentName: null,
    toolsCalled: [],
    agentEvents: [],
  });

  const abortRef = useRef<AbortController | null>(null);

  const runInvestigation = useCallback(
    async (nextIncident: string = incident) => {
      const trimmed = nextIncident.trim();
      if (!trimmed) {
        setState((s) => ({ ...s, error: 'Enter a Kubernetes incident to investigate.' }));
        return;
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setState({
        result: null,
        loading: true,
        error: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
        investigationId: null,
        namespace: null,
        deploymentName: null,
        toolsCalled: [],
        agentEvents: [],
      });

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/investigate/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ incident: trimmed }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event: AgentEvent = JSON.parse(line.slice(6));
              setState((s) => {
                const next = { ...s, agentEvents: [...s.agentEvents, event] };
                if (event.type === 'tool_call' && event.tool) {
                  next.toolsCalled = [...s.toolsCalled, event.tool];
                }
                if (event.type === 'complete' && event.result) {
                  next.result = {
                    ...event.result,
                    tools_called: event.tools_called ?? [],
                  };
                  next.completedAt = new Date().toISOString();
                  next.loading = false;
                }
                if (event.type === 'saved') {
                  next.investigationId = event.investigation_id ?? null;
                  next.namespace = event.namespace ?? null;
                  next.deploymentName = event.deployment_name ?? null;
                  next.loading = false;
                }
                if (event.type === 'error') {
                  next.error = event.message ?? 'Investigation failed.';
                  next.loading = false;
                }
                return next;
              });
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Investigation failed.',
        }));
      }
    },
    [incident],
  );

  return { incident, setIncident, ...state, runInvestigation };
}

import { useState } from 'react';

import { investigateIncident } from '../services/investigationService';
import type { InvestigationResponse } from '../types/investigation';

export function useInvestigation() {
  const [incident, setIncident] = useState('CrashLoopBackOff in payment-service namespace after latest deployment.');
  const [result, setResult] = useState<InvestigationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  async function runInvestigation(nextIncident: string = incident) {
    const trimmedIncident = nextIncident.trim();
    if (!trimmedIncident) {
      setError('Enter a Kubernetes incident to investigate.');
      return;
    }

    setLoading(true);
    setError(null);
    setStartedAt(new Date().toISOString());
    setCompletedAt(null);

    try {
      const response = await investigateIncident({ incident: trimmedIncident });
      setResult(response);
      setIncident(trimmedIncident);
      setCompletedAt(new Date().toISOString());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return {
    incident,
    setIncident,
    result,
    loading,
    error,
    startedAt,
    completedAt,
    runInvestigation,
  };
}


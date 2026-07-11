const API_BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env
  .VITE_API_BASE_URL ?? '';

export interface RemediationResult {
  investigation_id: number;
  action: string;
  status: string;
  namespace: string | null;
  deployment_name: string | null;
  verified_healthy: boolean;
  message: string;
  executed_at: string;
}

export async function approveRemediation(
  investigationId: number,
): Promise<RemediationResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/remediation/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investigation_id: investigationId, action: 'rollout_restart' }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.detail ?? `Remediation failed: ${response.status}`);
  }
  return response.json() as Promise<RemediationResult>;
}

export async function rejectRemediation(investigationId: number): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/remediation/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investigation_id: investigationId, action: 'rollout_restart' }),
  });
}

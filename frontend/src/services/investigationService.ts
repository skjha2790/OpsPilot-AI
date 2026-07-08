import type { InvestigationRequest, InvestigationResponse } from '../types/investigation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload?.error?.message ?? payload?.detail ?? 'Investigation request failed.';
  } catch {
    return 'Investigation request failed.';
  }
}

export async function investigateIncident(
  request: InvestigationRequest,
): Promise<InvestigationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/investigate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<InvestigationResponse>;
}


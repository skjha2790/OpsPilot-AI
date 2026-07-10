const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export type HealthStatus = 'green' | 'yellow' | 'red';

export async function checkBackendStatus(signal?: AbortSignal): Promise<HealthStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/openapi.json`, { method: 'GET', signal });
    return response.ok ? 'green' : 'red';
  } catch {
    return 'red';
  }
}


const API_BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env
  .VITE_API_BASE_URL ?? '';

export interface InvestigationReport {
  report_id: string;
  timestamp: string;
  incident_title: string;
  executive_summary: string;
  root_cause: string;
  ai_confidence: number;
  recovery_steps: string[];
  preventive_actions: string[];
  kubernetes_evidence: {
    incident: string;
    selected_tools: string[];
    tool_results: Record<string, unknown>;
    failure_count: number;
  };
  recommended_remediation: Array<{
    id: string;
    title: string;
    description: string;
    kubectl_command?: string | null;
    rollback_command?: string | null;
  }>;
  investigation_metadata: Record<string, unknown>;
}

export function getHtmlReportUrl(investigationId: number): string {
  return `${API_BASE_URL}/api/v1/reports/${investigationId}?format=html`;
}

export function getPdfReportUrl(investigationId: number): string {
  return `${API_BASE_URL}/api/v1/reports/${investigationId}?format=pdf`;
}

export async function getInvestigationReport(investigationId: number): Promise<InvestigationReport> {
  const response = await fetch(`${API_BASE_URL}/api/v1/reports/${investigationId}?format=json`);
  if (!response.ok) {
    throw new Error(`Unable to load report: ${response.status}`);
  }
  return response.json() as Promise<InvestigationReport>;
}

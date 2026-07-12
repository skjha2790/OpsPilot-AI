export interface InvestigationRequest {
  incident: string;
}

export interface InvestigationResponse {
  summary: string;
  root_cause: string;
  confidence: number;
  evidence: string[];
  remediation: string;
  recovery_steps: string[];
  investigation_id?: number | null;
  tools_called?: string[];
  real_k8s?: boolean;
}

export interface InvestigationState {
  incident: string;
  result: InvestigationResponse | null;
  loading: boolean;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}



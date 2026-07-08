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
}

export interface InvestigationState {
  incident: string;
  result: InvestigationResponse | null;
  loading: boolean;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}


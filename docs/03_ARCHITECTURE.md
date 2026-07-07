# OpsPilot AI Architecture

## 1. System Overview

OpsPilot AI is a hackathon MVP for autonomous Kubernetes incident investigation and safe recovery. The system is built around a single intelligence layer: the OpenAI Responses API with Tool Calling. The model reasons over cluster evidence, chooses the next best tool to call, and drives the investigation flow from detection through reporting.

The architecture is intentionally compact and realistic for a hackathon:

- A React + TypeScript frontend provides the operator experience.
- A FastAPI + Python backend exposes the investigation APIs and orchestrates agent execution.
- The OpenAI Responses API performs the reasoning and tool selection.
- The Kubernetes Python Client is the only cluster access layer.
- SQLite stores investigation records, evidence snapshots, actions, and reports.
- Docker, Kind, Helm, Terraform, and GitHub Actions support local deployment and repeatable delivery.

The system is designed to investigate the supported Kubernetes incident types defined in the overview and PRD, recommend safe remediation, optionally perform approved recovery actions, verify results, and produce an incident report.

## 2. High-Level Architecture Diagram (ASCII)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                React UI                                      │
│                         TypeScript + TailwindCSS + shadcn/ui                │
│                                                                              │
│  Dashboard  ──  Investigation View  ──  Evidence  ──  Recommendation       │
│      │                    │                  │                │              │
│      └────────────────────┴──────────────────┴────────────────┴──────┐       │
└───────────────────────────────────────────────────────────────────────┼───────┘
                                                                        │
                                                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                FastAPI                                      │
│                      Investigation / Reporting API                          │
│                                                                              │
│  Incident Intake  ──  Investigation Orchestrator  ──  Report Builder        │
│            │                    │                        │                  │
│            │                    │                        │                  │
│            ▼                    ▼                        ▼                  │
│     SQLite Persistence   OpenAI Responses API     Approval / Verification    │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Kubernetes Tool Layer (Python)                          │
│                                                                              │
│   Kubernetes Python Client                                                  │
│   ├─ Pod / Workload inspection                                              │
│   ├─ Events and logs                                                        │
│   ├─ Service / selector inspection                                          │
│   ├─ ConfigMap / Secret references                                          │
│   ├─ Node health                                                            │
│   └─ Safe recovery actions and verification                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Kubernetes Kind Cluster                             │
│              Target workload namespaces and supporting resources             │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3. Component Responsibilities

### Frontend

- Presents the incident dashboard and investigation workflow.
- Displays evidence, recommendations, and report output in a clear enterprise UI.
- Shows incident history and current investigation status.
- Requests operator approval for any recovery action that is not automatic.

### Backend

- Receives incident requests and exposes all MVP APIs.
- Stores investigation state in SQLite.
- Invokes the OpenAI Responses API and manages tool calls.
- Coordinates evidence collection, recommendation, recovery, verification, and report generation.
- Enforces the safe recovery boundary.

### OpenAI Responses API

- Acts as the reasoning and orchestration layer.
- Selects the next tool or action based on collected evidence.
- Synthesizes evidence into a likely root cause.
- Produces a remediation recommendation and explanation.
- Guides verification after any approved recovery action.

### Kubernetes Tool Layer

- Provides read and write access to Kubernetes through the Python client.
- Collects cluster evidence used by the agent.
- Executes only approved and safe recovery operations.
- Verifies whether the recovery action improved the workload state.

### SQLite

- Stores investigations, evidence snapshots, reasoning outcomes, approval state, recovery actions, verification results, and reports.
- Supports the investigation history view.

### Delivery and Deployment Tooling

- Docker packages the backend and frontend for local execution.
- Kind provides the Kubernetes environment used for the demo cluster.
- Helm packages the app for cluster deployment.
- Terraform captures supporting infrastructure intent where needed for the hackathon environment.
- GitHub Actions supports repeatable validation and delivery.

## 4. Agent Orchestration Flow

1. The operator starts an investigation from the UI or from a demo scenario.
2. The backend creates an investigation record in SQLite.
3. The backend sends the incident context to the OpenAI Responses API.
4. The model evaluates the evidence and requests the next Kubernetes tool call.
5. The backend executes the tool call through the Kubernetes Python Client.
6. The backend returns tool output to the model.
7. The model continues iterating until it has enough evidence to identify a likely root cause.
8. The model produces a recommendation and, if needed, a safe recovery plan.
9. If the recovery step requires approval, the UI presents the action for operator consent.
10. After approval, the backend executes the approved Kubernetes action.
11. The model or backend performs verification against the post-action cluster state.
12. The backend stores the outcome and generates the final incident report.

The orchestration must remain evidence-driven. The OpenAI Responses API is not a passive summarizer; it is the active reasoning layer that directs the investigation by choosing tool calls.

## 5. Kubernetes Tool Layer

The Kubernetes tool layer is the only component that talks to the cluster.

### Read Tools

- Inspect Pods, Deployments, ReplicaSets, Services, Nodes, ConfigMaps, and Secrets references.
- Read Kubernetes Events relevant to the incident.
- Collect pod logs for failing workloads.
- Resolve service selector and workload ownership relationships.
- Check node readiness and scheduling conditions.

### Recovery Tools

- Apply only approved safe recovery actions.
- Restart or refresh the affected workload where permitted by the MVP policy.
- Support a single demonstrable safe recovery path for the hackathon.

### Verification Tools

- Re-read workload status after the recovery action.
- Confirm whether the failing condition cleared.
- Confirm whether the workload progressed toward a healthy state.

### Safety Boundaries

- Default behavior is read-only investigation.
- Recovery occurs only after explicit approval when required.
- Unsupported or out-of-scope actions are not executed.
- Sensitive values such as Secret contents must not be exposed in the UI or report.

## 6. Investigation Workflow

1. An incident is initiated for one of the supported Kubernetes incident types.
2. The backend records the start of the investigation.
3. The agent selects the first evidence source based on the incident pattern.
4. The Kubernetes tool layer gathers resource state, events, and logs.
5. The model compares evidence against known incident patterns.
6. Additional targeted tool calls refine the diagnosis.
7. The agent identifies the most probable root cause.
8. The backend stores the evidence trail and reasoning output.
9. The UI shows the incident timeline, evidence, and recommendation.

The investigation workflow is intentionally narrow and deterministic enough for a hackathon demo, while still reflecting realistic production incident handling.

## 7. Recovery Workflow

1. The model proposes a safe remediation action.
2. The backend checks whether the action requires operator approval.
3. If approval is required, the UI presents the action to the operator.
4. After approval, the backend executes the action using the Kubernetes client.
5. The agent performs verification by re-reading the affected workload state.
6. The backend stores the action result and verification outcome.
7. The final report includes the recommended action, the approved action, and the observed effect.

The recovery workflow stays within the MVP boundary. The system is not a general-purpose controller; it performs only the safe recovery behavior defined by the project overview and PRD.

## 8. Deployment Architecture

### Local and Demo Execution

- The frontend runs in a browser as a React application.
- The backend runs as a FastAPI service inside Docker.
- The OpenAI Responses API is called from the backend.
- SQLite stores local investigation data.
- Kind hosts the demo Kubernetes cluster.

### Cluster Packaging

- Helm packages the application for deployment into the Kind cluster.
- The backend, frontend, and supporting services can be deployed as a compact demo stack.

### Delivery Workflow

- GitHub Actions validates the project on commit.
- Terraform captures infrastructure intent for the hackathon environment where required.
- The deployment design remains lightweight and reproducible rather than production-complex.

## 9. Folder Structure

The repository should remain organized around the MVP boundaries described above.

```text
/
├─ docs/
│  ├─ 01_PROJECT_OVERVIEW.md
│  ├─ 02_PRD.md
│  ├─ 03_ARCHITECTURE.md
│  ├─ 04_UI_UX.md
│  ├─ 05_AGENT_DESIGN.md
│  ├─ 06_API_DESIGN.md
│  ├─ 07_DATABASE.md
│  ├─ 08_IMPLEMENTATION_PLAN.md
│  └─ 09_PROMPTS.md
├─ frontend/
├─ backend/
├─ agents/
├─ demo/
├─ helm/
├─ monitoring/
├─ scripts/
├─ terraform/
└─ .github/
   └─ workflows/
```

Recommended responsibility alignment:

- `frontend/` holds the React + TypeScript UI.
- `backend/` holds the FastAPI service and API orchestration.
- `agents/` holds agent policy, tool contracts, and prompt-oriented assets.
- `demo/` holds demo scenarios and incident examples.
- `helm/` holds Kubernetes packaging.
- `monitoring/` holds lightweight observability assets for the hackathon environment.
- `scripts/` holds helper scripts for local setup and demo execution.
- `terraform/` holds environment definitions where needed.
- `.github/workflows/` holds GitHub Actions workflows.

## 10. Technology Responsibilities

### React

- Renders the user interface and investigation workflow.
- Presents evidence, recommendations, and reports.

### TypeScript

- Provides type-safe frontend and integration logic.

### TailwindCSS

- Handles utility-driven styling for the enterprise UI.

### shadcn/ui

- Supplies the UI primitives used by the frontend.

### FastAPI

- Exposes the backend APIs.
- Coordinates investigation, recovery, verification, and reporting.

### Python

- Implements backend logic and Kubernetes integration.
- Hosts the agent orchestration logic.

### OpenAI Responses API

- Serves as the intelligence layer.
- Performs reasoning and tool calling.

### Kubernetes Python Client

- Reads cluster state and executes approved Kubernetes actions.

### SQLite

- Persists investigations, evidence, actions, and reports.

### Docker

- Packages the application for reproducible local and demo execution.

### Kind

- Provides the Kubernetes environment for the hackathon demo.

### Helm

- Packages the solution for cluster deployment.

### Terraform

- Captures the supporting infrastructure definition used by the hackathon environment.

### GitHub Actions

- Runs validation and supports the delivery workflow.

The system architecture deliberately keeps OpenAI Responses API with Tool Calling at the center of the design. The model is the decision-making layer, while the backend and Kubernetes client provide the execution and evidence surfaces.

# OpsPilot AI PRD

## 1. Project Objective

OpsPilot AI is an OpenAI Agentic AI Hackathon MVP for Kubernetes production incident investigation and recovery. The objective is to autonomously investigate unhealthy Kubernetes workloads, collect evidence from the cluster, identify the most likely root cause, recommend safe remediation, optionally perform an approved recovery action, verify the outcome, and generate an enterprise-ready incident report.

The MVP is designed to reduce Mean Time To Resolution, improve incident response consistency, and reduce dependency on senior Site Reliability Engineers.

## 2. Business Problem

Kubernetes production incidents require engineers to manually inspect multiple operational surfaces, including logs, events, workloads, services, nodes, and configuration objects. This process is repetitive, time-consuming, and highly dependent on deep operational expertise.

OpsPilot AI addresses this problem by standardizing investigation, evidence collection, analysis, and reporting for common Kubernetes failure scenarios.

## 3. Users

- DevOps Engineers
- Site Reliability Engineers
- Platform Engineers
- Cloud Operations Teams
- Kubernetes Administrators

## 4. Functional Requirements

1. Detect unhealthy Kubernetes workloads for the supported MVP incident types.
2. Investigate incidents autonomously by selecting relevant Kubernetes resources to inspect.
3. Collect operational evidence from the cluster.
4. Correlate evidence using OpenAI reasoning.
5. Identify the most probable root cause based on collected evidence.
6. Recommend safe remediation actions.
7. Optionally execute approved recovery actions where allowed.
8. Verify whether recovery was successful.
9. Generate an incident report that summarizes the investigation, evidence, recommendation, and outcome.
10. Present a polished enterprise UI for the investigation workflow.
11. Maintain an investigation history for past incidents.
12. Support a demo mode for hackathon evaluation.

## 5. Non-Functional Requirements

1. The product must behave as production software, even as an MVP.
2. The system must keep remediation safe and controlled.
3. The agent must provide explainable reasoning with supporting evidence.
4. The solution must be consistent and repeatable for the supported incident scenarios.
5. The user interface must feel enterprise-ready and clear enough for operational use.
6. The workflow must be understandable without requiring external context.
7. The incident report must be suitable for sharing with operational stakeholders.
8. The system must not expand beyond the defined MVP scope.

## 6. Supported Kubernetes Incident Types

The MVP supports the following incident types:

- CrashLoopBackOff
- ImagePullBackOff
- Pending Pods
- Readiness Probe Failures
- Liveness Probe Failures
- Node NotReady
- CoreDNS failures
- Service selector mismatch
- Network Policy issues
- ConfigMap issues
- Secret issues
- Deployment rollout failures

## 7. AI Agent Responsibilities

The AI agent is responsible for:

1. Detecting the incident pattern from cluster evidence.
2. Determining which Kubernetes resources to inspect next.
3. Collecting logs, events, and resource state required for analysis.
4. Reasoning over the evidence using OpenAI tool calling.
5. Producing a likely root cause with supporting evidence.
6. Recommending a safe remediation path.
7. Executing only approved recovery actions where allowed.
8. Verifying whether the recovery action resolved the issue.
9. Producing an incident summary and final report.

The agent must remain aligned with safety and approval boundaries and must not take unsupported recovery actions.

## 8. UI Pages

The MVP UI should include:

- Dashboard
- Incident Investigation View
- Evidence View
- Recommendation View
- Incident Report View
- Investigation History View

## 9. API Modules

High-level API modules for the MVP:

- Incident detection and investigation
- Evidence collection
- Root cause analysis
- Remediation recommendation
- Recovery action execution
- Verification
- Incident reporting
- Investigation history

## 10. Success Criteria

The MVP is successful if it can:

- Investigate a Kubernetes incident autonomously.
- Display collected evidence.
- Identify the likely root cause.
- Recommend remediation.
- Demonstrate one safe recovery action.
- Generate an incident report.
- Present a polished enterprise UI.

## 11. Out of Scope

The following are explicitly out of scope for the MVP:

- Multi-cluster management
- Cloud provider provisioning
- User authentication
- Cost optimization
- Security scanning
- Full GitOps implementation

## 12. Acceptance Criteria

1. The system can investigate supported Kubernetes incident types autonomously.
2. The system can collect and display evidence from the cluster.
3. The system can produce a likely root cause with supporting evidence.
4. The system can recommend a safe remediation action.
5. The system can demonstrate at least one approved recovery action.
6. The system can verify whether the recovery action resolved the incident.
7. The system can generate an incident report for the investigation.
8. The UI presents the investigation flow in a clear enterprise-style experience.
9. The MVP remains limited to the supported incident types defined in this PRD.
10. The MVP does not introduce out-of-scope capabilities listed in this document or in the project overview.

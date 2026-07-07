# OpsPilot AI

## Autonomous Kubernetes Production Recovery Agent

---

# Vision

OpsPilot AI is an Agentic AI platform that autonomously investigates Kubernetes production incidents, identifies the most likely root cause using evidence collected from the cluster, recommends safe remediation actions, optionally performs approved recovery actions, verifies the outcome, and generates an enterprise-ready incident report.

The objective is to reduce Mean Time To Resolution (MTTR), reduce operational costs, improve incident response consistency, and reduce dependency on senior Site Reliability Engineers.

---

# Problem Statement

Modern Kubernetes environments generate large amounts of operational data including:

- Pod Logs
- Kubernetes Events
- Deployments
- ReplicaSets
- Services
- Nodes
- ConfigMaps
- Secrets
- DNS
- Network Policies

During production incidents, engineers manually investigate multiple systems before identifying the root cause.

This investigation is repetitive, time-consuming, and highly dependent on experienced engineers.

---

# Proposed Solution

OpsPilot AI introduces an autonomous AI agent capable of:

1. Detecting unhealthy Kubernetes workloads.
2. Selecting the appropriate Kubernetes resources to inspect.
3. Collecting operational evidence.
4. Correlating evidence using OpenAI reasoning.
5. Identifying the most probable root cause.
6. Suggesting safe remediation.
7. Executing approved recovery actions (where allowed).
8. Verifying recovery.
9. Generating an incident report.

---

# Key Features

- AI-driven Kubernetes investigation
- Agentic tool calling using OpenAI Responses API
- Explainable reasoning with supporting evidence
- Confidence score for recommendations
- Safe remediation policy
- Incident timeline
- Executive incident report
- Investigation history
- Demo mode for hackathon evaluation

---

# Business Value

OpsPilot AI helps organizations:

- Reduce Mean Time To Resolution (MTTR)
- Reduce operational cost
- Improve production availability
- Standardize incident investigations
- Improve onboarding of junior engineers
- Reduce repetitive operational work

---

# Target Users

- DevOps Engineers
- Site Reliability Engineers
- Platform Engineers
- Cloud Operations Teams
- Kubernetes Administrators

---

# Scope (MVP)

The hackathon MVP focuses on Kubernetes incident investigation.

Supported scenarios include:

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

---

# Out of Scope

The following are intentionally excluded from the MVP:

- Multi-cluster management
- Cloud provider provisioning
- User authentication
- Cost optimization
- Security scanning
- Full GitOps implementation

---

# Success Criteria

The MVP is considered successful if it can:

- Investigate a Kubernetes incident autonomously
- Display collected evidence
- Identify the likely root cause
- Recommend remediation
- Demonstrate one safe recovery action
- Generate an incident report
- Present a polished enterprise UI

---

# High-Level Workflow

Production Issue

↓

AI Investigation

↓

Evidence Collection

↓

Root Cause Analysis

↓

Safe Remediation Recommendation

↓

(Optional) Recovery

↓

Verification

↓

Incident Report

---

# Technology Stack

Frontend

- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend

- FastAPI
- Python

AI

- OpenAI Responses API
- Tool Calling

Infrastructure

- Docker
- Kubernetes (Kind)
- Helm
- Terraform

CI/CD

- GitHub Actions

Database

- SQLite

---

# Hackathon Objective

Build an enterprise-grade Agentic AI platform that demonstrates how OpenAI models can autonomously investigate Kubernetes incidents using tool calling, provide explainable reasoning, safely recover supported failures, and improve operational efficiency.
# OpsPilot AI Demo Guide

This guide describes the intended demo flow for the hackathon MVP.

## Demo Scenario

1. Open the React dashboard.
2. Enter an incident such as `CrashLoopBackOff in payment-service namespace after latest deployment.`
3. Run the investigation.
4. Review the investigation timeline and evidence.
5. Review the remediation recommendations.
6. Review the generated incident report data path.

## Expected Outcome

- The backend returns a structured investigation payload.
- The dashboard shows the AI summary, root cause, confidence, evidence, remediation, and recovery steps.
- The backend keeps the investigation and report flow internal and JSON-based.

## Screenshots

Add future screenshots here:

- Dashboard landing page
- Investigation loading state
- Investigation results
- Remediation recommendations
- Incident report summary

## Presentation Notes

- The platform is designed for autonomous Kubernetes incident investigation.
- Remediation is advisory-only.
- No Kubernetes action is executed without an approval workflow.
- The demo is intentionally production-styled, but still MVP-scoped.


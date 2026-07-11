#!/bin/bash
# Inject a Kubernetes failure scenario into the local Kind cluster.
# Usage: bash trigger-fault.sh <scenario> [namespace]
# Scenarios: crashloop | imagepull | oom | pending | configmap | secret
set -e

SCENARIO=${1:-crashloop}
NS=${2:-default}

echo "Injecting fault: $SCENARIO  namespace: $NS"

case $SCENARIO in
  crashloop)
    kubectl run fault-crashloop \
      --image=busybox:latest \
      --restart=Never \
      -n "$NS" \
      -- sh -c "echo 'FATAL missing PAYMENT_PROVIDER_URL'; sleep 1; exit 1"
    echo "CrashLoopBackOff scenario injected."
    echo "Investigate with: CrashLoopBackOff in payment-service namespace after latest deployment."
    ;;

  imagepull)
    kubectl run fault-imagepull \
      --image=registry.example.com/orders-api:2.4.0-nonexistent \
      --restart=Never \
      -n "$NS"
    echo "ImagePullBackOff scenario injected."
    echo "Investigate with: ImagePullBackOff for orders-api after deploying orders-api:2.4.0 in prod."
    ;;

  oom)
    kubectl run fault-oomkill \
      --image=python:3.11-slim \
      --restart=Never \
      --limits="memory=32Mi" \
      -n "$NS" \
      -- python -c "data = bytearray(1024 * 1024 * 512); import time; time.sleep(60)"
    echo "OOMKilled scenario injected."
    echo "Investigate with: OOMKilled observed on report-worker pods during peak load window."
    ;;

  pending)
    kubectl run fault-pending \
      --image=nginx:latest \
      --restart=Never \
      -n "$NS" \
      --overrides='{"spec":{"nodeSelector":{"nonexistent-label-xyz":"true"}}}'
    echo "Pending scenario injected."
    echo "Investigate with: Pods stuck in Pending for recommendation-service (no nodes available)."
    ;;

  configmap)
    kubectl run fault-configmap \
      --image=busybox:latest \
      --restart=Never \
      -n "$NS" \
      --overrides='{
        "spec": {
          "containers": [{
            "name": "fault-configmap",
            "image": "busybox:latest",
            "command": ["sh", "-c", "sleep 3600"],
            "envFrom": [{"configMapRef": {"name": "nonexistent-app-config"}}]
          }]
        }
      }'
    echo "ConfigMap missing scenario injected."
    echo "Investigate with: pods failing: configmap \"app-config\" not found in checkout namespace."
    ;;

  secret)
    kubectl run fault-secret \
      --image=busybox:latest \
      --restart=Never \
      -n "$NS" \
      --overrides='{
        "spec": {
          "containers": [{
            "name": "fault-secret",
            "image": "busybox:latest",
            "command": ["sh", "-c", "sleep 3600"],
            "envFrom": [{"secretRef": {"name": "nonexistent-auth-secrets"}}]
          }]
        }
      }'
    echo "Secret missing scenario injected."
    echo "Investigate with: CrashLoopBackOff: auth-service cannot start; referenced Secret \"auth-secrets\" missing."
    ;;

  *)
    echo "Unknown scenario: $SCENARIO"
    echo "Available: crashloop | imagepull | oom | pending | configmap | secret"
    exit 1
    ;;
esac

echo ""
echo "Watch pods:   kubectl get pods -n $NS -w"
echo "Reset after:  bash scripts/reset.sh $NS"

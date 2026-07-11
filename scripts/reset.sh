#!/bin/bash
# Remove all injected fault pods and restore the cluster to a clean state.
# Usage: bash reset.sh [namespace]
set -e

NS=${1:-default}

echo "Resetting cluster in namespace: $NS"

kubectl delete pod \
  fault-crashloop \
  fault-imagepull \
  fault-oomkill \
  fault-pending \
  fault-configmap \
  fault-secret \
  --ignore-not-found \
  -n "$NS"

echo "Cluster reset. Current pods:"
kubectl get pods -n "$NS"

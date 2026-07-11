#!/bin/sh
# Patch the Kind cluster server address so the backend container can reach
# the Kind control plane running on the Docker Desktop host.
# On Windows/Mac Docker Desktop, host.docker.internal resolves to the host.
# On Linux Docker, host-gateway is added via extra_hosts in docker-compose.yml.

KUBE_SRC="/root/.kube/config"
KUBE_PATCHED="/tmp/kube-patched.yaml"

if [ -f "$KUBE_SRC" ]; then
    sed 's|https://127.0.0.1|https://host.docker.internal|g' "$KUBE_SRC" > "$KUBE_PATCHED"
    export KUBECONFIG="$KUBE_PATCHED"
    echo "[entrypoint] kubeconfig patched: 127.0.0.1 → host.docker.internal"
else
    echo "[entrypoint] no kubeconfig found at $KUBE_SRC — cluster tools will be unavailable"
fi

exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

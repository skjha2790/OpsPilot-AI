#!/bin/sh
KUBE_SRC="/root/.kube/config"
KUBE_PATCHED="/tmp/kube-patched.yaml"

if [ -f "$KUBE_SRC" ]; then
    sed 's|https://127.0.0.1|https://host.docker.internal|g' "$KUBE_SRC" > "$KUBE_PATCHED"
    sed -i 's|certificate-authority-data:.*|insecure-skip-tls-verify: true|g' "$KUBE_PATCHED"
    export KUBECONFIG="$KUBE_PATCHED"
    echo "[entrypoint] kubeconfig patched: 127.0.0.1 -> host.docker.internal, TLS verify disabled"
else
    echo "[entrypoint] no kubeconfig found at $KUBE_SRC"
fi

exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

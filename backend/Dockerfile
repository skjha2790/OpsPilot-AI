FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl sed \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY pyproject.toml README.md ./
RUN uv sync --no-dev

COPY . /app

# Optional corporate root certificate support:
# - Local/private builds may include cloud-services-root.cer
# - Public GitHub/Render builds can omit it and will use default system CAs
RUN if [ -f /app/cloud-services-root.cer ]; then \
        echo "[docker] installing optional corporate root certificate" \
        && ( openssl x509 -inform PEM -in /app/cloud-services-root.cer \
               -out /usr/local/share/ca-certificates/cloud-services-root.crt 2>/dev/null \
             || openssl x509 -inform DER -in /app/cloud-services-root.cer \
               -out /usr/local/share/ca-certificates/cloud-services-root.crt ) \
        && update-ca-certificates \
        && uv run python -c "import certifi, pathlib; cert = pathlib.Path('/usr/local/share/ca-certificates/cloud-services-root.crt'); open(certifi.where(), 'ab').write(b'\n' + cert.read_bytes())"; \
    else \
        echo "[docker] no optional corporate root certificate found; using default CA bundle"; \
    fi

ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

RUN chmod +x /app/entrypoint.sh \
    && mkdir -p /app/data

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]

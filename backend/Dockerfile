FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy
WORKDIR /app

COPY cloud-services-root.cer /tmp/cloud-services-root.cer
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl sed \
    && ( openssl x509 -inform PEM -in /tmp/cloud-services-root.cer \
           -out /usr/local/share/ca-certificates/cloud-services-root.crt 2>/dev/null \
         || openssl x509 -inform DER -in /tmp/cloud-services-root.cer \
           -out /usr/local/share/ca-certificates/cloud-services-root.crt ) \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv
COPY pyproject.toml README.md ./
RUN uv sync --no-dev

RUN uv run python -c "import certifi; \
open(certifi.where(),'ab').write(b'\n'+open('/usr/local/share/ca-certificates/cloud-services-root.crt','rb').read())"

ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

COPY app ./app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /app/data

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]

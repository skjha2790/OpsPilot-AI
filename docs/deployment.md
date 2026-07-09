# OpsPilot AI Deployment

This document summarizes the supported deployment layers.

## Docker

- Backend image: Python 3.12 slim
- Frontend image: Node 22 build stage with nginx runtime
- Compose file: `docker-compose.yml`

## Helm

The Helm chart lives at `helm/opspilot`.

### Install

```bash
helm install opspilot ./helm/opspilot
```

### Common checks

```bash
kubectl get pods
kubectl get svc
```

## Terraform

The Terraform layer lives at `terraform/`.

Typical flow:

```bash
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Terraform bootstraps the namespace and OpenAI secret, then installs the Helm release.

## Environment Inputs

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `VITE_API_BASE_URL`
- Helm values for images, replicas, and ingress host

## Operational Notes

- The backend remains reachable on port 8000.
- The frontend remains reachable on port 3000 in Docker Compose.
- Helm and Terraform should not duplicate workload definitions outside the chart.


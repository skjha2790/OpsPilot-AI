# OpsPilot AI Terraform

This directory contains the production Terraform layer for OpsPilot AI.

## What it manages

- Kubernetes namespace bootstrap
- Kubernetes Secret for `OPENAI_API_KEY`
- Helm release for the existing `helm/opspilot` chart

Terraform does not modify application code, Dockerfiles, or the Helm chart.

## Files

- `versions.tf` - Terraform and provider version constraints
- `providers.tf` - Kubernetes and Helm provider configuration
- `variables.tf` - Deployment inputs
- `main.tf` - Shared locals and derived names
- `namespace.tf` - Namespace resource
- `secrets.tf` - OpenAI Secret resource
- `helm_release.tf` - Helm release for OpsPilot
- `outputs.tf` - Useful deployment outputs
- `terraform.tfvars.example` - Example input values

## Usage

```bash
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Example variables:

```hcl
namespace      = "opspilot"
backend_image  = "opspilot-ai-backend"
frontend_image = "opspilot-ai-frontend"
backend_tag    = "latest"
frontend_tag   = "latest"
openai_api_key = "replace-me"
openai_model   = "gpt-5.4-mini"
ingress_host   = "opspilot.local"
replica_count  = 2
```

## Notes

- The Helm release points at `../helm/opspilot`.
- The namespace and secret are bootstrapped by Terraform before Helm installation.
- The workload deployments remain Helm-managed.
- OpenAI secrets are provided through Terraform variables, not hardcoded.

## Outputs

- `namespace`
- `helm_release_name`
- `frontend_service`
- `backend_service`


locals {
  release_name = "opspilot"
  chart_name   = "opspilot"
  chart_path   = abspath("${path.root}/../helm/opspilot")

  owner_annotations = {
    "meta.helm.sh/release-name"      = local.release_name
    "meta.helm.sh/release-namespace" = var.namespace
  }

  owner_labels = {
    "app.kubernetes.io/managed-by" = "Helm"
    "app.kubernetes.io/instance"   = local.release_name
    "app.kubernetes.io/part-of"    = "opspilot-ai"
  }

  common_labels = {
    "app.kubernetes.io/name"       = local.chart_name
    "app.kubernetes.io/instance"    = local.release_name
    "app.kubernetes.io/part-of"    = "opspilot-ai"
  }

  backend_service_name  = "${local.release_name}-${local.chart_name}-backend"
  frontend_service_name = "${local.release_name}-${local.chart_name}-frontend"
}

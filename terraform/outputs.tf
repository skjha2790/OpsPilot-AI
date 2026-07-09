output "namespace" {
  value = kubernetes_namespace_v1.opspilot.metadata[0].name
}

output "helm_release_name" {
  value = helm_release.opspilot.name
}

output "frontend_service" {
  value = local.frontend_service_name
}

output "backend_service" {
  value = local.backend_service_name
}

resource "helm_release" "opspilot" {
  name       = local.release_name
  namespace  = kubernetes_namespace_v1.opspilot.metadata[0].name
  chart      = local.chart_path
  atomic     = true
  cleanup_on_fail = true
  dependency_update = false
  max_history       = 5
  wait              = true
  timeout           = 900
  create_namespace  = false

  values = [
    yamlencode({
      namespace = var.namespace
      backend = {
        image        = var.backend_image
        tag          = var.backend_tag
        replicaCount = var.replica_count
        servicePort  = 8000
        appName      = "OpsPilot AI Backend"
        appVersion   = "0.1.0"
        environment  = "production"
        debug        = false
        logLevel     = "INFO"
        corsOrigins  = ["http://localhost:3000"]
        resources = {
          requests = {
            cpu    = "100m"
            memory = "256Mi"
          }
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
        }
      }
      frontend = {
        image        = var.frontend_image
        tag          = var.frontend_tag
        replicaCount = var.replica_count
        servicePort  = 80
        resources = {
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
          limits = {
            cpu    = "250m"
            memory = "256Mi"
          }
        }
      }
      openai = {
        model = var.openai_model
      }
      ingress = {
        enabled   = true
        className = "nginx"
        host      = var.ingress_host
      }
    })
  ]

  set_sensitive {
    name  = "openai.apiKey"
    value = var.openai_api_key
  }

  depends_on = [
    kubernetes_namespace_v1.opspilot,
    kubernetes_secret_v1.openai_api_key,
  ]
}

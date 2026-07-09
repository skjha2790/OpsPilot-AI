resource "kubernetes_secret_v1" "openai_api_key" {
  metadata {
    name      = "${local.release_name}-${local.chart_name}-secret"
    namespace = kubernetes_namespace_v1.opspilot.metadata[0].name

    labels = merge(
      local.common_labels,
      {
        "app.kubernetes.io/component" = "backend"
      },
      local.owner_labels,
    )

    annotations = local.owner_annotations
  }

  type = "Opaque"

  data = {
    OPENAI_API_KEY = var.openai_api_key
  }
}

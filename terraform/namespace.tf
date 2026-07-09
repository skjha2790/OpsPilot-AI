resource "kubernetes_namespace_v1" "opspilot" {
  metadata {
    name = var.namespace

    labels = merge(
      local.common_labels,
      {
        "app.kubernetes.io/component" = "platform"
      },
      local.owner_labels,
    )

    annotations = local.owner_annotations
  }
}

variable "namespace" {
  description = "Namespace used for all OpsPilot resources."
  type        = string
  default     = "opspilot"
}

variable "backend_image" {
  description = "Backend container image name."
  type        = string
  default     = "opspilot-ai-backend"
}

variable "frontend_image" {
  description = "Frontend container image name."
  type        = string
  default     = "opspilot-ai-frontend"
}

variable "backend_tag" {
  description = "Backend container image tag."
  type        = string
  default     = "latest"
}

variable "frontend_tag" {
  description = "Frontend container image tag."
  type        = string
  default     = "latest"
}

variable "openai_api_key" {
  description = "OpenAI API key used by the backend."
  type        = string
  sensitive   = true
}

variable "openai_model" {
  description = "OpenAI model used by the backend."
  type        = string
  default     = "gpt-5.4-mini"
}

variable "ingress_host" {
  description = "Ingress host for the OpsPilot UI and API."
  type        = string
  default     = "opspilot.local"
}

variable "replica_count" {
  description = "Replica count used for both backend and frontend workloads."
  type        = number
  default     = 2
}

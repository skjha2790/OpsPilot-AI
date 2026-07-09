{{- define "opspilot.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "opspilot.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "opspilot.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "opspilot.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "opspilot.namespace" -}}
{{- default .Release.Namespace .Values.namespace | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "opspilot.labels" -}}
helm.sh/chart: {{ include "opspilot.chart" . }}
app.kubernetes.io/name: {{ include "opspilot.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: opspilot-ai
{{- end -}}

{{- define "opspilot.selectorLabels" -}}
app.kubernetes.io/name: {{ include "opspilot.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "opspilot.componentLabels" -}}
{{- include "opspilot.selectorLabels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "opspilot.metadataLabels" -}}
{{- include "opspilot.labels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "opspilot.backendFullname" -}}
{{- printf "%s-backend" (include "opspilot.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "opspilot.frontendFullname" -}}
{{- printf "%s-frontend" (include "opspilot.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "opspilot.configMapName" -}}
{{- printf "%s-config" (include "opspilot.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "opspilot.secretName" -}}
{{- printf "%s-secret" (include "opspilot.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

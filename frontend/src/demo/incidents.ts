export interface DemoIncidentScenario {
  id: string;
  title: string;
  incidentText: string;
  severity: 'P0' | 'P1' | 'P2';
  confidence: number;
  summary: string;
  aiReasoning: string;
  evidence: string[];
  events: string[];
  logs: string[];
  remediation: string;
  kubectlCommands: string[];
  deploymentYaml: string;
  verification: string[];
}

export const DEMO_INCIDENTS: DemoIncidentScenario[] = [
  {
    id: 'crashloopbackoff',
    title: 'CrashLoopBackOff',
    incidentText: 'CrashLoopBackOff in payment-service namespace after latest deployment.',
    severity: 'P1',
    confidence: 92,
    summary: 'A newly deployed container fails during startup, causing rapid restarts and request failures.',
    aiReasoning:
      'The timing correlates with the latest rollout. Repeated restarts usually indicate a deterministic startup failure (bad config, missing env, migration failure, or dependency outage). Evidence focuses on pod exit codes, recent events, and the last log lines before crash.',
    evidence: [
      'Pod restarts increasing rapidly for payment-service',
      'Last termination reason indicates application startup failure',
      'Events show back-off restarting failed container',
      'Deployment revision changed within the last 15 minutes',
    ],
    events: [
      'BackOff: Back-off restarting failed container',
      'Killing: Container failed liveness probe',
      'Pulled: Successfully pulled image payment-service:1.12.0',
      'Created: Created container payment-service',
    ],
    logs: [
      '2026-07-10T09:12:34Z ERROR config: missing PAYMENT_PROVIDER_URL',
      '2026-07-10T09:12:34Z FATAL startup failed: cannot initialize payment gateway client',
      '2026-07-10T09:12:34Z exiting with code=1',
    ],
    remediation:
      'Inspect the container logs for missing configuration and validate environment variables/secrets for the new revision. If needed, rollback or roll forward with the corrected config.',
    kubectlCommands: [
      'kubectl -n payment-service get pods',
      'kubectl -n payment-service logs deploy/payment-service --tail=200',
      'kubectl -n payment-service describe pod <pod-name>',
      'kubectl -n payment-service rollout undo deploy/payment-service',
    ],
    deploymentYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payment-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment-service
          image: registry.example.com/payment-service:1.12.0
          env:
            - name: PAYMENT_PROVIDER_URL
              valueFrom:
                secretKeyRef:
                  name: payment-secrets
                  key: provider_url`,
    verification: [
      'Confirm pods are Running and restarts stop increasing',
      'Check service endpoints and readiness probes',
      'Verify payment checkout requests succeed',
    ],
  },
  {
    id: 'imagepullbackoff',
    title: 'ImagePullBackOff',
    incidentText: 'ImagePullBackOff for orders-api after deploying orders-api:2.4.0 in prod.',
    severity: 'P1',
    confidence: 89,
    summary: 'Pods cannot pull the container image from the registry, preventing the service from starting.',
    aiReasoning:
      'Image pull failures usually stem from an incorrect image tag, missing imagePullSecret, registry auth/permission issues, or registry connectivity. Evidence emphasizes event messages and the image reference.',
    evidence: [
      'Pod events show failed to pull image with auth error',
      'Image tag orders-api:2.4.0 not found or unauthorized',
      'No usable imagePullSecret present in namespace',
      'ReplicaSet created but pods remain in ImagePullBackOff',
    ],
    events: [
      'Failed: Failed to pull image "registry.example.com/orders-api:2.4.0": denied: requested access to the resource is denied',
      'BackOff: Back-off pulling image "registry.example.com/orders-api:2.4.0"',
      'Normal: Created pod orders-api-7f9d8c8b7f-xxxxx',
    ],
    logs: ['(no container logs available: image never started)'],
    remediation:
      'Verify the image tag exists and registry credentials are configured. Ensure the correct `imagePullSecret` is attached to the service account or deployment.',
    kubectlCommands: [
      'kubectl -n prod get events --sort-by=.lastTimestamp | tail -n 30',
      'kubectl -n prod get deploy orders-api -o yaml | rg image',
      'kubectl -n prod get sa default -o yaml | rg imagePullSecrets',
      'kubectl -n prod create secret docker-registry regcred --docker-server=... --docker-username=... --docker-password=...',
    ],
    deploymentYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: prod
spec:
  template:
    spec:
      imagePullSecrets:
        - name: regcred
      containers:
        - name: orders-api
          image: registry.example.com/orders-api:2.4.0`,
    verification: [
      'Confirm new pods pull image and transition to Running',
      'Verify service endpoints populate',
      'Smoke test /healthz and critical API routes',
    ],
  },
  {
    id: 'oomkilled',
    title: 'OOMKilled',
    incidentText: 'OOMKilled observed on report-worker pods during peak load window.',
    severity: 'P2',
    confidence: 86,
    summary: 'Worker pods are terminated by the kernel due to memory exhaustion, causing job delays and retries.',
    aiReasoning:
      'OOMKilled indicates the container exceeded its memory limit (or the node was under pressure). Evidence looks for termination reason, memory limits/requests, and whether the spike is correlated with workload changes.',
    evidence: [
      'Last termination reason is OOMKilled',
      'Memory limit is low relative to job size',
      'Restarts coincide with peak workload batch',
      'Node memory pressure events intermittently present',
    ],
    events: [
      'Killing: Container report-worker was killed due to OOMKilled',
      'Warning: MemoryPressure on node ip-10-0-4-21',
      'Normal: Started container report-worker',
    ],
    logs: [
      '2026-07-10T08:59:11Z INFO processing batch size=5000',
      '2026-07-10T08:59:42Z WARN memory usage high rss=892Mi heap=740Mi',
      '2026-07-10T08:59:55Z (process terminated)',
    ],
    remediation:
      'Increase memory limits/requests for the worker and reduce batch size or optimize memory usage. Verify node capacity and tune concurrency.',
    kubectlCommands: [
      'kubectl -n analytics describe pod <pod-name> | rg -n \"OOMKilled|Limits|Requests\"',
      'kubectl -n analytics get deploy report-worker -o yaml | rg -n \"memory|resources\"',
      'kubectl -n analytics rollout restart deploy/report-worker',
    ],
    deploymentYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-worker
  namespace: analytics
spec:
  template:
    spec:
      containers:
        - name: report-worker
          resources:
            requests:
              memory: 512Mi
            limits:
              memory: 1Gi`,
    verification: [
      'Confirm no new OOMKilled events for 30 minutes',
      'Validate worker throughput and queue depth stabilizes',
      'Review memory usage trend after changes',
    ],
  },
  {
    id: 'pendingpods',
    title: 'Pending Pods',
    incidentText: 'Pods stuck in Pending for recommendation-service (no nodes available).',
    severity: 'P2',
    confidence: 84,
    summary: 'Scheduler cannot place new pods due to insufficient resources or scheduling constraints.',
    aiReasoning:
      'Pending pods often indicate insufficient CPU/memory, taints/tolerations mismatch, or affinity/selector constraints. Evidence focuses on scheduler events and node capacity.',
    evidence: [
      'Events show FailedScheduling due to insufficient CPU',
      'Cluster nodes near capacity',
      'New ReplicaSet created but no pods bound to nodes',
      'No matching tolerations for tainted nodes',
    ],
    events: [
      'FailedScheduling: 0/6 nodes are available: 6 Insufficient cpu.',
      'FailedScheduling: 0/6 nodes are available: 2 node(s) had taint {dedicated=system: NoSchedule}.',
    ],
    logs: ['(no logs: pods not scheduled)'],
    remediation:
      'Scale the cluster or reduce requests; confirm tolerations/affinity rules. If needed, temporarily reduce replica count to stabilize.',
    kubectlCommands: [
      'kubectl -n prod get pods -o wide',
      'kubectl -n prod describe pod <pod-name> | rg -n \"FailedScheduling|Insufficient\"',
      'kubectl get nodes',
      'kubectl top nodes',
    ],
    deploymentYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendation-service
  namespace: prod
spec:
  template:
    spec:
      containers:
        - name: recommendation-service
          resources:
            requests:
              cpu: 750m
              memory: 512Mi`,
    verification: [
      'Confirm pods schedule and become Ready',
      'Check node utilization returns to acceptable levels',
      'Verify traffic latency recovers',
    ],
  },
  {
    id: 'nodenotready',
    title: 'Node Not Ready',
    incidentText: 'NodeNotReady: ip-10-0-2-19 flapping; multiple pods evicted across namespaces.',
    severity: 'P0',
    confidence: 88,
    summary: 'A node became unavailable, causing pod evictions and service instability.',
    aiReasoning:
      'Node readiness flapping can be caused by network issues, disk pressure, kubelet/container runtime problems, or cloud instance degradation. Evidence focuses on node conditions and recent events.',
    evidence: [
      'Node condition toggling Ready/NotReady',
      'Pod evictions increased on that node',
      'Node events show kubelet heartbeat missed',
      'Disk or network pressure warnings present',
    ],
    events: [
      'NodeNotReady: Node ip-10-0-2-19 status is now: NodeNotReady',
      'NodeReady: Node ip-10-0-2-19 status is now: NodeReady',
      'Evicted: The node was low on resource: ephemeral-storage.',
    ],
    logs: [
      '(node-level logs not available in MVP)',
      'kubelet: failed to post node status',
      'containerd: io timeout pulling metadata',
    ],
    remediation:
      'Cordon and drain the node if instability persists. Investigate kubelet/container runtime health and underlying node resources.',
    kubectlCommands: [
      'kubectl describe node ip-10-0-2-19',
      'kubectl cordon ip-10-0-2-19',
      'kubectl drain ip-10-0-2-19 --ignore-daemonsets --delete-emptydir-data',
    ],
    deploymentYaml: `apiVersion: v1
kind: Node
metadata:
  name: ip-10-0-2-19
status:
  conditions:
    - type: Ready
      status: "False"
      reason: KubeletNotReady`,
    verification: [
      'Confirm node is Ready or removed from scheduling',
      'Validate evicted pods reschedule successfully',
      'Check error rates and latency normalize',
    ],
  },
  {
    id: 'configmapmissing',
    title: 'ConfigMap Missing',
    incidentText: 'pods failing: configmap "app-config" not found in checkout namespace.',
    severity: 'P2',
    confidence: 87,
    summary: 'Workloads fail to start because a referenced ConfigMap does not exist (or wrong namespace/name).',
    aiReasoning:
      'If a pod references a missing ConfigMap via envFrom/volume, it will fail to create or crash at startup. Evidence centers on events and deployment manifests.',
    evidence: [
      'Events show ConfigMap not found',
      'Deployment references configMap name app-config',
      'ConfigMap absent in namespace checkout',
      'Recent config refactor renamed keys/resources',
    ],
    events: [
      'FailedMount: MountVolume.SetUp failed for volume "config" : configmap "app-config" not found',
      'Warning: Error: configmap not found',
    ],
    logs: ['(container may not start if volume mount fails)'],
    remediation:
      'Create/restore the missing ConfigMap or update the deployment reference to the correct name/namespace. Consider adding admission checks for required config objects.',
    kubectlCommands: [
      'kubectl -n checkout get configmap',
      'kubectl -n checkout get deploy checkout-api -o yaml | rg -n \"configMap|app-config\"',
      'kubectl -n checkout apply -f app-config.yaml',
    ],
    deploymentYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
  namespace: checkout
spec:
  template:
    spec:
      volumes:
        - name: config
          configMap:
            name: app-config
      containers:
        - name: checkout-api
          volumeMounts:
            - name: config
              mountPath: /etc/app`,
    verification: [
      'Confirm pods start and mounts succeed',
      'Validate config keys/values are present in container',
      'Smoke test checkout endpoint',
    ],
  },
  {
    id: 'secretmissing',
    title: 'Secret Missing',
    incidentText: 'CrashLoopBackOff: auth-service cannot start; referenced Secret "auth-secrets" missing.',
    severity: 'P1',
    confidence: 90,
    summary: 'Authentication service fails because required secrets are missing, invalid, or not mounted correctly.',
    aiReasoning:
      'Secrets missing or malformed often cause deterministic startup failures. Evidence focuses on mount/env references and events indicating SecretNotFound.',
    evidence: [
      'Events show Secret "auth-secrets" not found',
      'Deployment references auth-secrets via envFrom',
      'Pods crash immediately with missing credentials error',
      'Secret rotation job failed earlier',
    ],
    events: [
      'FailedMount: secrets "auth-secrets" not found',
      'BackOff: Back-off restarting failed container',
    ],
    logs: [
      '2026-07-10T09:44:01Z FATAL missing AUTH_SIGNING_KEY',
      '2026-07-10T09:44:01Z exiting with code=1',
    ],
    remediation:
      'Restore or recreate the missing Secret and verify key names/format. Confirm RBAC and service account permissions for secret access.',
    kubectlCommands: [
      'kubectl -n identity get secret',
      'kubectl -n identity describe pod <pod-name> | rg -n \"Secret|FailedMount\"',
      'kubectl -n identity apply -f auth-secrets.yaml',
    ],
    deploymentYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: identity
spec:
  template:
    spec:
      containers:
        - name: auth-service
          envFrom:
            - secretRef:
                name: auth-secrets`,
    verification: [
      'Confirm auth-service pods become Ready',
      'Validate token issuance works',
      'Run a canary login request end-to-end',
    ],
  },
  {
    id: 'ingressfailure',
    title: 'Ingress Failure',
    incidentText: 'Ingress returning 503 for api.opspilot.local; backend pods healthy but traffic failing.',
    severity: 'P0',
    confidence: 83,
    summary: 'Ingress routes traffic incorrectly or cannot reach upstream endpoints, causing 503 responses.',
    aiReasoning:
      'Ingress 503 with healthy pods often indicates Service selector mismatch, wrong service port/targetPort, missing endpoints, or ingress controller issues. Evidence focuses on endpoints and ingress/controller events.',
    evidence: [
      'Ingress returns 503 but pods are Running',
      'Service has zero endpoints due to selector mismatch',
      'Ingress backend service port misconfigured',
      'Ingress controller logs show upstream unavailable',
    ],
    events: [
      'Warning: Service "backend" does not have any active Endpoints.',
      'Normal: Scheduled sync for ingress opspilot',
    ],
    logs: [
      'nginx-ingress: upstream timed out (110: Operation timed out) while connecting to upstream',
      'nginx-ingress: no live upstreams while connecting to upstream',
    ],
    remediation:
      'Verify Service selectors/ports and ensure endpoints exist. Validate ingress rules and controller health; restart controller if needed.',
    kubectlCommands: [
      'kubectl get ingress -A',
      'kubectl -n opspilot describe ingress opspilot',
      'kubectl -n opspilot get endpoints',
      'kubectl -n opspilot get svc -o wide',
    ],
    deploymentYaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opspilot
  namespace: opspilot
spec:
  rules:
    - host: api.opspilot.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: opspilot-backend
                port:
                  number: 8000`,
    verification: [
      'Confirm endpoints exist for backend service',
      'Validate ingress returns 200 for /healthz',
      'Ensure 503s disappear in access logs',
    ],
  },
  {
    id: 'highcpu',
    title: 'High CPU',
    incidentText: 'High CPU alert: cart-service CPU > 95% for 10 minutes, p95 latency rising.',
    severity: 'P1',
    confidence: 78,
    summary: 'Sustained CPU saturation increases latency and can trigger throttling, degrading customer experience.',
    aiReasoning:
      'High CPU can come from traffic spikes, inefficient code paths, tight loops, or missing caching. Evidence focuses on HPA behavior, CPU limits/throttling, and recent changes.',
    evidence: [
      'CPU usage sustained near limit; throttling likely',
      'Latency increased in the same window as CPU spike',
      'HPA did not scale fast enough or is misconfigured',
      'Recent deploy introduced expensive code path',
    ],
    events: [
      'Normal: SuccessfulRescale: New size: 6; reason: cpu resource utilization',
      'Warning: CPUThrottlingHigh observed on cart-service pods',
    ],
    logs: [
      '2026-07-10T07:20:14Z WARN cache miss rate high keyspace=products',
      '2026-07-10T07:20:29Z INFO request /cart/checkout duration=1820ms',
    ],
    remediation:
      'Increase replicas, tune HPA, and review CPU limits/requests to reduce throttling. Investigate hot endpoints and enable caching or optimize code.',
    kubectlCommands: [
      'kubectl -n prod top pods | rg cart-service',
      'kubectl -n prod describe hpa cart-service',
      'kubectl -n prod get deploy cart-service -o yaml | rg -n \"cpu|resources\"',
    ],
    deploymentYaml: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cart-service
  namespace: prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cart-service
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70`,
    verification: [
      'Confirm CPU drops below 70% after scaling/tuning',
      'Verify latency recovers and throttling decreases',
      'Watch for recurrence after next deploy',
    ],
  },
  {
    id: 'memoryleak',
    title: 'Memory Leak',
    incidentText: 'Memory usage steadily increasing for notifications-service; restarts every ~45 minutes.',
    severity: 'P2',
    confidence: 81,
    summary: 'A suspected memory leak causes gradual RSS growth until the pod restarts or is OOM-killed.',
    aiReasoning:
      'A steady upward memory curve suggests leaking objects, unbounded caches, or missing backpressure. Evidence focuses on restart cadence, memory limits, and workload patterns.',
    evidence: [
      'Memory usage increases monotonically over time',
      'Restarts happen at a consistent interval',
      'No corresponding traffic spike; suggests leak',
      'GC logs indicate increasing heap pressure',
    ],
    events: [
      'Warning: Container notifications-service restarted',
      'Normal: Started container notifications-service',
    ],
    logs: [
      '2026-07-10T06:12:01Z INFO heap used=312Mi rss=420Mi',
      '2026-07-10T06:42:01Z INFO heap used=612Mi rss=790Mi',
      '2026-07-10T06:52:19Z WARN nearing memory limit rss=940Mi',
    ],
    remediation:
      'Increase memory temporarily to reduce churn, then profile and fix the leak. Add memory alerts, cap caches, and validate worker concurrency.',
    kubectlCommands: [
      'kubectl -n prod get pods -o wide | rg notifications-service',
      'kubectl -n prod logs deploy/notifications-service --tail=300',
      'kubectl -n prod rollout restart deploy/notifications-service',
    ],
    deploymentYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: notifications-service
  namespace: prod
spec:
  template:
    spec:
      containers:
        - name: notifications-service
          resources:
            requests:
              memory: 512Mi
            limits:
              memory: 2Gi`,
    verification: [
      'Confirm memory growth rate stabilizes after fix',
      'Validate restart cadence stops',
      'Review heap/RSS trend for 2 hours',
    ],
  },
];

export const DEMO_MODE_INCIDENT_IDS = new Set([
  'crashloopbackoff',
  'imagepullbackoff',
  'oomkilled',
  'configmapmissing',
  'nodenotready',
]);

export const DEMO_MODE_INCIDENTS: DemoIncidentScenario[] = DEMO_INCIDENTS.filter((incident) =>
  DEMO_MODE_INCIDENT_IDS.has(incident.id),
);

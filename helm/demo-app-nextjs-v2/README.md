# Demo App Next.js Helm Chart

This Helm chart deploys the demo Next.js application with support for both Elasticsearch and OpenSearch as search backends.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- Either Elasticsearch or OpenSearch cluster deployed and accessible

## Installing the Chart

To install the chart with the release name `demo-nextjs`:

```bash
helm install demo-nextjs ./helm/demo-app-nextjs-v2 \
  --namespace demo-app \
  --create-namespace
```

## Configuration

### Search Engine Selection

The application supports both Elasticsearch and OpenSearch. You can switch between them using the `opensearch.use` value:

- `opensearch.use: false` (default) - Use Elasticsearch
- `opensearch.use: true` - Use OpenSearch

### Elasticsearch Configuration

```yaml
elasticsearch:
  secretName: elasticsearch-credentials
  url: "https://your-elasticsearch-cluster:9200"
  username: "elastic"
  password: "your-password"
```

### OpenSearch Configuration

```yaml
opensearch:
  secretName: opensearch-credentials
  url: "https://your-opensearch-cluster:9200"
  username: "admin"
  password: "your-password"
  use: true  # Set to true to use OpenSearch instead of Elasticsearch
```

## Examples

### Deploy with Elasticsearch (default)

```bash
helm install demo-nextjs ./helm/demo-app-nextjs-v2 \
  --namespace demo-app \
  --set elasticsearch.url="https://your-elasticsearch:9200" \
  --set elasticsearch.username="elastic" \
  --set elasticsearch.password="your-password"
```

### Deploy with OpenSearch

```bash
helm install demo-nextjs ./helm/demo-app-nextjs-v2 \
  --namespace demo-app \
  --set opensearch.use=true \
  --set opensearch.url="https://your-opensearch:9200" \
  --set opensearch.username="admin" \
  --set opensearch.password="your-password"
```

### Upgrade to switch from Elasticsearch to OpenSearch

```bash
helm upgrade demo-nextjs ./helm/demo-app-nextjs-v2 \
  --namespace demo-app \
  --set opensearch.use=true \
  --reuse-values
```

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| replicaCount | int | 1 | Number of replicas |
| image.repository | string | `"211125671185.dkr.ecr.us-east-2.amazonaws.com/demo-nextjs-app"` | Image repository |
| image.tag | string | `"latest"` | Image tag |
| image.pullPolicy | string | `"Always"` | Image pull policy |
| service.type | string | `"ClusterIP"` | Service type |
| service.port | int | 80 | Service port |
| service.targetPort | int | 3000 | Container port |
| elasticsearch.secretName | string | `"elasticsearch-credentials"` | Name of the secret for Elasticsearch credentials |
| elasticsearch.url | string | `""` | Elasticsearch URL |
| elasticsearch.username | string | `"elastic"` | Elasticsearch username |
| elasticsearch.password | string | `""` | Elasticsearch password |
| opensearch.secretName | string | `"opensearch-credentials"` | Name of the secret for OpenSearch credentials |
| opensearch.url | string | `""` | OpenSearch URL |
| opensearch.username | string | `"admin"` | OpenSearch username |
| opensearch.password | string | `""` | OpenSearch password |
| opensearch.use | bool | `false` | Use OpenSearch instead of Elasticsearch |
| resources | object | See values.yaml | Resource requests and limits |
| autoscaling.enabled | bool | `false` | Enable autoscaling |
| autoscaling.minReplicas | int | 2 | Minimum replicas for autoscaling |
| autoscaling.maxReplicas | int | 10 | Maximum replicas for autoscaling |
| autoscaling.targetCPUUtilizationPercentage | int | 80 | Target CPU utilization for autoscaling |

## Troubleshooting

### Check which search engine is being used

```bash
kubectl logs -n demo-app deployment/demo-nextjs-demo-app-nextjs | grep "Using"
```

You should see either:
- `Using Elasticsearch client`
- `Using OpenSearch client`

### Verify environment variables

```bash
kubectl describe deployment -n demo-app demo-nextjs-demo-app-nextjs
```

Check that the `USE_OPENSEARCH` environment variable is set correctly.

## Uninstalling the Chart

```bash
helm uninstall demo-nextjs -n demo-app

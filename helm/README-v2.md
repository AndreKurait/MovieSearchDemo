# Demo App Helm Charts - Simplified Architecture (v2)

This directory contains the simplified Helm charts that eliminate circular dependencies between the Next.js application and Locust load testing tool.

## What Changed?

### Problems with the Previous Architecture:
1. **Circular Dependency**: Locust depended on a ConfigMap that was updated by a NextJS post-install job
2. **Pod Cycling**: Updates to either service could trigger restarts in the other
3. **Complex Configuration**: Shared ConfigMaps and post-install hooks added unnecessary complexity
4. **Deployment Order Dependencies**: Had to deploy NextJS first, wait for LoadBalancer, then deploy Locust

### Solutions in v2:
1. **No Shared Resources**: Each chart is completely independent
2. **Service Discovery**: Locust uses Kubernetes DNS to find NextJS (no ConfigMap needed)
3. **Simplified Configuration**: Direct environment variables instead of ConfigMap references
4. **Any Order Deployment**: Deploy services in any order without dependencies

## Architecture Overview

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   NextJS Application    │     │    Locust Load Test     │
├─────────────────────────┤     ├─────────────────────────┤
│ - ClusterIP Service     │◄────│ - Uses K8s DNS          │
│ - LoadBalancer Service  │     │ - No ConfigMap needed   │
│ - Elasticsearch Secret  │     │ - Direct configuration  │
└─────────────────────────┘     └─────────────────────────┘
         No shared resources between charts
```

## Quick Start

### 1. Deploy NextJS Application

```bash
# Install
helm install demo-nextjs ./demo-app-nextjs-v2 \
  --namespace demo-app \
  --create-namespace

# Or upgrade
helm upgrade demo-nextjs ./demo-app-nextjs-v2 \
  --namespace demo-app
```

### 2. Deploy Locust (Optional)

```bash
# Install with default configuration (targets NextJS via K8s DNS)
helm install demo-locust ./demo-app-locust-v2 \
  --namespace demo-app

# Or install with custom target
helm install demo-locust ./demo-app-locust-v2 \
  --namespace demo-app \
  --set config.targetHost="http://my-custom-host.com"
```

## Configuration

### NextJS Configuration (values.yaml)

```yaml
service:
  type: ClusterIP  # Internal service for pod-to-pod communication
  port: 80
  targetPort: 3000

externalAccess:
  enabled: true  # Creates a separate LoadBalancer for external access
  type: LoadBalancer
  port: 80
```

### Locust Configuration (values.yaml)

```yaml
config:
  # Default: Use Kubernetes service discovery
  targetHost: "http://demo-nextjs-demo-app-nextjs.demo-app.svc.cluster.local"
  
  # Or specify any custom host
  # targetHost: "http://your-external-loadbalancer.com"
  
  users: 50
  spawnRate: 50
  runTime: "500m"
  headless: false  # Set to true for CI/CD pipelines
```

## Key Improvements

### 1. No Circular Dependencies
- Removed the shared ConfigMap
- Eliminated post-install/post-upgrade hooks
- No more pod cycling issues

### 2. Simplified Deployment
- Deploy in any order
- No waiting for LoadBalancer endpoints
- Direct configuration via values

### 3. Better Isolation
- Each service is truly independent
- Updates don't affect other services
- Easier to debug and maintain

### 4. Flexible Configuration
- Locust can target any host (internal or external)
- Easy to switch between environments
- Support for headless mode for CI/CD

## Common Use Cases

### Testing Internal Service
```bash
# Default configuration uses Kubernetes DNS
helm install demo-locust ./demo-app-locust-v2 --namespace demo-app
```

### Testing External LoadBalancer
```bash
# Get the external LoadBalancer URL
kubectl get svc -n demo-app demo-nextjs-demo-app-nextjs-external -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Install Locust with external target
helm install demo-locust ./demo-app-locust-v2 \
  --namespace demo-app \
  --set config.targetHost="http://<EXTERNAL_LB_URL>"
```

### Running Headless Load Tests (CI/CD)
```bash
helm install demo-locust ./demo-app-locust-v2 \
  --namespace demo-app \
  --set config.headless=true \
  --set config.users=100 \
  --set config.runTime="10m"
```

## Accessing Services

### NextJS Application
```bash
# Internal service (for pod-to-pod communication)
http://demo-nextjs-demo-app-nextjs.demo-app.svc.cluster.local

# External LoadBalancer
kubectl get svc -n demo-app demo-nextjs-demo-app-nextjs-external
```

### Locust Web UI
```bash
kubectl get svc -n demo-app demo-locust-demo-app-locust
# Access at http://<LOCUST_LB_URL>:8089
```

## Migration from v1

1. **Backup your values**: Save any custom configurations
2. **Uninstall old charts**: 
   ```bash
   helm uninstall demo-nextjs -n demo-app
   helm uninstall demo-locust -n demo-app
   ```
3. **Deploy new charts**: Follow the Quick Start guide above
4. **Update CI/CD**: Remove any ConfigMap update steps

## Troubleshooting

### Locust can't reach NextJS
1. Verify NextJS is running: `kubectl get pods -n demo-app`
2. Check the service name: `kubectl get svc -n demo-app`
3. Ensure both are in the same namespace
4. Try using the external LoadBalancer URL instead

### Performance Issues
1. Increase Locust resources in values.yaml
2. Scale NextJS replicas: `--set replicaCount=3`
3. Enable autoscaling for NextJS

## Building Docker Images

### NextJS
```bash
cd nextjs-app
docker build -t your-registry/demo-nextjs-app:latest .
docker push your-registry/demo-nextjs-app:latest
```

### Locust (v2)
```bash
cd locust
docker build -f Dockerfile.v2 -t your-registry/demo-locust:v2 .
docker push your-registry/demo-locust:v2
```

## Summary

The v2 architecture eliminates the circular dependency by:
- Removing shared ConfigMaps
- Using Kubernetes DNS for service discovery
- Eliminating post-install hooks
- Making each service truly independent

This results in a more stable, maintainable, and easier to deploy system.

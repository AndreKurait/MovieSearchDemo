# Movie Search Demo

Movie search app on EKS Auto Mode with self-managed Elasticsearch, featuring keyword search with autocomplete. Includes synthetic data generators and Locust load testing.

## Prerequisites

- AWS account with EKS access
- [OpenTofu](https://opentofu.org) or Terraform >= 1.5
- AWS CLI v1.31+ or v2 (must output `client.authentication.k8s.io/v1beta1`)
- Docker (with buildx for multi-arch builds)
- kubectl v1.31+

### AWS Credentials

```bash
# Using ada (Amazon internal)
ada credentials update --account <ACCOUNT_ID> --role Admin --provider isengard --once

# Verify
aws sts get-caller-identity
```

## Quick Start

```bash
make init          # Initialize terraform
make apply         # Deploy infrastructure (~15 min)
make kubeconfig    # Configure kubectl
make build         # Build & push Docker images (app + locust)
make deploy        # Deploy to Kubernetes
make port-forward  # Access at http://localhost:8080
```

## Architecture

- **EKS Auto Mode** — Automatic node provisioning, no node management
- **Elasticsearch 8.19** — Self-managed on EKS with EBS gp3 storage, S3 snapshots via EKS Pod Identity
- **Next.js 15** — Frontend with React 19, autocomplete search UI
- **Locust** — Headless load testing on the cluster
- **OpenTofu** — Infrastructure as code (VPC, EKS, ECR, OpenSearch Service domain)

## Structure

```
├── app/                          # Next.js application
│   ├── app/                      # Pages, components, API routes
│   ├── lib/elasticsearch.ts      # ES/OpenSearch client
│   └── Dockerfile
├── k8s/                          # Kubernetes manifests
│   ├── elasticsearch.yaml        # ES StatefulSet (3 nodes, 500Gi each)
│   ├── app.yaml                  # App Deployment + Service
│   ├── locust.yaml               # Locust load testing (headless)
│   ├── load-movies-synthetic-job.yaml  # Generate 10k synthetic movies
│   ├── load-logs-job.yaml        # Generate ~1TB application logs
│   ├── setup-elser-job.yaml      # ELSER model setup (semantic search)
│   └── load-enriched-job.yaml    # TMDB enriched data with ELSER
├── locust/                       # Locust load testing
│   ├── locustfile.py
│   └── Dockerfile
├── tofu/                         # OpenTofu infrastructure
├── scripts/                      # Build and deploy scripts
└── Makefile
```

## Commands

### Infrastructure

| Command | Description |
|---------|-------------|
| `make init` | Initialize OpenTofu |
| `make plan` | Preview infrastructure changes |
| `make apply` | Deploy infrastructure |
| `make destroy` | Tear down everything |
| `make kubeconfig` | Configure kubectl for the cluster |

### Build & Deploy

| Command | Description |
|---------|-------------|
| `make build` | Build & push multi-arch Docker images to ECR |
| `make deploy` | Deploy ES + app + locust to Kubernetes |
| `make port-forward` | Access app at http://localhost:8080 |

### Data Loading

```bash
# Load 10k synthetic movies (no API key needed)
kubectl delete job load-movies-synthetic -n movie-demo --ignore-not-found
kubectl apply -f k8s/load-movies-synthetic-job.yaml

# Generate ~1TB of application logs (10 parallel workers)
kubectl delete job load-app-logs -n movie-demo --ignore-not-found
kubectl apply -f k8s/load-logs-job.yaml

# Monitor progress
kubectl logs -f job/load-movies-synthetic -n movie-demo
kubectl exec -n movie-demo elasticsearch-0 -c elasticsearch -- \
  curl -s 'http://localhost:9200/_cat/indices?v'
```

### Load Testing

Locust deploys automatically with `make deploy` — 50 concurrent users for 500 minutes.

| Command | Description |
|---------|-------------|
| `make deploy-locust` | Deploy/redeploy locust independently |
| `make locust-logs` | Stream locust output |
| `make stop-locust` | Stop the load test |

## Environment Variables

The Next.js app uses these (see `app/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch endpoint |
| `USE_OPENSEARCH` | `false` | Switch to OpenSearch client |
| `OPENSEARCH_URL` | `http://localhost:9200` | OpenSearch endpoint |

In Kubernetes, `ELASTICSEARCH_URL` is set to `http://elasticsearch.movie-demo.svc.cluster.local:9200`.

## Local Development

```bash
cd app
cp .env.example .env.local
npm install
npm run dev
```

Requires Elasticsearch at `http://localhost:9200` (or configure via `.env.local`).

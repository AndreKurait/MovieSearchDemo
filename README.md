# Movie Search Demo

Movie search app on EKS Auto Mode with self-managed Elasticsearch or Amazon OpenSearch Service, featuring keyword search with autocomplete and real TMDB movie data. Includes Locust load testing.

This is a demonstration project. Start with local application development below;
the cloud workflow provisions billable infrastructure and starts load generators.
Review the Terraform plan and Kubernetes manifests before deploying.

## Prerequisites

- AWS account with EKS access
- [OpenTofu](https://opentofu.org) or Terraform >= 1.5
- AWS CLI v2 configured for your own account
- Docker (with buildx for multi-arch builds)
- kubectl v1.31+
- [TMDB API key](https://www.themoviedb.org/settings/api) (free)

### AWS Credentials

```bash
# Configure an IAM Identity Center profile, if your organization uses one.
aws configure sso --profile movie-demo
aws sso login --profile movie-demo
export AWS_PROFILE=movie-demo

# Verify
aws sts get-caller-identity
```

Other standard AWS credential providers work too. The scripts use the AWS CLI
credential chain.

### State Backend

Use an existing S3 state bucket and DynamoDB lock table in your own account.
Copy `tofu/backend.hcl.example` to `tofu/backend.hcl` and replace the example
bucket/table names and region before running `make init`. The local configuration
file is ignored by Git. The lock table must use a string partition key named
`LockID`.

If you already deployed this project, retain your existing backend values.
Changing the backend location is a separate state-migration operation; this
update does not move or delete your state.

## Quick Start

```bash
make init          # Initialize terraform
make plan          # Inspect the resources and sizing
make apply         # Deploy infrastructure (~15 min)
make kubeconfig    # Configure kubectl
make build         # Build & push Docker images (app + locust)
make deploy        # Deploy to Kubernetes

# Load real movie data (~70k movies from TMDB)
export TMDB_API_KEY="your-key-here"
make load-movies

make port-forward  # Access at http://localhost:8080
```

## Architecture

- **EKS Auto Mode** — Automatic node provisioning, no node management
- **Elasticsearch 8.19** — Self-managed on EKS with EBS gp3 storage, S3 snapshots via EKS Pod Identity
- **Next.js 15** — Frontend with React 19, autocomplete search UI
- **Locust** — Headless load testing on the cluster
- **OpenTofu** — Infrastructure as code (VPC, EKS, ECR)

## Structure

```
├── app/                          # Next.js application
│   ├── app/                      # Pages, components, API routes
│   ├── lib/elasticsearch.ts      # ES/OpenSearch client (supports both)
│   └── Dockerfile
├── k8s/                          # Kubernetes manifests
│   ├── elasticsearch.yaml        # ES StatefulSet (3 nodes, 500Gi each)
│   ├── app.yaml                  # App Deployment + Service
│   ├── locust.yaml               # Locust load testing (headless)
│   ├── load-movies-job.yaml      # Load real TMDB movies (~70k)
│   ├── load-logs-job.yaml        # Generate ~1TB application logs
│   └── setup-elser-job.yaml      # ELSER model setup (semantic search)
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
| `make apply` | Review and confirm infrastructure deployment |
| `make destroy` | Review and confirm infrastructure teardown |
| `make kubeconfig` | Configure kubectl for the cluster |
| `make clean` | Remove local caches and saved plan; preserve state and lock files |

### Build & Deploy

| Command | Description |
|---------|-------------|
| `make build` | Build & push multi-arch Docker images to ECR |
| `make deploy` | Deploy ES + app + locust to Kubernetes |
| `make port-forward` | Access app at http://localhost:8080 |

### Data Loading

```bash
# Load real TMDB movies (requires TMDB API key)
export TMDB_API_KEY="your-key-here"
make load-movies

# Generate ~1TB of application logs (10 parallel workers)
kubectl delete job load-app-logs -n movie-demo --ignore-not-found
kubectl apply -f k8s/load-logs-job.yaml

# Monitor progress
kubectl logs -f job/load-movies -n movie-demo
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

## Search Engine Configuration

The app supports three backends. Configure via environment variables in `k8s/app.yaml` or `app/.env.local`.

### Self-managed Elasticsearch (default)

No auth required for the in-cluster ES deployment.

```yaml
# k8s/app.yaml env vars (already configured)
- name: ELASTICSEARCH_URL
  value: "http://elasticsearch.movie-demo.svc.cluster.local:9200"
- name: USE_OPENSEARCH
  value: "false"
```

### Amazon OpenSearch Service (SigV4)

Uses IAM authentication via EKS Pod Identity — no passwords or keys to manage. The infrastructure (`make apply`) automatically creates:
- A `movie-demo-app` service account with an IAM role
- Pod identity association granting `es:ESHttp*` permissions
- The app resolves credentials automatically via the AWS SDK credential chain

To switch to an OpenSearch Service domain, update `k8s/app.yaml`:

```yaml
- name: USE_OPENSEARCH
  value: "true"
- name: OPENSEARCH_URL
  value: "https://my-domain.us-east-1.es.amazonaws.com"
- name: OPENSEARCH_AUTH
  value: "sigv4"
- name: AWS_REGION
  value: "us-east-1"
```

Then redeploy: `make build && kubectl rollout restart deployment/movie-demo-app -n movie-demo`

### OpenSearch Serverless (AOSS)

Same as above, but set the service to `aoss`:

```yaml
- name: USE_OPENSEARCH
  value: "true"
- name: OPENSEARCH_URL
  value: "https://collection-id.us-east-1.aoss.amazonaws.com"
- name: OPENSEARCH_AUTH
  value: "sigv4"
- name: OPENSEARCH_SERVICE
  value: "aoss"
- name: AWS_REGION
  value: "us-east-1"
```

### OpenSearch with Basic Auth

For self-managed OpenSearch or clusters using username/password:

```yaml
- name: USE_OPENSEARCH
  value: "true"
- name: OPENSEARCH_URL
  value: "https://my-opensearch:9200"
- name: OPENSEARCH_USERNAME
  value: "admin"
- name: OPENSEARCH_PASSWORD
  value: "admin"
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_OPENSEARCH` | `false` | Use OpenSearch client instead of Elasticsearch |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch endpoint |
| `ELASTICSEARCH_USERNAME` | | Elasticsearch username (optional) |
| `ELASTICSEARCH_PASSWORD` | | Elasticsearch password (optional) |
| `OPENSEARCH_URL` | `http://localhost:9200` | OpenSearch endpoint |
| `OPENSEARCH_AUTH` | | Set to `sigv4` for IAM auth |
| `OPENSEARCH_SERVICE` | `es` | `es` for managed OpenSearch, `aoss` for Serverless |
| `OPENSEARCH_USERNAME` | | OpenSearch username (basic auth) |
| `OPENSEARCH_PASSWORD` | | OpenSearch password (basic auth) |
| `AWS_REGION` | `us-east-1` | AWS region for SigV4 signing |

## Local Development

```bash
cd app
cp .env.example .env.local
npm install
npm run dev
```

Requires Elasticsearch at `http://localhost:9200` (or configure via `.env.local`).

Use `npm ci` for a reproducible install from the committed lockfile. From the
repository root, `make check` runs the maintenance regression test, shell syntax
checks, and TypeScript checking without deploying infrastructure. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

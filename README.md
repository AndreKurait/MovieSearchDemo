# Movie Search Demo

Movie search app on EKS Auto Mode with Elasticsearch, featuring keyword, semantic (ELSER), and hybrid search.

## Quick Start

```bash
make init          # Initialize terraform
make apply         # Deploy infrastructure (~15 min)
make kubeconfig    # Configure kubectl
make build         # Build & push Docker image
make deploy        # Deploy to Kubernetes
make port-forward  # Access at http://localhost:8080
```

## Architecture

- **EKS Auto Mode** - Automatic node provisioning, no node management needed
- **Elasticsearch 8.17** - Search backend with ELSER v2 for semantic search
- **Next.js 15** - Frontend application with React 19
- **ECR** - Container registry
- **OpenTofu/Terraform** - Infrastructure as code

## Structure

```
├── app/          # Next.js application
│   ├── app/      # Pages, components, API routes
│   ├── lib/      # Elasticsearch/OpenSearch client
│   └── Dockerfile
├── k8s/          # Kubernetes manifests
│   ├── elasticsearch.yaml    # ES StatefulSet + StorageClass
│   ├── app.yaml              # App Deployment + Service
│   ├── setup-elser-job.yaml  # ELSER model setup
│   ├── load-data-job.yaml    # Sample data (15 movies)
│   ├── load-tmdb-job.yaml    # TMDB bulk load (up to 500K)
│   └── load-enriched-job.yaml # TMDB enriched data with ELSER
├── tofu/         # OpenTofu/Terraform infrastructure
├── scripts/      # Build and deploy scripts
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
| `make build` | Build & push multi-arch Docker image to ECR |
| `make deploy` | Deploy Elasticsearch + app to Kubernetes |
| `make port-forward` | Access app at http://localhost:8080 |

### Data Loading

| Command | Description |
|---------|-------------|
| `make load-data` | Load 10 sample movies locally (via script) |
| `make setup-elser` | Deploy ELSER v2 model for semantic search (~5 min) |
| `make create-tmdb-secret` | Create K8s secret from `TMDB_API_KEY` env var |
| `make load-tmdb` | Bulk load up to 500K movies from TMDB API |
| `make load-enriched` | Load enriched movies with credits, keywords, and ELSER embeddings |

### Cleanup

| Command | Description |
|---------|-------------|
| `make clean` | Remove local terraform state and cache |
| `make destroy` | Destroy all AWS infrastructure |

## Semantic Search Setup

To enable semantic (ELSER) and hybrid search:

```bash
# 1. Deploy the base infrastructure and app first
make all

# 2. Set up ELSER v2 model (downloads model, creates ingest pipeline, recreates index)
make setup-elser

# 3. Load enriched movie data with ELSER embeddings
export TMDB_API_KEY=your_tmdb_api_key_here
make load-enriched

# 4. Monitor progress
kubectl logs job/load-enriched-movies -n movie-demo -f
```

The semantic slider in the UI controls the search mode:
- **Left (0%)** - Pure keyword search (BM25 + function scoring)
- **Middle (50%)** - Hybrid search using Reciprocal Rank Fusion (RRF)
- **Right (100%)** - Pure semantic search via ELSER text expansion

## TMDB API Key

Several data loading jobs require a [TMDB API key](https://developer.themoviedb.org/docs/getting-started):

```bash
# Set the API key as an environment variable
export TMDB_API_KEY=your_read_access_token

# The Makefile will create the Kubernetes secret automatically
make load-enriched
```

Or create the secret manually:

```bash
kubectl create secret generic tmdb-api-key \
  --from-literal=api-key=your_read_access_token \
  -n movie-demo
```

## Environment Variables

The Next.js app uses these environment variables (see `app/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch endpoint |
| `ELASTICSEARCH_USERNAME` | `elastic` | Elasticsearch username |
| `ELASTICSEARCH_PASSWORD` | _(empty)_ | Elasticsearch password |
| `USE_OPENSEARCH` | `false` | Switch to OpenSearch client |
| `OPENSEARCH_URL` | `http://localhost:9200` | OpenSearch endpoint |
| `OPENSEARCH_USERNAME` | `admin` | OpenSearch username |
| `OPENSEARCH_PASSWORD` | _(empty)_ | OpenSearch password |

In Kubernetes, `ELASTICSEARCH_URL` is set to `http://elasticsearch.movie-demo.svc.cluster.local:9200` via the app manifest.

## Local Development

```bash
cd app
cp .env.example .env.local
npm install
npm run dev
```

Requires a running Elasticsearch instance at `http://localhost:9200` (or configure via `.env.local`).

## Requirements

- [OpenTofu](https://opentofu.org) or Terraform >= 1.5
- AWS CLI configured
- Docker (with buildx for multi-arch builds)
- kubectl

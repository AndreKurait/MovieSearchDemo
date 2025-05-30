# Demo Next.js App with Elasticsearch and Locust Load Testing

This is a simple demo application that showcases:
- A Next.js frontend with movie search functionality
- Elasticsearch 8 or OpenSearch integration for full-text search
- Locust load testing setup
- Helm chart deployment for EKS

## Project Structure

```
demo-app/
├── nextjs-app/          # Next.js application
│   ├── app/             # App router pages and API routes
│   ├── lib/             # Elasticsearch client configuration
│   └── Dockerfile       # Docker image for Next.js
├── locust/              # Load testing setup
│   ├── locustfile.py    # Locust test scenarios
│   └── Dockerfile       # Docker image for Locust
└── helm/                # Helm chart for Kubernetes deployment
    └── demo-app/
        ├── templates/   # Kubernetes manifests
        └── values.yaml  # Configuration values
```

## Prerequisites

- Docker
- Kubernetes cluster (EKS)
- Helm 3
- Elasticsearch cluster (deployed separately)

## Local Development

### Running the Next.js App

```bash
cd nextjs-app
npm install
npm run dev
```

The app will be available at http://localhost:3000

### Environment Variables

Create a `.env.local` file in the `nextjs-app` directory:

#### For Elasticsearch (default):
```
USE_OPENSEARCH=false
ELASTICSEARCH_URL=http://your-elasticsearch-cluster:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password
```

#### For OpenSearch:
```
USE_OPENSEARCH=true
OPENSEARCH_URL=http://your-opensearch-cluster:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your-password
```

**Note**: Both clients are configured to accept self-signed certificates. For production use with proper certificates, remove the `tls: { rejectUnauthorized: false }` (Elasticsearch) or `ssl: { rejectUnauthorized: false }` (OpenSearch) configuration from `nextjs-app/lib/elasticsearch.ts`.

## Building Docker Images

### Next.js App
```bash
cd nextjs-app
docker build -t demo-nextjs-app:latest .
```

### Locust
```bash
cd locust
docker build -t demo-locust:latest .
```

## Deploying to EKS

1. Push Docker images to your container registry:
```bash
# Tag and push Next.js image
docker tag demo-nextjs-app:latest <your-registry>/demo-nextjs-app:latest
docker push <your-registry>/demo-nextjs-app:latest

# Tag and push Locust image
docker tag demo-locust:latest <your-registry>/demo-locust:latest
docker push <your-registry>/demo-locust:latest
```

2. Update `helm/demo-app/values.yaml` with your image repositories and Elasticsearch configuration:
```yaml
nextjs:
  image:
    repository: <your-registry>/demo-nextjs-app
  env:
    ELASTICSEARCH_URL: "http://your-elasticsearch-cluster:9200"
    ELASTICSEARCH_USERNAME: "elastic"
    ELASTICSEARCH_PASSWORD: "your-password"

locust:
  image:
    repository: <your-registry>/demo-locust
```

3. Deploy using Helm:
```bash
helm install demo-app ./helm/demo-app -n demo-app --create-namespace
```

## Accessing the Application

After deployment, get the LoadBalancer URLs:

```bash
# Get Next.js app URL
kubectl get svc -n demo-app demo-app-nextjs -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Get Locust UI URL
kubectl get svc -n demo-app demo-app-locust -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## Load Testing

Access the Locust web UI at the LoadBalancer URL on port 8089. The load tests will:
- Search for various movie titles
- Test different search queries
- Generate and ingest new random movies
- Simulate multiple concurrent users

The Locust test includes:
- **Search tasks** (weighted 3x): Searches for predefined queries and random words
- **Movie creation task** (weighted 1x): Generates random movies with realistic data and adds them via the ingestion API

## Features

- **Full-text search**: Search movies by title, description, director, or genre
- **Dual search engine support**: Switch between Elasticsearch and OpenSearch with a simple environment variable
- **Relevance scoring**: Results are sorted by search engine relevance score
- **Fuzzy matching**: Handles typos and partial matches
- **Movie Ingestion API**: REST API endpoint to add new movies dynamically
- **Load testing**: Automated load testing with Locust
  - Searches existing movies with various queries
  - Generates and ingests random movies during load tests
- **Scalable**: Kubernetes deployment with configurable replicas

## Movie Ingestion API

The application includes a REST API endpoint for adding new movies:

### Endpoint
```
POST /api/movies
Content-Type: application/json
```

### Request Body
```json
{
  "title": "Movie Title",
  "tagline": "Movie tagline",
  "genres": ["Action", "Drama"],
  "overview": "Movie description...",
  "release_date": "2024-01-01",
  "vote_average": 7.5,
  "vote_count": 1000,
  "popularity": 85.0,
  "runtime": 120,
  "status": "Released"
}
```

### Testing the API

A test script is provided:
```bash
./test-movie-ingestion.sh
```

This will create a test movie and then search for it.

## TMDB Movie Dataset

This application now uses the TMDB Movies Dataset (930k movies) from Kaggle. To load the dataset:

### Prerequisites for TMDB Data
- Python 3.x
- pip3
- Elasticsearch or OpenSearch cluster running and accessible

### Loading TMDB Data

1. Navigate to the scripts directory:
```bash
cd nextjs-app/scripts
```

2. Run the setup script:
```bash
./setup-tmdb-data.sh
```

This script will:
- Install required Python dependencies (kagglehub, pandas, elasticsearch, python-dotenv)
- Download the TMDB dataset from Kaggle (930k movies)
- Process and load 50,000 movies into Elasticsearch for demo purposes
- Create the proper index mapping for movie fields

### Manual Setup (Alternative)

If you prefer to run the steps manually:

```bash
cd nextjs-app/scripts
pip3 install -r requirements.txt
python3 load-tmdb-data.py
```

### Movie Data Fields

The TMDB dataset includes:
- **title**: Movie title
- **tagline**: Movie tagline/slogan
- **genres**: Array of genre names
- **overview**: Movie plot summary
- **release_date**: Release date
- **vote_average**: TMDB rating (0-10)
- **vote_count**: Number of votes
- **popularity**: TMDB popularity score

## Customization

### Adjusting Dataset Size

By default, the loader imports 50,000 movies for demo purposes. To change this, edit `max_movies` parameter in `nextjs-app/scripts/load-tmdb-data.py`:

```python
total = bulk_index_movies(csv_path, max_movies=100000)  # Load 100k movies
```

### Search Field Configuration

The search functionality searches across these fields with different weights:
- title (weight: 3x)
- tagline (weight: 2x) 
- overview (weight: 2x)
- genres (weight: 1x)

Modify the search configuration in `nextjs-app/lib/elasticsearch.ts` to adjust field weights or add new searchable fields.

### Adjusting Load Test Parameters

Edit `helm/demo-app/values.yaml` to configure:
- Number of users
- Spawn rate
- Test duration
- Number of worker pods

### Scaling

Enable autoscaling in `values.yaml`:
```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

## Switching Between Elasticsearch and OpenSearch

The application supports both Elasticsearch and OpenSearch as search backends. You can switch between them using the `USE_OPENSEARCH` environment variable.

### Testing the Configuration

A test script is provided to verify your configuration:

```bash
cd nextjs-app
node test-search-client.js
```

This will test loading both clients and display your current configuration.

### Key Differences

- **Default Backend**: Elasticsearch is used by default when `USE_OPENSEARCH` is not set or is `false`
- **API Compatibility**: Both backends use the same query DSL, so no code changes are needed
- **Authentication**: Elasticsearch typically uses `elastic` as the default username, while OpenSearch uses `admin`
- **Performance**: Both backends offer similar performance characteristics for this use case

### Helm Deployment with OpenSearch

To deploy with OpenSearch support, add these environment variables to your `values.yaml`:

```yaml
nextjs:
  env:
    USE_OPENSEARCH: "true"
    OPENSEARCH_URL: "http://your-opensearch-cluster:9200"
    OPENSEARCH_USERNAME: "admin"
    OPENSEARCH_PASSWORD: "your-password"
```

## Troubleshooting

### Check pod logs
```bash
kubectl logs -n demo-app -l app.kubernetes.io/name=demo-app-nextjs
kubectl logs -n demo-app -l app.kubernetes.io/name=demo-app-locust
```

### Verify Elasticsearch connection
```bash
kubectl exec -n demo-app deployment/demo-app-nextjs -- curl $ELASTICSEARCH_URL/_cluster/health
```

## Clean Up

To remove the deployment:
```bash
helm uninstall demo-app -n demo-app
kubectl delete namespace demo-app

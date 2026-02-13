#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Use tofu if available, otherwise terraform
TF=$(command -v tofu 2>/dev/null || command -v terraform 2>/dev/null)

# Get ECR URLs from terraform/tofu output
ECR_URL=$(cd "$ROOT_DIR/tofu" && $TF output -raw ecr_repository_url 2>/dev/null)
LOCUST_ECR_URL=$(cd "$ROOT_DIR/tofu" && $TF output -raw locust_ecr_repository_url 2>/dev/null || echo "")
if [ -z "$ECR_URL" ]; then
    echo "Error: Could not get ECR URL. Run 'make apply' first."
    exit 1
fi

echo "Deploying to Kubernetes..."
echo "ECR URL: $ECR_URL"
echo "Locust ECR URL: ${LOCUST_ECR_URL:-not set}"

# Apply manifests with image substitution (elasticsearch first for namespace + StorageClass)
for file in "$ROOT_DIR/k8s/elasticsearch.yaml" "$ROOT_DIR/k8s/app.yaml"; do
    echo "Applying $file..."
    sed -e "s|IMAGE_PLACEHOLDER|$ECR_URL:latest|g" \
        "$file" | kubectl apply -f -
done

echo "Waiting for Elasticsearch to be ready..."
kubectl rollout status statefulset/elasticsearch -n movie-demo --timeout=180s || true

echo "Waiting for app deployment..."
kubectl rollout status deployment/movie-demo-app -n movie-demo --timeout=120s || true

# Deploy locust if ECR image is available
if [ -n "$LOCUST_ECR_URL" ]; then
    echo "Deploying locust load testing..."
    sed -e "s|LOCUST_IMAGE_PLACEHOLDER|$LOCUST_ECR_URL:latest|g" \
        "$ROOT_DIR/k8s/locust.yaml" | kubectl apply -f -
    kubectl rollout status deployment/locust -n movie-demo --timeout=60s || true
else
    echo "Skipping locust deployment (no ECR repo found)"
fi

# Optionally load sample data
if [ "${LOAD_SAMPLE_DATA:-false}" = "true" ]; then
    echo "Loading sample data..."
    kubectl apply -f "$ROOT_DIR/k8s/load-data-job.yaml"
    kubectl wait --for=condition=complete job/load-movies -n movie-demo --timeout=120s || true
fi

echo ""
echo "Deployment complete!"
kubectl get pods -n movie-demo
echo ""
echo "Next steps:"
echo "  make port-forward           # Access the app at http://localhost:8080"
echo "  make locust-logs            # Stream locust load test output"
echo "  make load-data              # Load sample data (local, 10 movies)"
echo "  make setup-elser            # Set up ELSER for semantic search"
echo "  make load-enriched          # Load enriched TMDB data (requires TMDB_API_KEY)"

#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

TF=$(command -v tofu 2>/dev/null || command -v terraform 2>/dev/null)

REGION=$(cd "$ROOT_DIR/tofu" && $TF output -raw region 2>/dev/null || echo "us-east-2")
APP_ECR_URL=$(cd "$ROOT_DIR/tofu" && $TF output -raw ecr_repository_url 2>/dev/null)
LOCUST_ECR_URL=$(cd "$ROOT_DIR/tofu" && $TF output -raw locust_ecr_repository_url 2>/dev/null || echo "")

if [ -z "$APP_ECR_URL" ]; then
    echo "Error: Could not get ECR URL. Run 'make apply' first."
    exit 1
fi

# Determine ECR registry for docker login (strip repo name from URL)
ECR_REGISTRY="${APP_ECR_URL%%/*}"

echo "Logging into ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Create builder if it doesn't exist
docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch

# Build app image
echo "Building app image (amd64 + arm64)..."
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag "$APP_ECR_URL:latest" \
    --push \
    "$ROOT_DIR/app"

echo "App image: $APP_ECR_URL:latest"

# Build locust image if ECR repo exists
if [ -n "$LOCUST_ECR_URL" ]; then
    echo "Building locust image (amd64 + arm64)..."
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag "$LOCUST_ECR_URL:latest" \
        --push \
        "$ROOT_DIR/locust"
    echo "Locust image: $LOCUST_ECR_URL:latest"
else
    echo "Skipping locust build (no ECR repo found — run 'make apply' to create it)"
fi

echo "Build complete!"

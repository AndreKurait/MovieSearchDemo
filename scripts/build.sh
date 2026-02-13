#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

TF=$(command -v tofu 2>/dev/null || command -v terraform 2>/dev/null)

REGION=$(cd "$ROOT_DIR/tofu" && $TF output -raw region 2>/dev/null || echo "us-east-2")
ECR_URL=$(cd "$ROOT_DIR/tofu" && $TF output -raw ecr_repository_url 2>/dev/null)

if [ -z "$ECR_URL" ]; then
    echo "Error: Could not get ECR URL. Run 'make apply' first."
    exit 1
fi

echo "Logging into ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_URL"

echo "Building multi-arch image (amd64 + arm64)..."
cd "$ROOT_DIR/app"

# Create builder if it doesn't exist
docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch

# Build and push for both architectures
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag "$ECR_URL:latest" \
    --push \
    .

echo "Build complete!"
echo "Image: $ECR_URL:latest (amd64 + arm64)"

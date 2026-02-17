.PHONY: init plan apply destroy build deploy kubeconfig port-forward deploy-locust locust-logs stop-locust setup-elser load-enriched create-tmdb-secret clean all

TF := $(shell command -v tofu 2>/dev/null || command -v terraform 2>/dev/null)

# Infrastructure
init:
	cd tofu && $(TF) init

plan:
	cd tofu && $(TF) plan

apply:
	cd tofu && $(TF) apply -auto-approve

destroy:
	cd tofu && $(TF) destroy -auto-approve

# Kubernetes
kubeconfig:
	$$(cd tofu && $(TF) output -raw configure_kubectl)

# Build and deploy
build:
	./scripts/build.sh

deploy:
	./scripts/deploy.sh

# Semantic search (ELSER) setup
setup-elser:
	kubectl apply -f k8s/setup-elser-job.yaml
	@echo "Waiting for ELSER setup job to complete (~5 min)..."
	kubectl wait --for=condition=complete job/setup-elser -n movie-demo --timeout=600s || \
		(echo "Check progress: kubectl logs job/setup-elser -n movie-demo -f" && exit 1)

# TMDB data loading (requires tmdb-api-key secret)
create-tmdb-secret:
	@if [ -z "$$TMDB_API_KEY" ]; then echo "Error: TMDB_API_KEY env var not set"; exit 1; fi
	kubectl create secret generic tmdb-api-key --from-literal=api-key=$$TMDB_API_KEY -n movie-demo --dry-run=client -o yaml | kubectl apply -f -

load-enriched: create-tmdb-secret
	kubectl delete job load-enriched-movies -n movie-demo --ignore-not-found
	kubectl apply -f k8s/load-enriched-job.yaml
	@echo "Enriched load job started. Monitor: kubectl logs job/load-enriched-movies -n movie-demo -f"

# Access
port-forward:
	@echo "App: http://localhost:8080"
	kubectl port-forward svc/movie-demo-app -n movie-demo 8080:80

# Locust load testing
deploy-locust:
	@LOCUST_ECR_URL=$$(cd tofu && $(TF) output -raw locust_ecr_repository_url 2>/dev/null); \
	if [ -z "$$LOCUST_ECR_URL" ]; then echo "Error: No locust ECR repo. Run 'make apply' first."; exit 1; fi; \
	sed -e "s|LOCUST_IMAGE_PLACEHOLDER|$$LOCUST_ECR_URL:latest|g" k8s/locust.yaml | kubectl apply -f -
	kubectl rollout status deployment/locust -n movie-demo --timeout=60s

locust-logs:
	kubectl logs -f -n movie-demo -l app=locust

stop-locust:
	kubectl delete deployment locust -n movie-demo --ignore-not-found

# Cleanup
clean:
	rm -rf tofu/.terraform* tofu/*.tfstate* tofu/tfplan

# Full deployment
all: init apply kubeconfig build deploy
	@echo "Done! Run 'make port-forward' to access the app"

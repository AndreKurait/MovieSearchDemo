.PHONY: require-tf init plan apply destroy build deploy kubeconfig port-forward deploy-locust locust-logs stop-locust setup-elser load-movies clean check all
.DEFAULT_GOAL := init

TF ?= $(shell command -v tofu 2>/dev/null || command -v terraform 2>/dev/null)
BACKEND_CONFIG ?= backend.hcl

require-tf:
	@test -n "$(TF)" || { echo "Install OpenTofu or Terraform, or set TF to its executable."; exit 1; }

# Infrastructure
init: require-tf
	@test -f "tofu/$(BACKEND_CONFIG)" || { echo "Copy tofu/backend.hcl.example to tofu/$(BACKEND_CONFIG) and configure your own state backend first."; exit 1; }
	cd tofu && $(TF) init -backend-config="$(BACKEND_CONFIG)"

plan: require-tf
	cd tofu && $(TF) plan

apply: require-tf
	cd tofu && $(TF) apply

destroy: require-tf
	cd tofu && $(TF) destroy

# Kubernetes
kubeconfig: require-tf
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

# Load real TMDB movies (requires TMDB_API_KEY env var)
load-movies:
	@if [ -z "$$TMDB_API_KEY" ]; then echo "Error: Set TMDB_API_KEY first (free at https://www.themoviedb.org/settings/api)"; exit 1; fi
	kubectl create secret generic tmdb-api-key --from-literal=api-key=$$TMDB_API_KEY -n movie-demo --dry-run=client -o yaml | kubectl apply -f -
	kubectl delete job load-movies -n movie-demo --ignore-not-found
	kubectl apply -f k8s/load-movies-job.yaml
	@echo "Loading movies... Monitor: kubectl logs -f job/load-movies -n movie-demo"

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
	rm -rf app/.next tofu/.terraform tofu/tfplan

# Checks that do not provision infrastructure or contact a search cluster.
check:
	python3 -m unittest discover -s tests -v
	bash -n scripts/build.sh scripts/deploy.sh scripts/load-data.sh
	cd app && npm run typecheck

# Full deployment
all: init
	$(MAKE) apply
	$(MAKE) kubeconfig
	$(MAKE) build
	$(MAKE) deploy
	@echo "Done! Run 'make port-forward' to access the app"

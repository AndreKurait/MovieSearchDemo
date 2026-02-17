variable "name" {
  description = "Name for the cluster and resources"
  type        = string
  default     = "movie-demo"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "eks_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.31"
}

# Elasticsearch configuration
variable "es_version" {
  description = "Elasticsearch Docker image tag"
  type        = string
  default     = "8.19.11"
}

variable "es_replicas" {
  description = "Number of Elasticsearch StatefulSet replicas"
  type        = number
  default     = 3
}

variable "es_storage_size" {
  description = "PVC storage size per ES node"
  type        = string
  default     = "500Gi"
}

variable "es_cpu" {
  description = "CPU requests and limits per ES pod"
  type        = string
  default     = "30"
}

variable "es_memory" {
  description = "Memory requests and limits per ES pod"
  type        = string
  default     = "58Gi"
}

variable "es_heap" {
  description = "ES JVM heap size (should be ~50% of es_memory)"
  type        = string
  default     = "29g"
}

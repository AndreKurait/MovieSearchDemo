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

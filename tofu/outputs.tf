output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "configure_kubectl" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "region" {
  description = "AWS region"
  value       = var.region
}

output "es_snapshots_bucket" {
  description = "S3 bucket for Elasticsearch snapshots"
  value       = aws_s3_bucket.es_snapshots.id
}

output "es_iam_role_arn" {
  description = "IAM role ARN for Elasticsearch IRSA"
  value       = aws_iam_role.elasticsearch.arn
}

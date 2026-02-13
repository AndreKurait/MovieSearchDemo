# S3 bucket for Elasticsearch snapshots
resource "aws_s3_bucket" "es_snapshots" {
  bucket        = "${var.name}-es-snapshots-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "es_snapshots" {
  bucket = aws_s3_bucket.es_snapshots.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "es_snapshots" {
  bucket = aws_s3_bucket.es_snapshots.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM role for Elasticsearch pods (EKS Pod Identity)
data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "es_assume_role" {
  # EKS Pod Identity trust
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole", "sts:TagSession"]

    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "elasticsearch" {
  name               = "${var.name}-elasticsearch"
  assume_role_policy = data.aws_iam_policy_document.es_assume_role.json
}

resource "aws_eks_pod_identity_association" "elasticsearch" {
  cluster_name    = module.eks.cluster_name
  namespace       = var.name
  service_account = "elasticsearch"
  role_arn        = aws_iam_role.elasticsearch.arn
}

# S3 access for all buckets
data "aws_iam_policy_document" "es_s3_access" {
  statement {
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
      "s3:ListBucketMultipartUploads",
      "s3:ListBucketVersions",
    ]
    resources = ["arn:aws:s3:::*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts",
    ]
    resources = ["arn:aws:s3:::*/*"]
  }
}

resource "aws_iam_policy" "es_s3_access" {
  name   = "${var.name}-es-s3-access"
  policy = data.aws_iam_policy_document.es_s3_access.json
}

resource "aws_iam_role_policy_attachment" "es_s3_access" {
  role       = aws_iam_role.elasticsearch.name
  policy_arn = aws_iam_policy.es_s3_access.arn
}

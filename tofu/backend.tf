terraform {
  backend "s3" {
    bucket         = "movie-demo-tofu-state-287951776178"
    key            = "movie-demo/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "movie-demo-tofu-lock"
    encrypt        = true
  }
}

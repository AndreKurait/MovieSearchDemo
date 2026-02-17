terraform {
  backend "s3" {
    bucket         = "movie-demo-tofu-state-767398060394"
    key            = "movie-demo/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "movie-demo-tofu-lock"
    encrypt        = true
  }
}

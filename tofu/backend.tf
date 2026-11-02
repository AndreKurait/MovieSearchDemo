terraform {
  backend "s3" {
    # Supply your own values with: make init BACKEND_CONFIG=backend.hcl
    # See backend.hcl.example. Credentials come from the AWS credential chain.
  }
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Add modules here following the project requirements
# module "backend" {
#   source = "./modules/backend"
# }

# module "frontend" {
#   source = "./modules/frontend"
# }

# module "database" {
#   source = "./modules/database"
# }

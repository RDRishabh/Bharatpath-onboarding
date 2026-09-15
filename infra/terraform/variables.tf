variable "aws_region" {
  description = "Mumbai. The data-residency question (plan.md N2) is still open, so the default keeps everything in India until the client answers."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name; used as a suffix so dev and prod can coexist in one account."
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Prefix for every resource name."
  type        = string
  default     = "bharatpath"
}

variable "callback_urls" {
  description = "OAuth redirect targets for the hosted UI. Expo dev client and localhost during the sprint."
  type        = list(string)
  default = [
    "http://localhost:8099/api/v1/auth/callback",
    "http://localhost:19006/",
    "bharatpath://auth/callback",
  ]
}

variable "logout_urls" {
  type    = list(string)
  default = ["http://localhost:19006/", "bharatpath://auth/logout"]
}

variable "scoring_model_ids" {
  description = "Bedrock inference-profile ids the backend may invoke to read CVs. The four offered to the client on 2026-09-13; narrow to the one chosen."
  type        = list(string)
  default = [
    "global.anthropic.claude-sonnet-4-6",
    "global.anthropic.claude-haiku-4-5-20251001-v1:0",
    "global.anthropic.claude-sonnet-5",
    "in.openai.gpt-5.6-luna",
  ]
}

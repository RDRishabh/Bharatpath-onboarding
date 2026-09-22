variable "aws_region" {
  description = "Mumbai, matching the main module. State lives where the resources it describes live."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  type    = string
  default = "bharatpath"
}

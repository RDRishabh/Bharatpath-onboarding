# The network, and why there is so little of it.
#
#                       Internet
#                          |
#                    Elastic IP (one public IPv4, ~$3.65/month)
#                          | 80, 443 open; 22 from ssh_allowed_cidrs only
#   +----------------------+----------------------------------------------+
#   | default VPC (172.31.0.0/16), ap-south-1                              |
#   |                                                                      |
#   |  EC2 host  -- sg "app" -->  RDS Postgres  (sg "db": 5432 from "app") |
#   |  caddy, api, worker,        no public IP, publicly_accessible=false  |
#   |  beat, redis                                                         |
#   +----------------------------------------------------------------------+
#        | outbound only, over the internet gateway
#        v
#   S3, SQS, Cognito, SES, Secrets Manager, OpenAI, Sarvam
#
# **The default VPC, deliberately.** Its subnets route to an internet gateway,
# so they are "public" subnets, and that is fine for the database: what keeps
# RDS off the internet is that it has no public IP (`publicly_accessible =
# false`) and that its security group admits 5432 from the host's security
# group and nothing else. Two independent things would both have to be wrong.
#
# **No private subnets and no NAT gateway.** A database in a private subnet is
# the production shape, and the moment anything *else* moves into one it needs
# a NAT gateway to reach S3, SQS and the model providers -- about $32/month,
# more than the host and the database together. The migration is
# `docs/aws-deployment.md` section 7.
#
# Host and database share one availability zone. Cross-AZ traffic is billed
# per GB and adds a millisecond to every query; a single-AZ deployment gains
# nothing from spreading two boxes across zones.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "primary" {
  vpc_id            = data.aws_vpc.default.id
  availability_zone = var.primary_availability_zone
  default_for_az    = true
}

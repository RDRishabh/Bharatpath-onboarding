# Template for deploy.auto.tfvars (gitignored), which Terraform loads by
# itself. Copy, fill in, and keep the copy out of git. docs/aws-deployment.md.
deploy_ec2          = true
deploy_rds          = true # Postgres on RDS, with backups; false keeps the container
data_volume_size_gb = 5    # 20+ if Postgres runs on the host (deploy_rds = false)

api_domain        = "bharatpath-api.duckdns.org" # A record -> terraform output app_public_ip
ssh_allowed_cidrs = ["203.0.113.4/32"]           # curl -s https://checkip.amazonaws.com
ssh_public_key    = "ssh-ed25519 AAAA... you@laptop"

budget_alert_email = "alerts@example.com"
budget_monthly_usd = 45

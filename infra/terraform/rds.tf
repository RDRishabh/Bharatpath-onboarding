# Managed Postgres (2026-10-01), behind `var.deploy_rds`.
#
# The single-host deployment kept Postgres in a container on an EBS volume
# with no backups (docs/aws-deployment.md section 1.3). This is the first step
# of the section 7 migration, taken on its own because it is the one that
# matters: the database is the only thing on the host that cannot be rebuilt.
#
# What RDS gives that the container did not:
#   * a daily snapshot, kept `rds_backup_retention_days`, and point-in-time
#     restore to any second in that window;
#   * minor-version patching in a maintenance window, not by hand;
#   * storage that grows before it fills.
#
# What it does not change: Single-AZ, so an AZ outage is still downtime (Multi-
# AZ doubles the instance bill). Redis stays on the host; losing it costs the
# membership cache and the rate-limit counters, both of which refill.
#
# ---------------------------------------------------------------------------
# The three database roles still apply, unchanged
# ---------------------------------------------------------------------------
# RDS has no true superuser. The master user (`bharatpath_master`) has
# CREATEROLE and is a member of rds_superuser -- it does NOT hold BYPASSRLS
# itself, yet RDS lets it create roles that do (checked 2026-10-01). That is
# enough for `bharatpath_migrator`, `bharatpath_app` and `bharatpath_admin`
# from backend/scripts/init_db_roles.sql -- see deploy/init_rds.sh. **The app
# never connects as the master user**: it owns the database, and RLS does
# nothing against an owner.

locals {
  deploy_db = var.deploy_rds ? 1 : 0
}

resource "aws_db_subnet_group" "db" {
  count       = local.deploy_db
  name        = "${var.project}-${var.environment}"
  description = "Default VPC subnets. RDS requires two AZs here even for a Single-AZ instance."
  subnet_ids  = data.aws_subnets.default.ids
}

resource "aws_security_group" "db" {
  count       = local.deploy_db
  name        = "${var.project}-db-${var.environment}"
  description = "BharatPath Postgres: 5432 from the app host security group, nothing else."
  vpc_id      = data.aws_vpc.default.id

  # No inline rules: the one ingress rule is a separate resource below, so it
  # can exist only while the host does. No egress either -- a database
  # answers connections, it never opens them.
}

# By security group, not by CIDR. The default VPC is 172.31.0.0/16 and
# anything launched into it later would match a CIDR rule; only the host
# carries this group.
resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  count                        = var.deploy_rds && var.deploy_ec2 ? 1 : 0
  security_group_id            = aws_security_group.db[0].id
  referenced_security_group_id = aws_security_group.app[0].id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "Postgres from the app host"
}

resource "aws_db_instance" "main" {
  count      = local.deploy_db
  identifier = "${var.project}-${var.environment}"

  engine         = "postgres"
  engine_version = "16" # matches docker-compose and CI; RDS picks the minor
  instance_class = var.rds_instance_class

  db_name  = "bharatpath"
  username = "bharatpath_master"
  # RDS generates the password and keeps it in its own Secrets Manager
  # secret, so it never passes through a variable or lands in state.
  # deploy/init_rds.sh reads it once, to create the three roles.
  manage_master_user_password = true

  allocated_storage     = var.rds_allocated_storage_gb
  max_allocated_storage = var.rds_max_allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true

  availability_zone      = var.primary_availability_zone
  db_subnet_group_name   = aws_db_subnet_group.db[0].name
  vpc_security_group_ids = [aws_security_group.db[0].id]
  publicly_accessible    = false
  multi_az               = false

  # TLS is forced by the default parameter group (`rds.force_ssl = 1` from
  # PostgreSQL 15), and the app verifies the certificate (DATABASE_SSL_ROOT_CERT).

  backup_retention_period = var.rds_backup_retention_days
  backup_window           = "20:30-21:00" # UTC = 02:00-02:30 IST
  maintenance_window      = "sun:21:30-sun:22:30"
  copy_tags_to_snapshot   = true

  auto_minor_version_upgrade = true
  apply_immediately          = false

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project}-${var.environment}-final"

  lifecycle {
    prevent_destroy = true
    # RDS moves the minor version itself in the maintenance window.
    ignore_changes = [engine_version]
  }
}

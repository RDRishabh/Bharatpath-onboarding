#!/bin/bash
# First boot of the BharatPath test host. Runs once, as root, before anyone
# logs in. Amazon Linux 2023.
#
# **This script prepares the machine and deliberately starts nothing.** It
# installs Docker, mounts the data volume and lays out /opt/bharatpath -- and
# then stops, because starting the stack needs two things it does not have:
# the compose file and the environment file, both of which carry values that
# must not be baked into an AMI or a Terraform template (database password,
# API keys, Cognito ids).
#
# `docs/aws-deployment.md` is the other half. Deploy is:
#
#     scp deploy/docker-compose.prod.yml  ec2-user@HOST:/opt/bharatpath/
#     scp backend/.env.aws                ec2-user@HOST:/opt/bharatpath/.env
#     ssh ec2-user@HOST 'cd /opt/bharatpath && docker compose up -d'
#
# Anything this script writes is recoverable by re-running it; nothing it
# writes is a secret.

set -euxo pipefail

exec > >(tee /var/log/bharatpath-bootstrap.log) 2>&1
echo "=== BharatPath host bootstrap: $(date -Is) ==="

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------
dnf update -y
dnf install -y docker git

# The compose *plugin* (`docker compose`), not the old standalone
# `docker-compose` binary. AL2023 does not package it, so it is installed by
# hand into the plugin directory where Docker looks for it.
COMPOSE_VERSION="v2.32.4"
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

systemctl enable --now docker
usermod -aG docker ec2-user

# ---------------------------------------------------------------------------
# The data volume
# ---------------------------------------------------------------------------
# Postgres's data directory lives on a separate EBS volume so that replacing
# the instance does not destroy the database.
#
# **Formatting is conditional and must stay that way.** `mkfs` on a volume
# that already holds the database would destroy it silently, and this script
# re-runs on any rebuild. `blkid` succeeding means there is already a
# filesystem here, which means there is already data.
DEVICE=""
for candidate in /dev/nvme1n1 /dev/sdf /dev/xvdf; do
  if [ -b "$candidate" ]; then DEVICE="$candidate"; break; fi
done

if [ -n "$DEVICE" ]; then
  if ! blkid "$DEVICE" >/dev/null 2>&1; then
    echo "no filesystem on $DEVICE - creating one (first boot)"
    mkfs -t xfs "$DEVICE"
  else
    echo "$DEVICE already has a filesystem - leaving it alone"
  fi

  mkdir -p /mnt/data
  # By UUID, not device name: NVMe device numbering is not stable across
  # reboots, so an fstab entry naming /dev/nvme1n1 can mount the wrong volume.
  UUID=$(blkid -s UUID -o value "$DEVICE")
  if ! grep -q "$UUID" /etc/fstab; then
    # `nofail` so that a missing volume leaves the host bootable and
    # diagnosable rather than dropping it into emergency mode.
    echo "UUID=$UUID /mnt/data xfs defaults,nofail 0 2" >> /etc/fstab
  fi
  mount -a
else
  echo "WARNING: no data volume found; Postgres will use the root volume." >&2
  mkdir -p /mnt/data
fi

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
mkdir -p /opt/bharatpath
mkdir -p /mnt/data/postgres        # database files
mkdir -p /mnt/data/redis           # Redis append-only file
mkdir -p /mnt/data/celerybeat      # beat's last-run state (settings.celery_beat_schedule_path)
mkdir -p /mnt/data/caddy           # issued TLS certificates
chown -R ec2-user:ec2-user /opt/bharatpath /mnt/data

# Docker's logs are the only logs here and they grow without limit by
# default, which fills a 30 GiB root volume and stops the host.
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" }
}
JSON
systemctl restart docker

# Bring the stack back up after a reboot, but only once somebody has put a
# compose file there. Without the guard this unit fails on every boot of a
# freshly built host and buries the real errors.
cat > /etc/systemd/system/bharatpath.service <<'UNIT'
[Unit]
Description=BharatPath (docker compose)
Requires=docker.service
After=docker.service network-online.target
ConditionPathExists=/opt/bharatpath/docker-compose.prod.yml

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/bharatpath
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable bharatpath.service

echo "=== bootstrap complete: $(date -Is) ==="
echo "Next: copy docker-compose.prod.yml and .env into /opt/bharatpath, then"
echo "      sudo systemctl start bharatpath"

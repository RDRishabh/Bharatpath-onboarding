#!/usr/bin/env bash
# Create the three database roles on RDS and write their passwords into .env.
#
# Run ON THE HOST, from /opt/bharatpath, with the RDS master secret on stdin.
# From your machine:
#
#   ARN=$(terraform -chdir=infra/terraform output -raw rds_master_secret_arn)
#   aws secretsmanager get-secret-value --secret-id "$ARN" \
#       --query SecretString --output text \
#     | ssh ec2-user@HOST 'bash /opt/bharatpath/init_rds.sh'
#
# The master password crosses the SSH connection on stdin and is never
# written to disk or put on a command line. The host's instance role is
# deliberately NOT allowed to read that secret: the app never needs the
# master user, so it never gets a way to it.
#
# ---------------------------------------------------------------------------
# What this does, and why it is not simply the two init files
# ---------------------------------------------------------------------------
# The container runs backend/scripts/init_db_{extensions,roles}.sql once, as
# a real superuser. RDS has no superuser: the master user has CREATEROLE and
# is a member of rds_superuser, which RDS lets create BYPASSRLS roles though
# the master holds no BYPASSRLS itself. That is enough for both files with
# two additions, made here first:
#
#   1. The master must be a MEMBER of bharatpath_migrator to hand it the
#      public schema and to set its default privileges. A superuser skips
#      that check; PostgreSQL 16 gives a role's creator only ADMIN OPTION.
#   2. A new schema owner needs CREATE on the database. Same reason.
#
# The roles are created here, with random passwords, before the roles file
# runs -- its CREATE blocks then find them and skip, and its passwords
# (equal to the role names) never exist on this database at all.
#
# **Re-running is safe and rotates the three passwords**, rewriting .env to
# match. Restart the stack afterwards: `docker compose ... up -d`.
set -euo pipefail

cd /opt/bharatpath

ENV_FILE=.env
[ -f "$ENV_FILE" ] || { echo "no $ENV_FILE in $(pwd) - write it first (docs/aws-deployment.md)" >&2; exit 1; }
[ -f init/init_db_roles.sql ] && [ -f init/init_db_extensions.sql ] \
  || { echo "copy backend/scripts/init_db_{roles,extensions}.sql into $(pwd)/init first" >&2; exit 1; }

SECRET_JSON=$(cat)
MASTER_USER=$(printf '%s' "$SECRET_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["username"])')
export PGPASSWORD
PGPASSWORD=$(printf '%s' "$SECRET_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["password"])')
unset SECRET_JSON

# The RDS hostname, from the URL Terraform wrote into .env.
DB_HOST=$(sed -n 's#^DATABASE_URL=postgresql+asyncpg://[^@]*@\([^:/]*\).*#\1#p' "$ENV_FILE")
case "$DB_HOST" in
  *.rds.amazonaws.com) ;;
  *) echo "DATABASE_URL in $ENV_FILE does not name an RDS host (got '$DB_HOST')" >&2; exit 1 ;;
esac

# Verify the server: the master password is about to cross this connection.
curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o rds-ca.pem

# Hex, so they need no escaping in a URL or in SQL.
PW_MIGRATOR=$(openssl rand -hex 24)
PW_APP=$(openssl rand -hex 24)
PW_ADMIN=$(openssl rand -hex 24)

psql_master() {
  docker run --rm -i --network host -e PGPASSWORD \
    -v "$(pwd)/init:/init:ro" -v "$(pwd)/rds-ca.pem:/rds-ca.pem:ro" \
    postgres:16 psql -X -q -v ON_ERROR_STOP=1 \
    "host=$DB_HOST port=5432 dbname=bharatpath user=$MASTER_USER sslmode=verify-full sslrootcert=/rds-ca.pem" "$@"
}

echo "creating roles on $DB_HOST as $MASTER_USER"
psql_master <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bharatpath_migrator') THEN
    CREATE ROLE bharatpath_migrator LOGIN BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bharatpath_app') THEN
    CREATE ROLE bharatpath_app LOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bharatpath_admin') THEN
    CREATE ROLE bharatpath_admin LOGIN BYPASSRLS;
  END IF;
END \$\$;

ALTER ROLE bharatpath_migrator PASSWORD '$PW_MIGRATOR';
ALTER ROLE bharatpath_app      PASSWORD '$PW_APP';
ALTER ROLE bharatpath_admin    PASSWORD '$PW_ADMIN';

GRANT bharatpath_migrator TO CURRENT_USER;
GRANT CREATE ON DATABASE bharatpath TO bharatpath_migrator;

\i /init/init_db_extensions.sql
\i /init/init_db_roles.sql
SQL

# Prove the property that matters before anything connects: the app role is
# subject to RLS, owns nothing, and the two bypass roles really bypass.
echo "checking role attributes"
psql_master -At <<'SQL'
SELECT rolname || ' bypassrls=' || rolbypassrls || ' super=' || rolsuper
  FROM pg_roles WHERE rolname LIKE 'bharatpath\_%' ORDER BY rolname;
SELECT CASE WHEN rolbypassrls THEN 'FAIL: bharatpath_app has BYPASSRLS' ELSE 'ok: app role is subject to RLS' END
  FROM pg_roles WHERE rolname = 'bharatpath_app';
SELECT 'schema public owner: ' || pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'public';
SQL

# Write the passwords into the three URLs, whatever they held before.
umask 077
sed -e "s#^\(DATABASE_URL=postgresql+asyncpg://bharatpath_app:\)[^@]*@#\1$PW_APP@#" \
    -e "s#^\(DATABASE_URL_MIGRATOR=postgresql+asyncpg://bharatpath_migrator:\)[^@]*@#\1$PW_MIGRATOR@#" \
    -e "s#^\(DATABASE_ADMIN_URL=postgresql+asyncpg://bharatpath_admin:\)[^@]*@#\1$PW_ADMIN@#" \
    "$ENV_FILE" > "$ENV_FILE.new"
mv "$ENV_FILE.new" "$ENV_FILE"

if grep -q '<SET_BY_INIT_RDS>' "$ENV_FILE"; then
  echo "WARNING: a DATABASE_*URL line still holds <SET_BY_INIT_RDS>; check $ENV_FILE" >&2
  exit 1
fi
echo "done: passwords written to $(pwd)/$ENV_FILE"

#!/bin/sh
# Bootstraps Django container with migrations and seed data.
set -e

if [ "${USE_SQLITE:-True}" != "True" ]; then
  echo "Waiting for PostgreSQL at ${DATABASE_HOST:-db}:${DATABASE_PORT:-5432}..."
  python - <<'PY'
import os
import socket
import time

host = os.getenv("DATABASE_HOST", "db")
port = int(os.getenv("DATABASE_PORT", "5432"))

for _ in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            print("PostgreSQL is reachable.")
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit("PostgreSQL is not reachable.")
PY
fi

python manage.py migrate --noinput
python manage.py seed_data

exec "$@"

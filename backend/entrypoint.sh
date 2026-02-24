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
python manage.py collectstatic --noinput
python manage.py seed_data --reset

if [ "${CREATE_SUPERUSER:-True}" = "True" ]; then
  python - <<'PY'
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

import django
django.setup()

from django.contrib.auth import get_user_model

username = os.getenv("DJANGO_SUPERUSER_USERNAME", "admin@calmtable.mw")
email = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@calmtable.mw")
password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "password123")

User = get_user_model()

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"Created superuser: {username} ({email})")
else:
    print(f"Superuser already exists: {username}")
PY
fi

exec "$@"

#!/bin/sh
# Railway (unlike Render) has no secret-file mounts — accept the JWT signing keys as
# env vars and materialize them where application.properties expects files.
set -e
if [ -n "$JWT_PRIVATE_KEY_PEM" ] || [ -n "$JWT_PUBLIC_KEY_PEM" ]; then
  mkdir -p /app/.secrets
  [ -n "$JWT_PRIVATE_KEY_PEM" ] && printf '%s\n' "$JWT_PRIVATE_KEY_PEM" > /app/.secrets/private.pem
  [ -n "$JWT_PUBLIC_KEY_PEM" ] && printf '%s\n' "$JWT_PUBLIC_KEY_PEM" > /app/.secrets/public.pem
  chmod 600 /app/.secrets/*.pem
fi
exec java -jar /app/app.jar

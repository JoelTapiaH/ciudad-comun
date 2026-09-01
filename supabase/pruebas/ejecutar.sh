#!/usr/bin/env bash
# Ejecuta el esquema y su batería de pruebas en un Postgres desechable.
# Requiere postgresql instalado en local (brew install postgresql@16).
# No toca tu proyecto de Supabase: monta un clúster temporal y lo tira al salir.
set -euo pipefail

PGBIN="${PGBIN:-$(dirname "$(command -v postgres)")}"
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
DATOS="$(mktemp -d)/datos"
# El socket unix no admite rutas largas (máximo 103 bytes), por eso va en /tmp.
SOCKET="$(mktemp -d /tmp/ciudad-pg.XXXXXX)"
PUERTO=54399

limpiar() {
  "$PGBIN/pg_ctl" -D "$DATOS" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$DATOS" "$SOCKET"
}
trap limpiar EXIT

export LC_ALL=C LANG=C
"$PGBIN/initdb" -D "$DATOS" -U postgres --no-locale -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$DATOS" -o "-p $PUERTO -k $SOCKET -c listen_addresses=''" -w start >/dev/null
"$PGBIN/psql" -U postgres -p "$PUERTO" -h "$SOCKET" -d postgres -qc "create database ciudad;"

psql_ciudad() {
  "$PGBIN/psql" -U postgres -p "$PUERTO" -h "$SOCKET" -d ciudad -v ON_ERROR_STOP=1 "$@"
}

psql_ciudad -q -f "$RAIZ/supabase/pruebas/stub-supabase.sql" 2>/dev/null
psql_ciudad -q -f "$RAIZ/supabase/schema.sql" >/dev/null 2>&1
SALIDA="$(psql_ciudad -f "$RAIZ/supabase/pruebas/pruebas.sql" 2>&1 || true)"
echo "$SALIDA" | grep -E "OK |FALLA|ERROR|---" | sed -E 's/^psql:.*:[0-9]+: //; s/^(NOTICE|WARNING):  ?//'

echo
if echo "$SALIDA" | grep -qE "FALLA|ERROR"; then
  echo "Hay comprobaciones que fallan."
  exit 1
fi
echo "Todo en verde: $(echo "$SALIDA" | grep -c 'OK ') comprobaciones."

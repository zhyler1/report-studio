#!/usr/bin/env bash
# Respaldo de la base y los medios, conserva los últimos 14. Uso: scripts/backup.sh [carpeta_datos] [carpeta_respaldos]
set -euo pipefail
D="${1:-data}"; B="${2:-backups}"; mkdir -p "$B"; T="$B/rs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$T"
if [ -f "$D/report_studio.db" ]; then sqlite3 "$D/report_studio.db" ".backup '$T/report_studio.db'"; fi
[ -d "$D/media" ] && tar -czf "$T/media.tgz" -C "$D" media
ls -1dt "$B"/rs-* | tail -n +15 | xargs -r rm -rf
echo "Respaldo en $T"

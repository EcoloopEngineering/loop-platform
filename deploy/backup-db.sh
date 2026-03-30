#!/bin/bash
# Daily PostgreSQL backup to local disk
set -euo pipefail

BACKUP_DIR=/home/ubuntu/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

PGPASSWORD='LoopDev2026!Secure' pg_dump -h localhost -U loop loop_platform | gzip > "$BACKUP_DIR/loop_platform_$DATE.sql.gz"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: loop_platform_$DATE.sql.gz"

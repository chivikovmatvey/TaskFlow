#!/bin/bash
set -e

# Ищем sqlcmd (путь отличается в 2019 и 2022 образах)
if [ -f /opt/mssql-tools18/bin/sqlcmd ]; then
    SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
    TRUST_CERT="-C"
elif [ -f /opt/mssql-tools/bin/sqlcmd ]; then
    SQLCMD="/opt/mssql-tools/bin/sqlcmd"
    TRUST_CERT=""
else
    echo "❌ sqlcmd not found"
    exit 1
fi

echo "⏳ Ожидаем SQL Server на ${DB_SERVER}:1433..."
for i in $(seq 1 40); do
    $SQLCMD -S "${DB_SERVER},1433" -U sa -P "${DB_PASSWORD}" $TRUST_CERT -Q "SELECT 1" 2>/dev/null \
        && echo "✅ SQL Server готов!" && break
    echo "  Попытка $i/40 — не готов, ждём 5с..."
    sleep 5
    if [ "$i" -eq 40 ]; then
        echo "❌ SQL Server не поднялся за отведённое время"
        exit 1
    fi
done

echo "📦 Применяем схему..."
$SQLCMD -S "${DB_SERVER},1433" -U sa -P "${DB_PASSWORD}" $TRUST_CERT -i /sql/schema.sql

echo "🔄 Применяем миграции..."
for f in \
    /sql/migration_auth_teams.sql \
    /sql/migration_blob_storage.sql \
    /sql/migration_sections.sql \
    /sql/migration_telegram.sql; do
    if [ -f "$f" ]; then
        echo "  → $(basename $f)"
        $SQLCMD -S "${DB_SERVER},1433" -U sa -P "${DB_PASSWORD}" $TRUST_CERT -i "$f"
    fi
done

echo "✅ Инициализация БД завершена!"

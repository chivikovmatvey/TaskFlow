#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5000"
BROWSER_WAIT=5

# ── цвета ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── очистка при выходе ───────────────────────────────────────────
cleanup() {
  echo ""
  info "Остановка процессов..."
  [[ -n $BACKEND_PID  ]] && kill "$BACKEND_PID"  2>/dev/null
  [[ -n $FRONTEND_PID ]] && kill "$FRONTEND_PID" 2>/dev/null
  info "Готово."
}
trap cleanup EXIT INT TERM

# ── 1. Docker-контейнер SQL Server ───────────────────────────────
info "Проверка контейнера sqlserver..."
if ! docker ps --format '{{.Names}}' | grep -q '^sqlserver$'; then
  if docker ps -a --format '{{.Names}}' | grep -q '^sqlserver$'; then
    info "Запуск контейнера sqlserver..."
    docker start sqlserver
    ok "Контейнер sqlserver запущен"
  else
    error "Контейнер sqlserver не найден"
    exit 1
  fi
else
  ok "Контейнер sqlserver уже работает"
fi

info "Ожидание готовности SQL Server (порт 1433)..."
for i in $(seq 1 60); do
  if (echo > /dev/tcp/127.0.0.1/1433) 2>/dev/null; then
    ok "SQL Server принимает соединения"
    break
  fi
  sleep 1
  if [[ $i -eq 60 ]]; then
    error "SQL Server не ответил на порту 1433 за 60 секунд"
    exit 1
  fi
done

# ── 2. Установка зависимостей (только если node_modules отсутствует) ──
if [[ ! -d "$ROOT/taskflow-backend/node_modules" ]]; then
  info "Установка зависимости бэкенда..."
  npm install --prefix "$ROOT/taskflow-backend" --silent
fi
if [[ ! -d "$ROOT/taskflow-frontend/node_modules" ]]; then
  info "Устанока зависимости фронтенда..."
  npm install --prefix "$ROOT/taskflow-frontend" --silent
fi

# ── 3. Бэкенд ───────────────────────────────────────────────────
info "Запуск бэкенда..."
npm run dev --prefix "$ROOT/taskflow-backend" > /tmp/taskflow-backend.log 2>&1 &
BACKEND_PID=$!

info "Ожидание готовности бэкенда..."
for i in $(seq 1 30); do
  if curl -sf "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    ok "Бэкенд готов ($BACKEND_URL)"
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    error "Бэкенд не поднялся за 30 секунд. Лог:"
    tail -20 /tmp/taskflow-backend.log
    exit 1
  fi
done

# ── 4. Фронтенд ──────────────────────────────────────────────────
info "Запуск фронтенда..."
npm run dev --prefix "$ROOT/taskflow-frontend" > /tmp/taskflow-frontend.log 2>&1 &
FRONTEND_PID=$!

info "Ожидание готовности фронтенда..."
for i in $(seq 1 30); do
  if curl -sf "$FRONTEND_URL" > /dev/null 2>&1; then
    ok "Фронтенд готов ($FRONTEND_URL)"
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    error "Фронтенд не поднялся за 30 секунд. Лог:"
    tail -20 /tmp/taskflow-frontend.log
    exit 1
  fi
done

# ── 5. Открыть браузер ───────────────────────────────────────────
sleep "$BROWSER_WAIT"
xdg-open "$FRONTEND_URL" 2>/dev/null || warn "Не удалось открыть браузер автоматически: $FRONTEND_URL"

# ── 6. Дежурный режим ────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  TaskFlow запущен!${NC}"
echo -e "  Фронтенд:   ${CYAN}$FRONTEND_URL${NC}"
echo -e "  Бэкенд:     ${CYAN}$BACKEND_URL${NC}"
echo -e "  Логи:       /tmp/taskflow-backend.log"
echo -e "              /tmp/taskflow-frontend.log"
echo -e "${GREEN}      Ctrl+C для остановки${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

wait
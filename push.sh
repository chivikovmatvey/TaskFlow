#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# ── цвета ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── сообщение коммита ────────────────────────────────────────────
COMMIT_MSG="$*"

if [[ -z "$COMMIT_MSG" ]]; then
  echo -e "${YELLOW}Введите название коммита:${NC} "
  read -r COMMIT_MSG
fi

if [[ -z "$COMMIT_MSG" ]]; then
  error "Название коммита не может быть пустым."
  exit 1
fi

# ── статус ───────────────────────────────────────────────────────
info "Текущая ветка: $(git branch --show-current)"
echo ""
git status --short
echo ""

# ── проверка изменений ───────────────────────────────────────────
if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  warn "Нет изменений для коммита."
  exit 0
fi

# ── staging ──────────────────────────────────────────────────────
info "Добавляю все изменения в staging..."
git add -A

# ── коммит ───────────────────────────────────────────────────────
info "Создаю коммит: \"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG"
echo ""

# ── push ─────────────────────────────────────────────────────────
BRANCH="$(git branch --show-current)"
info "Пушу ветку '$BRANCH' → origin..."
git push origin "$BRANCH"
echo ""

ok "Готово! Изменения отправлены на GitHub."
echo -e "  Репо: ${CYAN}https://github.com/chivikovmatvey/TaskFlow${NC}"

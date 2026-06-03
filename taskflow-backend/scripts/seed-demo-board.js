import crypto from 'crypto'
import dotenv from 'dotenv'
import { query, getPool } from '../src/db.js'

dotenv.config()

const OWNER_EMAIL = 'matveitchivikov@yandex.ru'
const BOARD_TITLE = 'Demo Board — TaskFlow Analytics'
const DAYS_BACK = 90

const COLUMNS = [
  { title: 'Backlog', position: 0 },
  { title: 'Нужно сделать', position: 1 },
  { title: 'В работе', position: 2 },
  { title: 'На ревью', position: 3 },
  { title: 'Тестирование', position: 4 },
  { title: 'Готово', position: 5 },
]

const LABELS = [
  { name: 'Frontend', color: '#cc785c' },
  { name: 'Backend', color: '#5db8a6' },
  { name: 'Bug', color: '#c64545' },
  { name: 'Feature', color: '#e8a55a' },
  { name: 'Refactor', color: '#8a8779' },
  { name: 'UX', color: '#1f4068' },
  { name: 'Performance', color: '#a05c7b' },
  { name: 'Security', color: '#3aa39f' },
  { name: 'DevOps', color: '#6E9473' },
  { name: 'Docs', color: '#f4654b' },
]

const TASK_TITLES = [
  'Оптимизация рендеринга канбан-доски',
  'Миграция API на новую версию',
  'Исправить баг с drag-and-drop',
  'Добавить тёмную тему для модальных окон',
  'Внедрить кеширование запросов в React Query',
  'Переписать сервис уведомлений',
  'Багфикс: дубликаты в realtime обновлениях',
  'Аналитика по командам',
  'Экспорт данных в Excel',
  'Интеграция с Telegram-ботом',
  'OAuth через Google',
  'OAuth через Yandex',
  'Email-верификация при регистрации',
  'Двухфакторная аутентификация',
  'Логирование действий пользователя',
  'Восстановление пароля по email',
  'Поиск задач с автодополнением',
  'Фильтры по приоритету и тегам',
  'Архив задач с возможностью восстановления',
  'Импорт задач из CSV',
  'Поддержка markdown в описании задач',
  'Загрузка файлов до 50 МБ',
  'Превью изображений в карточках',
  'Уведомления о просроченных задачах',
  'Календарное представление задач',
  'Gantt-диаграмма по доске',
  'Burndown chart для спринтов',
  'Шаблоны досок при создании',
  'Шаблоны задач',
  'Чек-листы с прогресс-баром',
  'Подзадачи с deadline',
  'Связи между задачами (blocks/depends)',
  'Метки времени работы (time tracking)',
  'Pomodoro-таймер встроенный в задачу',
  'История изменений каждой задачи',
  'Откат изменений через undo',
  'Приватные доски и шаринг',
  'Гостевые ссылки на доску',
  'Комментарии с упоминаниями @username',
  'Реакции на комментарии',
  'Голосовые сообщения в комментах',
  'Видеозвонки внутри задачи',
  'Интеграция с Google Calendar',
  'Интеграция с Outlook',
  'Push-уведомления через Service Worker',
  'PWA-режим для мобильных',
  'Адаптивная вёрстка для планшетов',
  'Жесты swipe для мобильной версии',
  'Оффлайн-режим с синхронизацией',
  'Безопасность: rate-limiting API',
  'Безопасность: защита от XSS',
  'Безопасность: проверка CSRF-токенов',
  'Безопасность: шифрование вложений',
  'Резервное копирование БД',
  'Восстановление БД из бэкапа',
  'Миграция на PostgreSQL',
  'Кеширование статики через CDN',
  'CI/CD pipeline на GitHub Actions',
  'Docker-compose для локальной разработки',
  'Kubernetes-манифесты для прода',
  'Мониторинг через Prometheus',
  'Дашборд в Grafana',
  'Алёрты на падение сервиса',
  'Логи через ELK-стек',
  'Tracing через Jaeger',
  'A/B тестирование UI',
  'Аналитика поведения пользователей',
  'Heatmap для интерфейса',
  'Документация API через Swagger',
  'README с примерами использования',
  'Видео-туториалы',
  'Интерактивный onboarding для новых юзеров',
  'Tooltips на ключевых элементах',
  'Hotkeys для быстрых действий',
  'Командный режим (vim-like)',
  'Темы оформления (5 цветовых схем)',
  'Кастомные эмодзи в комментариях',
  'Стикеры в чате',
  'Канбан с swimlanes по исполнителям',
  'Группировка задач по проектам',
  'Иерархия эпиков и сториз',
  'Roadmap-вид с релизами',
  'Velocity tracking по спринтам',
  'Сравнение производительности команд',
  'Личный дашборд каждого участника',
  'Цели и OKR на квартал',
  'KPI по отделам',
  'Отчёты в формате PDF',
  'Автоматическая отправка отчётов по почте',
  'Webhook при изменении статуса',
  'API-токены для интеграций',
  'Zapier-интеграция',
  'Slack-уведомления',
  'Discord-бот',
  'Microsoft Teams интеграция',
  'Notion-синк',
  'Jira-импортёр',
  'Trello-импортёр',
  'Asana-импортёр',
  'GitHub Issues sync',
  'GitLab MR sync',
  'Bitbucket pipelines',
  'AI-предложения по разбивке задач',
  'AI-резюме треда комментариев',
  'AI-классификация приоритета',
  'AI-перевод задач на разные языки',
  'Voice-to-text в комментариях',
  'OCR для прикрепленных изображений',
  'Распознавание лиц на аватарках',
  'Анализ тональности комментариев',
  'Предсказание сроков по истории',
  'Анти-спам в комментариях',
  'Модерация контента',
  'Жалобы на пользователей',
  'Бан-лист и блокировки',
  'Аудит-логи для админов',
  'GDPR-экспорт данных пользователя',
  'GDPR-удаление аккаунта',
  'Cookie consent banner',
  'Privacy policy и terms of service',
  'Локализация на английский',
  'Локализация на испанский',
  'Локализация на немецкий',
  'Локализация на китайский',
  'RTL-поддержка для арабского',
  'Юникод-поддержка эмодзи 15.0',
  'Доступность WCAG AA',
  'Screen-reader тестирование',
  'Высококонтрастная тема',
  'Размер шрифта на выбор',
  'Анимации с reduced-motion',
  'Keyboard navigation для всех экранов',
  'Focus indicators по WCAG',
  'Alt-тексты для всех изображений',
  'Aria-labels для иконок',
  'Семантическая HTML-разметка',
  'SEO-оптимизация лендинга',
  'OpenGraph-теги для шаринга',
  'Sitemap.xml автогенерация',
  'Robots.txt настройка',
  'Schema.org микроразметка',
  'Lighthouse > 90 баллов',
  'Core Web Vitals в зелёной зоне',
  'Bundle size < 200KB gzipped',
  'Lazy-loading компонентов',
  'Code splitting по роутам',
  'Tree-shaking unused imports',
  'Минификация SVG-иконок',
  'WebP/AVIF для изображений',
  'HTTP/2 push критичных ресурсов',
  'Service Worker для офлайна',
  'Кеширование API в IndexedDB',
  'Оптимистичные обновления в UI',
  'Skeleton-loaders вместо спиннеров',
  'Прогресс-бар при загрузке файла',
  'Drag-and-drop файлов из проводника',
  'Множественная загрузка файлов',
]

const COMMENTS_POOL = [
  'Беру в работу!',
  'Можно уточнить требования?',
  'Готово, на ревью',
  'Нашёл баг в этом коде',
  'Согласен с этим подходом',
  'Может стоит обсудить на дейли?',
  'Закрываю как done ✅',
  'Откатил изменения',
  'Перенёс в следующий спринт',
  'Жду подтверждения от продакт',
  'Пушнул хотфикс',
  'Тесты падают, разбираюсь',
  'Всё работает, мерджу',
  'Создал PR',
  'Прошу ревью',
  'Дополнил описание',
  'Прикрепил скриншот',
  'Связал с задачей #42',
  'Эстимейт — 3 дня',
  'Деплой на staging готов',
]

const TIME_NOTES = [
  'Реализация фичи',
  'Дебаг и фикс багов',
  'Ревью кода коллег',
  'Митинг с командой',
  'Архитектурный созвон',
  'Написание тестов',
  'Документация',
  'Рефакторинг',
]

const ACTIONS = [
  'task.created', 'task.archived', 'task.moved', 'task.moved',
  'task.updated', 'comment.added', 'comment.added',
  'task.assigned',
]

const PRIORITIES = ['low', 'medium', 'high', 'urgent']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function pickN(arr, n) {
  const a = [...arr]
  const r = []
  while (r.length < n && a.length) r.push(a.splice(Math.floor(Math.random() * a.length), 1)[0])
  return r
}
function weightedDate(daysBack) {
  const r = Math.pow(Math.random(), 0.6)
  const day = Math.floor(r * daysBack)
  const dt = new Date()
  dt.setDate(dt.getDate() - day)
  const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
  const wHours = isWeekend ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] : [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  dt.setHours(pick(wHours), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0)
  return dt
}

async function findOrCreateMembers(ownerId) {
  const members = []
  const others = await query(`SELECT TOP 2 id, email, full_name FROM dbo.users WHERE id <> @id`, { id: ownerId })
  for (const u of others.recordset) members.push(u)
  return members
}

async function dropExistingBoard() {
  const existing = await query(`SELECT id FROM dbo.boards WHERE title = @t`, { t: BOARD_TITLE })
  for (const b of existing.recordset) {
    await query(`DELETE FROM dbo.activity_log WHERE board_id = @id`, { id: b.id })
    await query(`DELETE FROM dbo.boards WHERE id = @id`, { id: b.id })
  }
}

async function main() {
  await getPool()
  console.log('🚀 Загрузка демо-доски...')

  const userRes = await query(`SELECT id FROM dbo.users WHERE email = @email`, { email: OWNER_EMAIL })
  if (!userRes.recordset.length) {
    console.error(`❌ Пользователь ${OWNER_EMAIL} не найден`)
    process.exit(1)
  }
  const ownerId = userRes.recordset[0].id
  console.log(`👤 Владелец: ${OWNER_EMAIL} (${ownerId})`)

  await dropExistingBoard()
  console.log('🧹 Старые доски с таким же названием удалены')

  const boardCreatedAt = new Date()
  boardCreatedAt.setDate(boardCreatedAt.getDate() - DAYS_BACK)
  boardCreatedAt.setHours(9, 0, 0, 0)
  const boardId = crypto.randomUUID()
  await query(
    `INSERT INTO dbo.boards (id, title, description, background_color, owner_id, created_at, updated_at)
     VALUES (@id, @t, @d, @c, @owner, @at, @at)`,
    {
      id: boardId,
      t: BOARD_TITLE,
      d: 'Демо-доска с богатой аналитикой',
      c: '#cc785c',
      owner: ownerId,
      at: boardCreatedAt,
    }
  )

  const members = await findOrCreateMembers(ownerId)
  for (const m of members) {
    await query(
      `INSERT INTO dbo.board_members (id, board_id, user_id, role, created_at)
       VALUES (@id, @bid, @uid, 'member', @at)`,
      { id: crypto.randomUUID(), bid: boardId, uid: m.id, at: boardCreatedAt }
    )
    await query(
      `INSERT INTO dbo.activity_log (id, board_id, user_id, action, entity_type, entity_id, title, created_at)
       VALUES (@id, @bid, @uid, 'member.added', 'member', @eid, @t, @at)`,
      {
        id: crypto.randomUUID(), bid: boardId, uid: ownerId,
        eid: m.id, t: m.full_name || m.email,
        at: new Date(boardCreatedAt.getTime() + 60000),
      }
    )
  }
  const allUsers = [{ id: ownerId }, ...members]
  console.log(`👥 Участников: ${allUsers.length}`)

  const columnIds = []
  for (const c of COLUMNS) {
    const colId = crypto.randomUUID()
    columnIds.push({ id: colId, ...c })
    await query(
      `INSERT INTO dbo.columns (id, board_id, title, position, created_at)
       VALUES (@id, @bid, @t, @p, @at)`,
      { id: colId, bid: boardId, t: c.title, p: c.position, at: boardCreatedAt }
    )
    await query(
      `INSERT INTO dbo.activity_log (id, board_id, user_id, action, entity_type, entity_id, title, created_at)
       VALUES (@id, @bid, @uid, 'column.created', 'column', @eid, @t, @at)`,
      {
        id: crypto.randomUUID(), bid: boardId, uid: ownerId,
        eid: colId, t: c.title,
        at: new Date(boardCreatedAt.getTime() + 120000 + c.position * 30000),
      }
    )
  }
  console.log(`📋 Колонок: ${columnIds.length}`)

  const labelIds = []
  for (const l of LABELS) {
    const labId = crypto.randomUUID()
    labelIds.push({ id: labId, ...l })
    await query(
      `INSERT INTO dbo.labels (id, board_id, name, color, created_at)
       VALUES (@id, @bid, @n, @c, @at)`,
      { id: labId, bid: boardId, n: l.name, c: l.color, at: boardCreatedAt }
    )
  }
  console.log(`🏷️  Лейблов: ${labelIds.length}`)

  const taskCount = TASK_TITLES.length
  const tasks = []
  for (let i = 0; i < taskCount; i++) {
    const taskId = crypto.randomUUID()
    const createdAt = weightedDate(DAYS_BACK - 1)
    const priority = pick(PRIORITIES)
    const creator = pick(allUsers)
    const assignee = Math.random() > 0.15 ? pick(allUsers) : null
    const hasDue = Math.random() > 0.4
    const dueDate = hasDue ? new Date(createdAt.getTime() + (Math.floor(Math.random() * 30) - 5) * 86400000) : null
    const isArchived = Math.random() > 0.55
    const startColumn = columnIds[0]
    let currentColumn = startColumn
    let archivedAt = null

    if (isArchived) {
      const closedAfter = Math.floor(Math.random() * 14 * 86400000) + 3600000
      archivedAt = new Date(createdAt.getTime() + closedAfter)
      if (archivedAt > new Date()) archivedAt = new Date()
      currentColumn = columnIds[columnIds.length - 1]
    } else {
      const pos = Math.min(columnIds.length - 2, Math.floor(Math.random() * (columnIds.length - 1)))
      currentColumn = columnIds[pos]
    }

    await query(
      `INSERT INTO dbo.tasks (id, board_id, column_id, title, description, position, priority, due_date, assigned_to, created_by, is_archived, archived_at, created_at, updated_at)
       VALUES (@id, @bid, @col, @t, @d, @p, @pr, @due, @ass, @cb, @arch, @aat, @ca, @ca)`,
      {
        id: taskId,
        bid: boardId,
        col: currentColumn.id,
        t: TASK_TITLES[i],
        d: Math.random() > 0.3 ? `Описание задачи: ${TASK_TITLES[i]}.\n\nТребования:\n- Учесть текущую архитектуру\n- Покрыть тестами\n- Документировать API` : null,
        p: i,
        pr: priority,
        due: dueDate,
        ass: assignee?.id || null,
        cb: creator.id,
        arch: isArchived ? 1 : 0,
        aat: archivedAt,
        ca: createdAt,
      }
    )
    tasks.push({ id: taskId, createdAt, archivedAt, isArchived, currentColumn, creator, assignee })

    await query(
      `INSERT INTO dbo.activity_log (id, board_id, user_id, action, entity_type, entity_id, title, created_at)
       VALUES (@id, @bid, @uid, 'task.created', 'task', @eid, @t, @at)`,
      {
        id: crypto.randomUUID(), bid: boardId, uid: creator.id,
        eid: taskId, t: TASK_TITLES[i], at: createdAt,
      }
    )

    const moveCount = Math.min(columnIds.length - 1, Math.floor(Math.random() * 4))
    let lastMoveTime = createdAt.getTime()
    let lastColIdx = 0
    for (let m = 0; m < moveCount; m++) {
      lastMoveTime += Math.floor(Math.random() * 3 * 86400000) + 3600000
      if (lastMoveTime > Date.now()) break
      lastColIdx = Math.min(columnIds.length - 1, lastColIdx + 1)
      const newCol = columnIds[lastColIdx]
      const mover = pick(allUsers)
      await query(
        `INSERT INTO dbo.activity_log (id, board_id, user_id, action, entity_type, entity_id, title, details, created_at)
         VALUES (@id, @bid, @uid, 'task.moved', 'task', @eid, @t, @det, @at)`,
        {
          id: crypto.randomUUID(), bid: boardId, uid: mover.id,
          eid: taskId, t: TASK_TITLES[i],
          det: JSON.stringify({ column_id: newCol.id, column_title: newCol.title }),
          at: new Date(lastMoveTime),
        }
      )
    }

    if (assignee && Math.random() > 0.6) {
      await query(
        `INSERT INTO dbo.activity_log (id, board_id, user_id, action, entity_type, entity_id, title, created_at)
         VALUES (@id, @bid, @uid, 'task.assigned', 'task', @eid, @t, @at)`,
        {
          id: crypto.randomUUID(), bid: boardId, uid: creator.id,
          eid: taskId, t: TASK_TITLES[i],
          at: new Date(createdAt.getTime() + 600000),
        }
      )
    }

    if (isArchived) {
      const closer = assignee || creator
      await query(
        `INSERT INTO dbo.activity_log (id, board_id, user_id, action, entity_type, entity_id, title, created_at)
         VALUES (@id, @bid, @uid, 'task.archived', 'task', @eid, @t, @at)`,
        {
          id: crypto.randomUUID(), bid: boardId, uid: closer.id,
          eid: taskId, t: TASK_TITLES[i], at: archivedAt,
        }
      )
    }
  }
  console.log(`✅ Задач: ${tasks.length}`)

  let commentsCount = 0
  for (const t of tasks) {
    const n = Math.random() > 0.4 ? Math.floor(Math.random() * 6) : 0
    for (let i = 0; i < n; i++) {
      const cid = crypto.randomUUID()
      const cAt = new Date(t.createdAt.getTime() + (i + 1) * (Math.random() * 86400000 + 3600000))
      if (cAt > new Date()) continue
      const user = pick(allUsers)
      await query(
        `INSERT INTO dbo.comments (id, task_id, user_id, content, created_at, updated_at)
         VALUES (@id, @tid, @uid, @c, @at, @at)`,
        { id: cid, tid: t.id, uid: user.id, c: pick(COMMENTS_POOL), at: cAt }
      )
      await query(
        `INSERT INTO dbo.activity_log (id, board_id, user_id, action, entity_type, entity_id, title, created_at)
         VALUES (@id, @bid, @uid, 'comment.added', 'comment', @eid, @t, @at)`,
        {
          id: crypto.randomUUID(), bid: boardId, uid: user.id,
          eid: cid, t: TASK_TITLES[tasks.indexOf(t)] || 'комментарий',
          at: cAt,
        }
      )
      commentsCount++
    }
  }
  console.log(`💬 Комментариев: ${commentsCount}`)

  let timeCount = 0
  for (const t of tasks) {
    const sessions = Math.random() > 0.3 ? Math.floor(Math.random() * 5) + 1 : 0
    for (let i = 0; i < sessions; i++) {
      const startedAt = new Date(t.createdAt.getTime() + Math.floor(Math.random() * 7 * 86400000))
      if (startedAt > new Date()) continue
      const durationSec = Math.floor(Math.random() * 14400) + 600
      const endedAt = new Date(startedAt.getTime() + durationSec * 1000)
      if (endedAt > new Date()) continue
      const user = t.assignee || pick(allUsers)
      await query(
        `INSERT INTO dbo.time_tracking (id, task_id, user_id, started_at, ended_at, duration, notes, created_at, updated_at)
         VALUES (@id, @tid, @uid, @s, @e, @d, @n, @s, @e)`,
        {
          id: crypto.randomUUID(), tid: t.id, uid: user.id,
          s: startedAt, e: endedAt, d: durationSec,
          n: pick(TIME_NOTES),
        }
      )
      timeCount++
    }
  }
  console.log(`⏱️  Сессий time tracking: ${timeCount}`)

  let activeCount = 0
  const activeTasks = tasks.filter(t => !t.isArchived).slice(0, 3)
  for (const t of activeTasks) {
    const startedAt = new Date(Date.now() - (Math.floor(Math.random() * 7200) + 600) * 1000)
    const user = t.assignee || pick(allUsers)
    await query(
      `INSERT INTO dbo.time_tracking (id, task_id, user_id, started_at, created_at, updated_at)
       VALUES (@id, @tid, @uid, @s, @s, @s)`,
      { id: crypto.randomUUID(), tid: t.id, uid: user.id, s: startedAt }
    )
    activeCount++
  }
  console.log(`▶️  Активных таймеров: ${activeCount}`)

  let labelLinks = 0
  for (const t of tasks) {
    if (Math.random() > 0.4) continue
    const labels = pickN(labelIds, Math.floor(Math.random() * 3) + 1)
    for (const lab of labels) {
      try {
        await query(
          `INSERT INTO dbo.task_labels (id, task_id, label_id, created_at)
           VALUES (@id, @tid, @lid, @at)`,
          { id: crypto.randomUUID(), tid: t.id, lid: lab.id, at: t.createdAt }
        )
        labelLinks++
      } catch { }
    }
  }
  console.log(`🏷️  Связок лейблов: ${labelLinks}`)

  let checklistCount = 0
  for (const t of tasks) {
    if (Math.random() > 0.3) continue
    const items = Math.floor(Math.random() * 5) + 1
    for (let i = 0; i < items; i++) {
      const done = Math.random() > 0.5 ? 1 : 0
      await query(
        `INSERT INTO dbo.checklist_items (id, task_id, title, position, is_completed, created_at)
         VALUES (@id, @tid, @t, @p, @d, @at)`,
        {
          id: crypto.randomUUID(), tid: t.id,
          t: pick(['Проверить требования', 'Написать тесты', 'Сделать ревью', 'Обновить документацию', 'Задеплоить', 'Уведомить команду']),
          p: i, d: done, at: t.createdAt,
        }
      )
      checklistCount++
    }
  }
  console.log(`☑️  Чек-листов: ${checklistCount}`)

  console.log(`\n✨ Готово! ID доски: ${boardId}`)
  console.log(`🔗 http://localhost:3000/board/${boardId}`)
  console.log(`📊 http://localhost:3000/board/${boardId}/insights`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Ошибка:', err)
  process.exit(1)
})

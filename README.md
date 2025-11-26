# TaskFlow

Веб-приложение для управления задачами в формате Kanban-доски с поддержкой реального времени и коллаборации.

## Описание

TaskFlow - это современное приложение для управления проектами и задачами, построенное на принципах Kanban-методологии. Приложение поддерживает совместную работу в реальном времени, позволяя командам эффективно организовывать и отслеживать выполнение задач.

## Основной функционал

- **Kanban-доски**: Создание и управление досками с возможностью кастомизации
- **Управление задачами**: Создание, редактирование, удаление задач с поддержкой drag-and-drop
- **Колонки**: Гибкая настройка колонок для разных этапов работы
- **Приоритеты и сроки**: Установка приоритетов задач и дедлайнов
- **Комментарии**: Обсуждение задач с командой
- **Назначение исполнителей**: Распределение задач между участниками доски
- **Управление участниками**: Приглашение пользователей и управление правами доступа
- **Реальное время**: Мгновенное обновление изменений для всех участников доски
- **Статистика**: Просмотр статистики по доске (количество задач, распределение по приоритетам)
- **Дублирование досок**: Копирование досок со всеми колонками и задачами
- **Онлайн-индикаторы**: Отображение активных пользователей на доске

## Технологический стек

### Frontend

- **React 19** - библиотека для построения пользовательского интерфейса
- **Vite** - инструмент сборки и dev-сервер
- **React Router v7** - маршрутизация
- **TanStack React Query** - управление серверным состоянием и кешированием
- **Zustand** - управление клиентским состоянием
- **TailwindCSS** - utility-first CSS framework
- **@dnd-kit** - библиотека для drag-and-drop функционала
- **Supabase Client** - клиент для работы с Supabase (БД, аутентификация, realtime)
- **Axios** - HTTP клиент
- **react-hot-toast** - уведомления

### Backend

- **Node.js** - серверная платформа
- **Express** - веб-фреймворк
- **Supabase** - Backend-as-a-Service (PostgreSQL, аутентификация, realtime, хранилище)
- **JSON Web Tokens** - токены для аутентификации
- **bcryptjs** - хеширование паролей
- **express-validator** - валидация данных

### База данных

- **PostgreSQL** (через Supabase) - реляционная база данных
- **Row Level Security (RLS)** - политики безопасности на уровне строк

## Структура проекта

```
TaskFlow/
├── taskflow-frontend/          # Frontend приложение
│   ├── src/
│   │   ├── components/         # React компоненты
│   │   │   ├── auth/          # Компоненты аутентификации
│   │   │   ├── board/         # Компоненты досок
│   │   │   ├── common/        # Общие компоненты
│   │   │   ├── dashboard/     # Компоненты дашборда
│   │   │   └── task/          # Компоненты задач
│   │   ├── context/           # React Context провайдеры
│   │   ├── hooks/             # Кастомные хуки
│   │   ├── pages/             # Страницы приложения
│   │   ├── services/          # API сервисы
│   │   ├── styles/            # Глобальные стили
│   │   └── utils/             # Утилиты
│   ├── public/                # Статические файлы
│   └── package.json
│
└── taskflow-backend/           # Backend API
    ├── src/
    │   └── server.js          # Точка входа сервера
    └── package.json
```

## Установка и настройка

### Требования

- Node.js 18+
- npm или yarn
- Аккаунт Supabase

### 1. Настройка Backend

```bash
cd taskflow-backend
npm install
```

Создайте файл `.env` на основе `.env.example`:

```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=3600

# CORS
FRONTEND_URL=http://localhost:3000
```

### 2. Настройка Frontend

```bash
cd taskflow-frontend
npm install
```

Создайте файл `.env` на основе `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api
```

### 3. Настройка Supabase

Создайте следующие таблицы в вашем Supabase проекте:

- `profiles` - профили пользователей
- `boards` - доски
- `columns` - колонки досок
- `tasks` - задачи
- `comments` - комментарии к задачам
- `board_members` - участники досок

Настройте Row Level Security (RLS) политики для контроля доступа к данным.

Включите Realtime для таблиц: `boards`, `columns`, `tasks`, `comments`, `board_members`.

## Запуск приложения

### Запуск Backend

```bash
cd taskflow-backend
npm run dev        # Development mode с автоперезагрузкой
# или
npm start          # Production mode
```

Сервер запустится на `http://localhost:5000`

### Запуск Frontend

```bash
cd taskflow-frontend
npm run dev        # Development server
```

Приложение будет доступно на `http://localhost:3000`

### Другие команды

```bash
# Frontend
npm run build      # Production build
npm run lint       # Проверка кода ESLint
npm run preview    # Просмотр production build
```

## Архитектура

### Управление состоянием

Приложение использует многоуровневый подход к управлению состоянием:

1. **Серверное состояние** - TanStack React Query управляет кешированием и синхронизацией данных с сервером
2. **Состояние аутентификации** - React Context (AuthContext) для глобального доступа к данным пользователя
3. **Локальное состояние** - Zustand для клиентского состояния приложения

### Realtime синхронизация

Приложение использует Supabase Realtime для мгновенной синхронизации изменений:

1. Пользователь вносит изменение (создание/обновление/удаление)
2. Изменение сохраняется в PostgreSQL через Supabase
3. Supabase отправляет postgres_changes событие всем подписанным клиентам
4. Кастомные хуки (`useRealtimeBoard`, `useRealtimeDashboard`) получают событие
5. React Query кеш инвалидируется, триггеря автоматический рефетч
6. UI обновляется с новыми данными

### Слой сервисов

Все взаимодействия с Supabase инкапсулированы в сервисном слое (`src/services/`):

- `authService.js` - аутентификация и авторизация
- `boardService.js` - операции с досками
- `columnService.js` - управление колонками
- `taskService.js` - управление задачами и комментариями
- `boardMemberService.js` - управление участниками досок

Сервисы возвращают данные напрямую или выбрасывают ошибки, которые обрабатываются на уровне компонентов через React Query.

### Защита маршрутов

Приложение использует две обертки для защиты маршрутов:

- `ProtectedRoute` - доступ только для авторизованных пользователей
- `PublicRoute` - доступ только для неавторизованных (автоматический редирект на dashboard)

### Права доступа

Система прав реализована на двух уровнях:

1. **База данных** - Row Level Security (RLS) политики в PostgreSQL
2. **Приложение** - кастомные хуки `useBoardPermissions` и `useCheckBoardAccess`
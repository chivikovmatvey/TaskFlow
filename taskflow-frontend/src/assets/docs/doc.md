# TaskFlow - Полная техническая документация

## Оглавление

1. [Обзор проекта](#обзор-проекта)
2. [Стек технологий](#стек-технологий)
3. [Архитектура приложения](#архитектура-приложения)
4. [Структура проекта](#структура-проекта)
5. [Функциональные возможности](#функциональные-возможности)
6. [Компоненты](#компоненты)
7. [Сервисы](#сервисы)
8. [Хуки (Hooks)](#хуки-hooks)
9. [Управление состоянием](#управление-состоянием)
10. [Realtime синхронизация](#realtime-синхронизация)
11. [Система прав доступа](#система-прав-доступа)
12. [Drag & Drop реализация](#drag--drop-реализация)
13. [Темная тема](#темная-тема)

---

## Обзор проекта

**TaskFlow** - это современное веб-приложение для управления проектами и задачами, построенное на принципах Kanban-методологии с поддержкой реального времени и командной коллаборации.

### Ключевые особенности:
- ✅ Полнофункциональные Kanban доски с drag-and-drop
- 🔄 Синхронизация в реальном времени через Supabase Realtime
- 👥 Многопользовательская работа с управлением правами доступа
- 📊 Статистика и аналитика по задачам
- 🏷️ Метки, чек-листы, вложения и комментарии
- ⏱️ Отслеживание времени работы над задачами
- 🌙 Поддержка темной темы
- 📱 Адаптивный дизайн

---

## Стек технологий

### Frontend

#### Основные библиотеки
- **React 19.2.0** - Библиотека для построения пользовательского интерфейса
  - Использование новейших React хуков
  - Функциональные компоненты
  - React.memo для оптимизации

- **Vite 7.2.2** - Современный инструмент сборки
  - Быстрый HMR (Hot Module Replacement)
  - Оптимизированная production сборка
  - Поддержка ES modules

- **React Router DOM 7.9.5** - Маршрутизация
  - Декларативная маршрутизация
  - Защищенные маршруты
  - Навигация с параметрами

#### Управление состоянием и данными
- **TanStack React Query 5.90.7** - Управление серверным состоянием
  - Кеширование данных
  - Автоматическая синхронизация
  - Оптимистичные обновления
  - Инвалидация кеша

- **Zustand 5.0.8** - Управление клиентским состоянием
  - Легковесная альтернатива Redux
  - Простой API
  - TypeScript поддержка

#### UI и стилизация
- **TailwindCSS 3.4.18** - Utility-first CSS framework
  - Кастомные конфигурации
  - Темная тема
  - Адаптивный дизайн
  - PostCSS + Autoprefixer

- **React Hot Toast 2.6.0** - Система уведомлений
  - Красивые toast уведомления
  - Поддержка темной темы
  - Кастомизируемые стили

#### Drag & Drop
- **@dnd-kit/core 6.3.1** - Библиотека для drag-and-drop
  - Гибкая система сенсоров
  - Поддержка touch событий
  - Accessibility из коробки

- **@dnd-kit/sortable 10.0.0** - Сортируемые списки
  - Вертикальные и горизонтальные списки
  - Анимации перетаскивания
  - Стратегии сортировки

#### Backend интеграция
- **@supabase/supabase-js 2.80.0** - Клиент Supabase
  - Аутентификация
  - Realtime подписки
  - PostgreSQL запросы
  - Хранилище файлов

- **Axios 1.13.2** - HTTP клиент
  - Перехватчики запросов/ответов
  - Обработка ошибок

### Backend

- **Node.js 18+** - JavaScript runtime
- **Express** - Веб-фреймворк
- **Supabase** - Backend-as-a-Service
  - PostgreSQL база данных
  - Row Level Security (RLS)
  - Realtime подписки
  - Аутентификация
  - Хранилище файлов

### База данных

- **PostgreSQL** (через Supabase)
  - Реляционная модель данных
  - Транзакции
  - Индексы для оптимизации
  - Row Level Security для безопасности

---

## Архитектура приложения

### Общая архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Components Layer                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │   │
│  │  │  Pages   │  │  Common  │  │  Board/Task  │   │   │
│  │  └──────────┘  └──────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              State Management                     │   │
│  │  ┌──────────────┐  ┌────────┐  ┌──────────┐     │   │
│  │  │ React Query  │  │ Context│  │  Zustand │     │   │
│  │  └──────────────┘  └────────┘  └──────────┘     │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Services Layer                       │   │
│  │  ┌─────┐ ┌──────┐ ┌──────┐ ┌──────────────┐     │   │
│  │  │Board│ │Column│ │ Task │ │ Attachments  │     │   │
│  │  └─────┘ └──────┘ └──────┘ └──────────────┘     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Backend Services                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database + Row Level Security        │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  Realtime Subscriptions (postgres_changes)       │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  Authentication & Authorization                   │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  Storage for File Attachments                    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Паттерны архитектуры

#### 1. Service Layer Pattern
Все взаимодействия с Supabase инкапсулированы в сервисном слое:
- Сервисы возвращают Promise с данными или ошибками
- Компоненты не знают о деталях API
- Легкая замена источника данных

#### 2. Optimistic Updates
При изменении данных используется оптимистичное обновление UI:
1. UI обновляется мгновенно (оптимистично)
2. Запрос отправляется на сервер
3. При ошибке - откат изменений
4. При успехе - синхронизация с сервером

#### 3. Real-time Synchronization
Автоматическая синхронизация через Supabase Realtime:
1. Подписка на изменения таблиц
2. Получение postgres_changes событий
3. Инвалидация React Query кеша
4. Автоматический рефетч данных

#### 4. Portal Pattern для модальных окон
Модальные окна рендерятся через React Portal:
- Рендер вне DOM-дерева приложения
- Избегание конфликтов с z-index
- Предотвращение конфликтов с DnD

---

## Структура проекта

```
TaskFlow/
├── docs/                          # Документация
│   └── doc.md                     # Этот файл
│
├── taskflow-frontend/             # Frontend приложение
│   ├── src/
│   │   ├── components/            # React компоненты
│   │   │   ├── board/            # Компоненты досок
│   │   │   │   ├── BoardMembers.jsx
│   │   │   │   ├── BoardStatistics.jsx
│   │   │   │   ├── InviteMemberModal.jsx
│   │   │   │   ├── KanbanBoard.jsx
│   │   │   │   ├── OnlineUsers.jsx
│   │   │   │   ├── SearchAndFilters.jsx
│   │   │   │   ├── SortableColumn.jsx
│   │   │   │   ├── SortableTaskCard.jsx
│   │   │   │   └── TaskCard.jsx
│   │   │   │
│   │   │   ├── common/           # Общие компоненты
│   │   │   │   ├── ConfirmModal.jsx
│   │   │   │   └── ThemeToggle.jsx
│   │   │   │
│   │   │   └── task/             # Компоненты задач
│   │   │       ├── CommentItem.jsx
│   │   │       ├── TaskAttachments.jsx
│   │   │       ├── TaskChecklist.jsx
│   │   │       ├── TaskLabels.jsx
│   │   │       ├── TaskModal.jsx
│   │   │       └── TaskTimeTracking.jsx
│   │   │
│   │   ├── context/              # React Context провайдеры
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   │
│   │   ├── hooks/                # Кастомные хуки
│   │   │   ├── useBoardPermissions.js
│   │   │   ├── useCheckBoardAccess.js
│   │   │   ├── useRealtimeBoard.js
│   │   │   ├── useRealtimeDashboard.js
│   │   │   └── useTasksWithLabels.js
│   │   │
│   │   ├── pages/                # Страницы приложения
│   │   │   ├── BoardPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   │
│   │   ├── services/             # API сервисы
│   │   │   ├── api.js
│   │   │   ├── attachmentService.js
│   │   │   ├── authService.js
│   │   │   ├── boardMemberService.js
│   │   │   ├── boardService.js
│   │   │   ├── checklistService.js
│   │   │   ├── columnService.js
│   │   │   ├── labelService.js
│   │   │   ├── supabaseClient.js
│   │   │   ├── taskService.js
│   │   │   └── timeTrackingService.js
│   │   │
│   │   ├── App.jsx               # Главный компонент
│   │   ├── main.jsx              # Точка входа
│   │   └── index.css             # Глобальные стили
│   │
│   ├── public/                   # Статические файлы
│   ├── index.html                # HTML шаблон
│   ├── package.json              # Зависимости
│   ├── vite.config.js            # Конфигурация Vite
│   ├── tailwind.config.js        # Конфигурация Tailwind
│   └── postcss.config.js         # Конфигурация PostCSS
│
└── taskflow-backend/             # Backend (минимальный)
    ├── src/
    │   └── server.js             # Express сервер
    └── package.json
```

---

## Функциональные возможности

### 1. Управление досками

#### Создание досок
- Название и описание
- Автоматическое создание стандартных колонок
- Назначение владельца

#### Редактирование досок
- Изменение названия и описания
- Изменение цвета фона
- Настройка видимости

#### Дублирование досок
- Копирование структуры колонок
- Копирование задач (опционально)
- Сохранение настроек

#### Удаление досок
- Каскадное удаление колонок и задач
- Подтверждение действия

### 2. Управление колонками

#### Создание колонок
- Кастомные названия
- Позиционирование

#### Редактирование колонок
- Переименование
- Изменение порядка (drag-and-drop)

#### Удаление колонок
- Удаление с задачами
- Предупреждение пользователя

### 3. Управление задачами

#### Создание задач
- Быстрое создание с названием
- Оптимистичное добавление в UI
- Автоматическое открытие для детального редактирования

#### Редактирование задач
**Основные поля:**
- Название задачи
- Описание (markdown поддержка)
- Приоритет (urgent, high, medium, low)
- Исполнитель
- Срок выполнения (due date)

**Дополнительные возможности:**
- Комментарии с поддержкой упоминаний
- Вложения (файлы, изображения)
- Чек-листы с прогрессом
- Метки (labels) для категоризации
- Отслеживание времени

#### Перемещение задач
- Drag & Drop между колонками
- Изменение порядка внутри колонки
- Оптимистичные обновления

#### Архивирование задач
- Перемещение в архив
- Просмотр архивных задач
- Восстановление из архива

### 4. Комментарии

#### Создание комментариев
- Текстовые комментарии
- Автоматическое добавление автора и времени
- Упоминания пользователей (@user)

#### Редактирование комментариев
- Изменение текста
- Индикатор редактирования

#### Удаление комментариев
- Удаление своих комментариев
- Владелец доски может удалять любые

### 5. Вложения

#### Загрузка файлов
- Drag & Drop загрузка
- Поддержка множественной загрузки
- Ограничение по размеру (5MB)
- Поддерживаемые типы:
  - Изображения (jpg, png, gif, webp)
  - Документы (pdf, doc, docx, txt)
  - Другие файлы

#### Предпросмотр файлов
- Изображения - inline просмотр
- PDF - встроенный viewer
- Текстовые файлы - с поддержкой UTF-8

#### Скачивание файлов
- Прямое скачивание
- Сохранение оригинального имени

#### Удаление файлов
- Удаление с подтверждением
- Очистка из Supabase Storage

### 6. Чек-листы

#### Создание чек-листов
- Добавление пунктов
- Текстовые описания

#### Управление пунктами
- Отметка как выполнено/невыполнено
- Редактирование текста
- Удаление пунктов
- Изменение порядка

#### Прогресс
- Автоматический расчет процента выполнения
- Визуальная индикация прогресса

### 7. Метки (Labels)

#### Создание меток
- Название метки
- Выбор цвета
- Глобальные для доски

#### Применение меток
- Множественные метки на задаче
- Быстрое добавление/удаление
- Визуальное отображение

#### Фильтрация по меткам
- Поиск задач по меткам
- Комбинированная фильтрация

### 8. Отслеживание времени

#### Трекинг времени
- Запуск/остановка таймера
- Автоматическое сохранение сессий
- История всех сессий

#### Ручное добавление времени
- Ввод времени вручную
- Описание сессии
- Дата и время начала/окончания

#### Статистика времени
- Общее затраченное время
- Разбивка по сессиям
- Активная сессия с live таймером

### 9. Управление участниками

#### Приглашение участников
- Приглашение по email
- Автоматическая отправка уведомлений
- Управление ролями

#### Роли участников
- **Владелец (Owner)**:
  - Полный доступ ко всем функциям
  - Управление участниками
  - Удаление доски

- **Участник (Member)**:
  - Просмотр доски
  - Создание и редактирование задач
  - Комментирование

#### Удаление участников
- Только владелец может удалять
- Подтверждение действия

### 10. Поиск и фильтрация

#### Поиск задач
- По названию
- По описанию
- Реактивный поиск

#### Фильтрация
**По приоритету:**
- Срочно
- Высокий
- Средний
- Низкий

**По сроку выполнения:**
- Просроченные
- Сегодня
- На этой неделе
- Без срока

**По исполнителю:**
- Мои задачи
- Неназначенные
- Конкретный пользователь

**По меткам:**
- Одна или несколько меток
- Логика "И" / "ИЛИ"

#### Сортировка
- По позиции (по умолчанию)
- По приоритету
- По дате создания
- По сроку выполнения
- По названию

### 11. Статистика доски

#### Общая статистика
- Всего задач
- Завершенные задачи
- Просроченные задачи

#### Распределение по приоритетам
- Количество по каждому приоритету
- Визуальная диаграмма

#### Активность
- Последние изменения
- Активные пользователи

### 12. Онлайн статусы

#### Индикация активности
- Отображение онлайн пользователей
- Аватары и имена
- Количество активных пользователей

#### Realtime обновления
- Мгновенное отображение присоединившихся
- Автоматическое удаление отключившихся

### 13. Темная тема

#### Переключение темы
- Toggle кнопка в интерфейсе
- Сохранение предпочтения в localStorage
- Системная тема по умолчанию

#### Адаптация UI
- Все компоненты поддерживают темную тему
- Toast уведомления
- Модальные окна
- Формы ввода

#### Плавные переходы
- Анимированное переключение цветов
- Сохранение комфорта для глаз

---

## Компоненты

### Страницы (Pages)

#### HomePage.jsx
**Назначение:** Главная страница приложения (лендинг)

**Функционал:**
- Презентация возможностей приложения
- Призыв к регистрации/входу
- Навигация на Login/Register

**Особенности:**
- Адаптивный дизайн
- Анимации
- SEO оптимизация

#### LoginPage.jsx
**Назначение:** Страница входа в систему

**Функционал:**
- Форма входа (email + пароль)
- Валидация полей
- Обработка ошибок
- Автоматический редирект на dashboard при успехе

**Технологии:**
- Supabase Authentication
- React Hook Form (опционально)
- Toast уведомления

#### RegisterPage.jsx
**Назначение:** Страница регистрации

**Функционал:**
- Форма регистрации (email, пароль, подтверждение пароля)
- Валидация email и пароля
- Автоматическое создание профиля
- Редирект на dashboard

#### DashboardPage.jsx
**Назначение:** Главная страница после входа

**Функционал:**
- Отображение всех досок пользователя
- Создание новых досок
- Поиск и фильтрация досок
- Статистика по доскам
- Удаление досок
- Выход из системы

**Структура:**
```jsx
<DashboardPage>
  <Header>
    <Logo />
    <UserInfo />
    <ThemeToggle />
    <LogoutButton />
  </Header>

  <Statistics>
    <TotalBoards />
    <MyBoards />
    <SharedBoards />
  </Statistics>

  <Controls>
    <CreateBoardButton />
    <SearchInput />
    <FilterButtons />
  </Controls>

  <BoardsGrid>
    {boards.map(board => <BoardCard />)}
  </BoardsGrid>
</DashboardPage>
```

**Realtime:**
- Подписка через `useRealtimeDashboard`
- Автоматическое обновление при изменениях

#### BoardPage.jsx
**Назначение:** Страница конкретной доски (Kanban)

**Функционал:**
- Отображение колонок и задач
- Drag & Drop перемещение
- Создание/редактирование/удаление колонок
- Создание/редактирование задач
- Поиск и фильтрация задач
- Статистика по доске
- Управление участниками
- Архив задач

**Структура:**
```jsx
<BoardPage>
  <Header>
    <BoardTitle />
    <BoardMembers />
    <OnlineUsers />
    <ThemeToggle />
  </Header>

  <Controls>
    <SearchAndFilters />
    <StatisticsToggle />
  </Controls>

  <DndContext>
    <ColumnsContainer>
      {columns.map(column => (
        <SortableColumn>
          <KanbanBoard column={column} />
        </SortableColumn>
      ))}
    </ColumnsContainer>
    <DragOverlay>
      <TaskCard isDragging />
    </DragOverlay>
  </DndContext>
</BoardPage>
```

**DnD система:**
- `@dnd-kit/core` для основной логики
- `@dnd-kit/sortable` для сортировки
- PointerSensor с активацией на 8px
- Оптимистичные обновления UI
- Синхронизация с сервером

**Realtime:**
- Подписка через `useRealtimeBoard`
- Обновления задач, колонок, комментариев
- Индикация онлайн пользователей

### Компоненты досок (Board)

#### KanbanBoard.jsx
**Назначение:** Одна колонка Kanban доски

**Props:**
- `column` - данные колонки
- `boardId` - ID доски
- `onModalStateChange` - коллбек изменения состояния модалки

**Функционал:**
- Отображение задач колонки
- Создание новых задач
- Редактирование названия колонки
- Удаление колонки
- Droppable зона для DnD

**Особенности:**
- Сортировка задач по position через useMemo
- Оптимистичные обновления при создании задач
- Права доступа через `useBoardPermissions`

#### SortableColumn.jsx
**Назначение:** Обертка для колонки с DnD функционалом

**Функционал:**
- Drag & Drop для изменения порядка колонок
- Передача событий в KanbanBoard

**Реализация:**
```jsx
const { attributes, listeners, setNodeRef, transform, transition } =
  useSortable({ id: column.id })
```

#### SortableTaskCard.jsx
**Назначение:** Обертка для карточки задачи с DnD

**Функционал:**
- Drag & Drop для перемещения задач
- Визуальная обратная связь при перетаскивании

**Стилизация:**
```jsx
style={{
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
}}
```

#### TaskCard.jsx
**Назначение:** Карточка задачи

**Функционал:**
- Отображение информации о задаче:
  - Название
  - Приоритет (цветовая индикация)
  - Метки
  - Срок выполнения (с индикацией просрочки)
  - Исполнитель (аватар)
  - Прогресс чек-листа
  - Количество комментариев
  - Количество вложений
- Открытие модального окна задачи

**Цветовая индикация приоритета:**
```jsx
urgent: 'border-l-4 border-red-500'
high: 'border-l-4 border-orange-500'
medium: 'border-l-4 border-yellow-500'
low: 'border-l-4 border-green-500'
```

#### BoardMembers.jsx
**Назначение:** Управление участниками доски

**Функционал:**
- Отображение списка участников
- Роли (владелец/участник)
- Приглашение новых участников
- Удаление участников (только владелец)

**Права:**
- Владелец может всё
- Участники видят список, не могут управлять

#### InviteMemberModal.jsx
**Назначение:** Модальное окно приглашения участника

**Функционал:**
- Форма ввода email
- Валидация email
- Отправка приглашения
- Уведомления об успехе/ошибке

#### BoardStatistics.jsx
**Назначение:** Статистика по доске

**Функционал:**
- Общее количество задач
- Распределение по колонкам
- Распределение по приоритетам
- Графики и диаграммы

#### OnlineUsers.jsx
**Назначение:** Индикация онлайн пользователей

**Функционал:**
- Список активных пользователей
- Аватары
- Real-time обновления

#### SearchAndFilters.jsx
**Назначение:** Поиск и фильтрация задач

**Функционал:**
- Поле поиска
- Фильтры по приоритету
- Фильтры по срокам
- Фильтры по исполнителю
- Фильтры по меткам
- Сортировка

**Состояние:**
- Управляется родительским компонентом (BoardPage)
- Передача через props

### Компоненты задач (Task)

#### TaskModal.jsx
**Назначение:** Модальное окно редактирования задачи

**Вкладки:**
1. **Детали** - основная информация
2. **Комментарии** - обсуждение задачи
3. **Файлы** - вложения
4. **Время** - трекинг времени
5. **Чек-лист** - список дел
6. **Метки** - категоризация

**Функционал:**
- Редактирование всех полей задачи
- Оптимистичные обновления
- Подтверждение при закрытии с несохраненными изменениями
- Удаление задачи
- Архивирование задачи

**Реализация через Portal:**
```jsx
return createPortal(
  <ModalContent />,
  document.body
)
```

**Управление состоянием:**
- Local state для редактируемых полей
- React Query для серверных данных
- Отслеживание изменений через useEffect

#### CommentItem.jsx
**Назначение:** Одиночный комментарий

**Функционал:**
- Отображение автора и времени
- Текст комментария
- Редактирование (свой комментарий)
- Удаление (свой или владелец доски)

**Особенности:**
- Форматирование даты (относительное время)
- Markdown рендеринг (опционально)

#### TaskAttachments.jsx
**Назначение:** Управление вложениями

**Функционал:**
- Список вложений
- Загрузка файлов (drag & drop, выбор)
- Предпросмотр:
  - Изображения - inline
  - PDF - iframe viewer
  - Текст - с UTF-8 кодировкой
- Скачивание файлов
- Удаление вложений

**Ограничения:**
- Максимальный размер: 5MB
- Типы: изображения, документы

**Реализация preview:**
```jsx
// Изображения
<img src={url} />

// PDF
<iframe src={url} />

// Текст
<pre>{await blob.text()}</pre>
```

#### TaskChecklist.jsx
**Назначение:** Чек-лист задачи

**Функционал:**
- Создание пунктов
- Отметка выполнения
- Редактирование текста
- Удаление пунктов
- Прогресс бар

**Состояние:**
- Локальное управление через useState
- Сохранение через React Query mutation

#### TaskLabels.jsx
**Назначение:** Управление метками задачи

**Функционал:**
- Отображение текущих меток
- Добавление меток из существующих
- Создание новых меток
- Удаление меток с задачи
- Выбор цвета для новых меток

**Цветовая палитра:**
```jsx
const colors = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
]
```

#### TaskTimeTracking.jsx
**Назначение:** Отслеживание времени работы

**Функционал:**
- Активный таймер
  - Запуск/остановка
  - Live отсчет
  - Автосохранение сессии
- Ручное добавление времени
  - Время начала/окончания
  - Описание сессии
- История сессий
  - Список всех записей
  - Общее время
  - Удаление сессий

**UI:**
- Gradient дизайн
- Иконки для действий
- Форматирование времени (ЧЧ:ММ:СС)

### Общие компоненты (Common)

#### ConfirmModal.jsx
**Назначение:** Модальное окно подтверждения

**Props:**
- `isOpen` - состояние видимости
- `onClose` - закрытие
- `onConfirm` - подтверждение
- `title` - заголовок
- `message` - сообщение
- `confirmText` - текст кнопки подтверждения
- `cancelText` - текст кнопки отмены
- `type` - тип (danger, warning, info)

**Типы:**
```jsx
danger: красная кнопка, иконка предупреждения
warning: желтая кнопка, иконка внимания
info: синяя кнопка, иконка информации
```

**Реализация через Portal:**
```jsx
return createPortal(
  <ModalContent />,
  document.body
)
```

#### ThemeToggle.jsx
**Назначение:** Переключатель темы

**Функционал:**
- Toggle между светлой/темной темой
- Сохранение в localStorage
- Анимированная иконка (солнце/луна)

**Интеграция:**
- Использует ThemeContext
- Применяет класс 'dark' к <html>

---

## Сервисы

### supabaseClient.js
**Назначение:** Инициализация Supabase клиента

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### authService.js
**Назначение:** Аутентификация пользователей

**Методы:**

```javascript
// Регистрация
async signUp(email, password)

// Вход
async signIn(email, password)

// Выход
async signOut()

// Получение текущего пользователя
async getCurrentUser()

// Обновление профиля
async updateProfile(userId, data)
```

**Обработка ошибок:**
- Валидация email
- Проверка длины пароля
- Обработка Supabase ошибок

### boardService.js
**Назначение:** Операции с досками

**Методы:**

```javascript
// Получение всех досок пользователя
async getBoards()

// Получение одной доски
async getBoard(boardId)

// Создание доски
async createBoard(title, description)

// Обновление доски
async updateBoard(boardId, updates)

// Удаление доски
async deleteBoard(boardId)

// Дублирование доски
async duplicateBoard(boardId, includeТasks)

// Получение статистики
async getBoardStatistics(boardId)
```

**SQL запросы:**
```javascript
// Получение доски со связанными данными
.select(`
  *,
  columns (
    *,
    tasks (
      *,
      comments (count),
      attachments (count)
    )
  ),
  board_members (
    *,
    profiles (*)
  )
`)
```

### columnService.js
**Назначение:** Управление колонками

**Методы:**

```javascript
// Создание колонки
async createColumn(boardId, title, position)

// Обновление колонки
async updateColumn(columnId, updates)

// Удаление колонки
async deleteColumn(columnId)

// Изменение порядка колонок
async reorderColumns(boardId, columnIds)
```

**Реализация reorderColumns:**
```javascript
// Batch update через RPC функцию
await supabase.rpc('reorder_columns', {
  board_id: boardId,
  column_ids: columnIds
})
```

### taskService.js
**Назначение:** Управление задачами

**Методы:**

```javascript
// Создание задачи
async createTask(columnId, boardId, title, description, position)

// Получение задачи
async getTask(taskId)

// Обновление задачи
async updateTask(taskId, updates)

// Удаление задачи
async deleteTask(taskId)

// Перемещение задачи
async moveTask(taskId, newColumnId, newPosition, allTaskIds)

// Архивирование
async archiveTask(taskId)
async unarchiveTask(taskId)
async getArchivedTasks(boardId)

// Комментарии
async getTaskComments(taskId)
async createComment(taskId, text)
async updateComment(commentId, text)
async deleteComment(commentId)
```

**Особенность moveTask:**
```javascript
// 1. Обновление задачи
await supabase
  .from('tasks')
  .update({ column_id: newColumnId, position: newPosition })
  .eq('id', taskId)

// 2. Переупорядочивание всей колонки
await supabase.rpc('reorder_column_tasks', {
  col_id: newColumnId,
  task_ids: allTaskIds
})
```

### attachmentService.js
**Назначение:** Управление вложениями

**Методы:**

```javascript
// Загрузка файла
async uploadAttachment(taskId, file)

// Получение вложений задачи
async getTaskAttachments(taskId)

// Удаление вложения
async deleteAttachment(attachmentId, filePath)

// Получение публичного URL
async getPublicUrl(filePath)
```

**Процесс загрузки:**
```javascript
// 1. Генерация уникального имени
const fileName = `${Date.now()}-${file.name}`
const filePath = `tasks/${taskId}/${fileName}`

// 2. Загрузка в Storage
await supabase.storage
  .from('attachments')
  .upload(filePath, file)

// 3. Создание записи в БД
await supabase
  .from('attachments')
  .insert({
    task_id: taskId,
    file_name: file.name,
    file_path: filePath,
    file_type: file.type,
    file_size: file.size
  })
```

### checklistService.js
**Назначение:** Управление чек-листами

**Методы:**

```javascript
// Создание пункта
async createChecklistItem(taskId, text)

// Обновление пункта
async updateChecklistItem(itemId, updates)

// Удаление пункта
async deleteChecklistItem(itemId)

// Отметка выполнения
async toggleChecklistItem(itemId, isCompleted)
```

### labelService.js
**Назначение:** Управление метками

**Методы:**

```javascript
// Создание метки
async createLabel(boardId, name, color)

// Получение меток доски
async getBoardLabels(boardId)

// Удаление метки
async deleteLabel(labelId)

// Назначение метки задаче
async addLabelToTask(taskId, labelId)

// Удаление метки с задачи
async removeLabelFromTask(taskId, labelId)

// Получение меток задачи
async getTaskLabels(taskId)
```

### timeTrackingService.js
**Назначение:** Отслеживание времени

**Методы:**

```javascript
// Создание сессии
async createTimeEntry(taskId, startTime, endTime, description)

// Получение сессий задачи
async getTaskTimeEntries(taskId)

// Обновление сессии
async updateTimeEntry(entryId, updates)

// Удаление сессии
async deleteTimeEntry(entryId)

// Получение общего времени
async getTotalTime(taskId)

// Активная сессия
async startTimer(taskId)
async stopTimer(entryId, endTime)
```

**Формат времени:**
```javascript
{
  id: uuid,
  task_id: uuid,
  user_id: uuid,
  start_time: timestamp,
  end_time: timestamp,
  duration: interval,
  description: string
}
```

### boardMemberService.js
**Назначение:** Управление участниками

**Методы:**

```javascript
// Приглашение участника
async inviteMember(boardId, email, role)

// Получение участников доски
async getBoardMembers(boardId)

// Удаление участника
async removeMember(boardId, userId)

// Обновление роли
async updateMemberRole(boardId, userId, newRole)

// Проверка доступа
async checkAccess(boardId, userId)
```

---

## Хуки (Hooks)

### useBoardPermissions.js
**Назначение:** Определение прав доступа на доске

**Возвращаемое значение:**
```javascript
{
  canManageColumns: boolean,  // Может управлять колонками
  canManageMembers: boolean,  // Может управлять участниками
  canDeleteBoard: boolean,     // Может удалить доску
  isOwner: boolean,            // Является владельцем
  role: 'owner' | 'member'     // Роль пользователя
}
```

**Реализация:**
```javascript
export function useBoardPermissions(boardId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const board = queryClient.getQueryData(['board', boardId])

  return useMemo(() => {
    const isOwner = board?.owner_id === user?.id

    return {
      canManageColumns: isOwner,
      canManageMembers: isOwner,
      canDeleteBoard: isOwner,
      isOwner,
      role: isOwner ? 'owner' : 'member'
    }
  }, [board, user])
}
```

### useCheckBoardAccess.js
**Назначение:** Проверка доступа к доске и автоматический редирект

**Использование:**
```javascript
function BoardPage() {
  const { id: boardId } = useParams()
  useCheckBoardAccess(boardId)
  // ...
}
```

**Реализация:**
```javascript
export function useCheckBoardAccess(boardId) {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function checkAccess() {
      const hasAccess = await boardMemberService.checkAccess(
        boardId,
        user?.id
      )

      if (!hasAccess) {
        toast.error('У вас нет доступа к этой доске')
        navigate('/dashboard')
      }
    }

    if (user && boardId) {
      checkAccess()
    }
  }, [boardId, user, navigate])
}
```

### useRealtimeBoard.js
**Назначение:** Realtime подписки для доски

**Подписки:**
- Tasks: INSERT, UPDATE, DELETE
- Columns: INSERT, UPDATE, DELETE
- Comments: все события
- Board Members: все события

**Реализация:**
```javascript
export function useRealtimeBoard(boardId) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const updateDebounceRef = useRef(null)

  useEffect(() => {
    const channel = supabase
      .channel(`board-${boardId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tasks',
        filter: `board_id=eq.${boardId}`
      }, (payload) => {
        queryClient.invalidateQueries(['board', boardId])

        if (payload.new?.created_by !== user.id) {
          toast.success('Новая задача добавлена')
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks',
        filter: `board_id=eq.${boardId}`
      }, (payload) => {
        // Debounce для избежания конфликтов
        if (updateDebounceRef.current) {
          clearTimeout(updateDebounceRef.current)
        }
        updateDebounceRef.current = setTimeout(() => {
          queryClient.invalidateQueries(['board', boardId])
        }, 500)
      })
      // ... другие подписки
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, user, queryClient])
}
```

**Debouncing UPDATE событий:**
- Предотвращает конфликты с оптимистичными обновлениями
- Задержка 500ms перед инвалидацией

### useRealtimeDashboard.js
**Назначение:** Realtime для списка досок

**Подписки:**
- Boards: INSERT, UPDATE, DELETE
- Board Members: добавление/удаление пользователя

**Особенности:**
- Уведомления только для изменений от других пользователей
- Автоматическое обновление списка

### useTasksWithLabels.js
**Назначение:** Получение задач с метками и фильтрация

**Возвращаемое значение:**
```javascript
{
  tasks: Task[],           // Отфильтрованные задачи
  allLabels: Label[],      // Все метки доски
  isLoading: boolean
}
```

**Фильтрация:**
```javascript
const filteredTasks = tasks.filter(task => {
  if (selectedLabels.length === 0) return true

  return selectedLabels.every(labelId =>
    task.labels.some(label => label.id === labelId)
  )
})
```

---

## Управление состоянием

### 1. Серверное состояние (React Query)

**Конфигурация:**
```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000
    }
  }
})
```

**Примеры использования:**

#### Получение данных
```javascript
const { data: board, isLoading } = useQuery({
  queryKey: ['board', boardId],
  queryFn: () => boardService.getBoard(boardId)
})
```

#### Мутации с оптимистичными обновлениями
```javascript
const createTaskMutation = useMutation({
  mutationFn: (data) => taskService.createTask(data),

  onMutate: async (newTask) => {
    // Отмена текущих refetch
    await queryClient.cancelQueries(['board', boardId])

    // Сохранение предыдущего состояния
    const previousBoard = queryClient.getQueryData(['board', boardId])

    // Оптимистичное обновление
    queryClient.setQueryData(['board', boardId], (old) => {
      // Добавление временной задачи
      return {
        ...old,
        columns: old.columns.map(col =>
          col.id === newTask.columnId
            ? { ...col, tasks: [...col.tasks, tempTask] }
            : col
        )
      }
    })

    return { previousBoard }
  },

  onError: (error, variables, context) => {
    // Откат изменений при ошибке
    queryClient.setQueryData(
      ['board', boardId],
      context.previousBoard
    )
    toast.error('Ошибка создания задачи')
  },

  onSuccess: () => {
    // Синхронизация с сервером
    queryClient.invalidateQueries(['board', boardId])
    toast.success('Задача создана')
  }
})
```

### 2. Глобальное состояние (Context API)

#### AuthContext
**Назначение:** Управление аутентификацией

```javascript
const AuthContext = createContext({
  user: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {}
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Проверка текущей сессии
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Подписка на изменения сессии
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

#### ThemeContext
**Назначение:** Управление темой

```javascript
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

### 3. Локальное состояние (useState)

**Использование для:**
- Состояние форм
- UI состояние (открыт/закрыт)
- Временные данные

**Примеры:**
```javascript
// Состояние модального окна
const [isOpen, setIsOpen] = useState(false)

// Состояние формы
const [formData, setFormData] = useState({
  title: '',
  description: ''
})

// Флаги
const [isLoading, setIsLoading] = useState(false)
```

---

## Realtime синхронизация

### Архитектура Realtime

```
┌─────────────────────────────────────────┐
│         React Component                 │
│  ┌────────────────────────────────────┐ │
│  │   useRealtimeBoard(boardId)        │ │
│  └────────────────────────────────────┘ │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│      Supabase Realtime Channel          │
│  channel(`board-${boardId}`)            │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  postgres_changes subscription     │ │
│  │  - tasks: INSERT/UPDATE/DELETE     │ │
│  │  - columns: INSERT/UPDATE/DELETE   │ │
│  │  - comments: *                     │ │
│  │  - board_members: *                │ │
│  └────────────────────────────────────┘ │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│         PostgreSQL Database             │
│                                          │
│  Triggers send changes to Realtime      │
└─────────────────────────────────────────┘
```

### Типы событий

#### INSERT
```javascript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'tasks',
  filter: `board_id=eq.${boardId}`
}, (payload) => {
  console.log('New task:', payload.new)

  queryClient.invalidateQueries(['board', boardId])

  // Уведомление только для других пользователей
  if (payload.new.created_by !== currentUser.id) {
    toast.success('Новая задача добавлена')
  }
})
```

#### UPDATE
```javascript
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'tasks',
  filter: `board_id=eq.${boardId}`
}, (payload) => {
  console.log('Task updated:', payload.new)

  // Debounce для предотвращения конфликтов
  clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    queryClient.invalidateQueries(['board', boardId])
  }, 500)
})
```

#### DELETE
```javascript
.on('postgres_changes', {
  event: 'DELETE',
  schema: 'public',
  table: 'tasks',
  filter: `board_id=eq.${boardId}`
}, (payload) => {
  console.log('Task deleted:', payload.old)

  queryClient.invalidateQueries(['board', boardId])
  toast('Задача удалена', { icon: '🗑️' })
})
```

### Обработка ошибок соединения

```javascript
.subscribe((status, err) => {
  console.log('Realtime status:', status)

  if (status === 'SUBSCRIBED') {
    console.log('Successfully subscribed to realtime')
  } else if (status === 'CHANNEL_ERROR') {
    console.error('Channel error:', err)

    // Переподключение через 5 секунд
    setTimeout(() => {
      setupChannel()
    }, 5000)
  } else if (status === 'TIMED_OUT') {
    console.error('Connection timed out')
  }
})
```

### Оптимизации

#### 1. Debouncing UPDATE событий
Предотвращает множественные refetch при быстрых изменениях:
```javascript
const updateDebounceRef = useRef(null)

// В обработчике UPDATE
if (updateDebounceRef.current) {
  clearTimeout(updateDebounceRef.current)
}
updateDebounceRef.current = setTimeout(() => {
  queryClient.invalidateQueries(['board', boardId])
}, 500)
```

#### 2. Фильтрация собственных событий
Не показывать уведомления о своих действиях:
```javascript
if (payload.new?.created_by !== user.id) {
  toast.success('Новая задача добавлена')
}
```

#### 3. Условная инвалидация
Инвалидировать только нужные запросы:
```javascript
// Комментарии - только для конкретной задачи
queryClient.invalidateQueries(['comments', taskId])

// Доска - для всех изменений задач/колонок
queryClient.invalidateQueries(['board', boardId])
```

---

## Система прав доступа

### Уровни доступа

#### 1. Row Level Security (RLS) в PostgreSQL

**Политики для таблицы boards:**
```sql
-- Чтение: владелец или участник
CREATE POLICY "Users can read boards they have access to"
  ON boards FOR SELECT
  USING (
    auth.uid() = owner_id
    OR
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = id
      AND user_id = auth.uid()
    )
  );

-- Обновление: только владелец
CREATE POLICY "Only owner can update board"
  ON boards FOR UPDATE
  USING (auth.uid() = owner_id);

-- Удаление: только владелец
CREATE POLICY "Only owner can delete board"
  ON boards FOR DELETE
  USING (auth.uid() = owner_id);
```

**Политики для таблицы tasks:**
```sql
-- Чтение: доступ к доске
CREATE POLICY "Users can read tasks if they have board access"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = board_id
      AND (
        owner_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM board_members
          WHERE board_id = boards.id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Создание/Обновление: участники могут
CREATE POLICY "Board members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = board_id
      AND (
        owner_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM board_members
          WHERE board_id = boards.id
          AND user_id = auth.uid()
        )
      )
    )
  );
```

#### 2. Проверки на уровне приложения

**useBoardPermissions хук:**
```javascript
export function useBoardPermissions(boardId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const board = queryClient.getQueryData(['board', boardId])

  return useMemo(() => {
    const isOwner = board?.owner_id === user?.id

    return {
      // Только владелец
      canManageColumns: isOwner,
      canManageMembers: isOwner,
      canDeleteBoard: isOwner,

      // Все участники
      canCreateTasks: true,
      canEditTasks: true,
      canComment: true,

      isOwner,
      role: isOwner ? 'owner' : 'member'
    }
  }, [board, user])
}
```

**Использование в компонентах:**
```javascript
function KanbanBoard({ column, boardId }) {
  const permissions = useBoardPermissions(boardId)

  return (
    <div>
      {permissions.canManageColumns && (
        <button onClick={deleteColumn}>
          Удалить колонку
        </button>
      )}

      {/* Создание задач доступно всем */}
      <button onClick={createTask}>
        Создать задачу
      </button>
    </div>
  )
}
```

### Матрица прав доступа

| Действие                  | Владелец | Участник | Гость |
|---------------------------|----------|----------|-------|
| Просмотр доски           | ✅       | ✅       | ❌    |
| Создание задач           | ✅       | ✅       | ❌    |
| Редактирование задач     | ✅       | ✅       | ❌    |
| Удаление задач           | ✅       | ✅       | ❌    |
| Комментирование          | ✅       | ✅       | ❌    |
| Создание колонок         | ✅       | ❌       | ❌    |
| Редактирование колонок   | ✅       | ❌       | ❌    |
| Удаление колонок         | ✅       | ❌       | ❌    |
| Приглашение участников   | ✅       | ❌       | ❌    |
| Удаление участников      | ✅       | ❌       | ❌    |
| Изменение настроек доски | ✅       | ❌       | ❌    |
| Удаление доски           | ✅       | ❌       | ❌    |

---

## Drag & Drop реализация

### Архитектура DnD

```
BoardPage (DndContext)
├── sensors (PointerSensor)
├── collisionDetection (closestCenter)
│
├── Handlers
│   ├── onDragStart
│   ├── onDragOver
│   ├── onDragEnd
│   └── onDragCancel
│
├── SortableContext (horizontal - колонки)
│   └── SortableColumn[]
│       └── KanbanBoard
│           └── SortableContext (vertical - задачи)
│               └── SortableTaskCard[]
│                   └── TaskCard
│
└── DragOverlay
    └── TaskCard (предпросмотр)
```

### Конфигурация сенсоров

```javascript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8  // Начало драга после 8px движения
    }
  })
)
```

### Обработчики событий

#### onDragStart
```javascript
const handleDragStart = (event) => {
  // Определяем что перетаскиваем
  const task = findTask(event.active.id)
  if (task) {
    setActiveTask(task)
    document.body.style.cursor = 'grabbing'
    return
  }

  const column = findColumn(event.active.id)
  if (column) {
    setActiveColumn(column)
    document.body.style.cursor = 'grabbing'
  }
}
```

#### onDragOver
```javascript
const handleDragOver = (event) => {
  const { over } = event
  setOverId(over?.id || null)  // Для визуальной обратной связи
}
```

#### onDragEnd
```javascript
const handleDragEnd = (event) => {
  const { active, over } = event

  if (!over) return

  const activeId = active.id
  const overId = over.id

  // 1. Определяем целевую колонку и позицию
  let newColumnId, newPosition

  if (overId.startsWith('column-')) {
    // Дроп на пустую область колонки
    newColumnId = overId.replace('column-', '')
    newPosition = targetColumn.tasks.length
  } else {
    // Дроп на другую задачу
    const overTask = findTask(overId)
    newColumnId = overTask.column_id

    const sortedTasks = targetColumn.tasks.sort((a, b) =>
      a.position - b.position
    )
    newPosition = sortedTasks.findIndex(t => t.id === overId)
  }

  // 2. Оптимистичное обновление UI
  queryClient.setQueryData(['board', boardId], (old) => {
    // Пересчет позиций задач
    const newColumns = old.columns.map((col) => {
      if (col.id === sourceColumn) {
        // Удаляем из исходной колонки
        return {
          ...col,
          tasks: col.tasks
            .filter(t => t.id !== activeId)
            .map((t, idx) => ({ ...t, position: idx }))
        }
      } else if (col.id === newColumnId) {
        // Добавляем в целевую колонку
        const tasks = [...col.tasks]
        tasks.splice(newPosition, 0, activeTask)
        return {
          ...col,
          tasks: tasks.map((t, idx) => ({ ...t, position: idx }))
        }
      }
      return col
    })

    return { ...old, columns: newColumns }
  })

  // 3. Отправка на сервер
  moveTaskMutation.mutate({
    taskId: activeId,
    newColumnId,
    newPosition,
    allTaskIds: finalTaskOrder
  })

  // Сброс состояния
  setActiveTask(null)
  document.body.style.cursor = ''
}
```

### Сортировка задач

**Проблема:** Задачи в БД могут быть не отсортированы

**Решение:** useMemo в KanbanBoard
```javascript
const sortedTasks = useMemo(() => {
  return [...(column.tasks || [])]
    .sort((a, b) => a.position - b.position)
}, [column.tasks])

const taskIds = sortedTasks.map(task => task.id)

return (
  <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
    {sortedTasks.map(task => (
      <SortableTaskCard key={task.id} task={task} />
    ))}
  </SortableContext>
)
```

### Оптимизации

#### 1. Debouncing realtime обновлений
```javascript
// В useRealtimeBoard
.on('postgres_changes', {
  event: 'UPDATE',
  table: 'tasks'
}, (payload) => {
  clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    queryClient.invalidateQueries(['board', boardId])
  }, 500)
})
```

#### 2. Синхронизация после успешной мутации
```javascript
const moveTaskMutation = useMutation({
  mutationFn: taskService.moveTask,
  onSuccess: () => {
    // Задержка для завершения RPC функции
    setTimeout(() => {
      queryClient.invalidateQueries(['board', boardId])
    }, 300)
  }
})
```

#### 3. Приведение ID к строкам
```javascript
// Проблема: ID могут быть разных типов (string/UUID)
const isSameColumn = String(activeTask.column_id) === String(newColumnId)
```

### Визуальная обратная связь

#### DragOverlay
```javascript
<DragOverlay>
  {activeTask && (
    <div className="rotate-3 opacity-90">
      <TaskCard task={activeTask} isDragging />
    </div>
  )}
</DragOverlay>
```

#### Стили при перетаскивании
```javascript
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
  cursor: isDragging ? 'grabbing' : 'grab'
}
```

---

## Темная тема

### Реализация

#### 1. ThemeContext
```javascript
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Проверка localStorage
    const saved = localStorage.getItem('theme')
    if (saved) return saved

    // Проверка системной темы
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }

    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

#### 2. Tailwind конфигурация
```javascript
// tailwind.config.js
export default {
  darkMode: 'class',  // Использование класса 'dark'
  theme: {
    extend: {
      colors: {
        // Кастомные цвета для темной темы
      }
    }
  }
}
```

#### 3. CSS переменные для toast
```css
:root {
  --toast-bg: #ffffff;
  --toast-color: #1f2937;
}

.dark {
  --toast-bg: #1f2937;
  --toast-color: #f9fafb;
}
```

#### 4. Toaster конфигурация
```javascript
<Toaster
  position="top-right"
  toastOptions={{
    style: {
      background: 'var(--toast-bg)',
      color: 'var(--toast-color)',
    }
  }}
/>
```

### Стилизация компонентов

#### Паттерн Tailwind dark mode
```jsx
<div className="bg-white dark:bg-gray-800">
  <h1 className="text-gray-900 dark:text-white">
    Title
  </h1>
  <p className="text-gray-600 dark:text-gray-400">
    Description
  </p>
</div>
```

#### Градиенты
```jsx
<div className="bg-gradient-to-r from-blue-500 to-purple-600
                dark:from-blue-600 dark:to-purple-700">
  Gradient background
</div>
```

#### Границы и тени
```jsx
<div className="border border-gray-300 dark:border-gray-600
                shadow-lg dark:shadow-gray-900/50">
  Content
</div>
```

### Анимации переходов

Плавное переключение темы через CSS transitions:
```css
* {
  transition-property: background-color, border-color, color;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## База данных (Supabase PostgreSQL)

### Схема таблиц

#### boards
```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  background_color VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### columns
```sql
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### tasks
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  position INTEGER NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  due_date TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### comments
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### attachments
```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### board_members
```sql
CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(board_id, user_id)
);
```

#### labels
```sql
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### task_labels
```sql
CREATE TABLE task_labels (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);
```

#### checklist_items
```sql
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### time_entries
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INTERVAL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### RPC функции

#### reorder_column_tasks
```sql
CREATE OR REPLACE FUNCTION reorder_column_tasks(
  col_id UUID,
  task_ids UUID[]
)
RETURNS void AS $$
BEGIN
  FOR i IN 1..array_length(task_ids, 1) LOOP
    UPDATE tasks
    SET position = i - 1
    WHERE id = task_ids[i]
    AND column_id = col_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

#### reorder_columns
```sql
CREATE OR REPLACE FUNCTION reorder_columns(
  board_id UUID,
  column_ids UUID[]
)
RETURNS void AS $$
BEGIN
  FOR i IN 1..array_length(column_ids, 1) LOOP
    UPDATE columns
    SET position = i - 1
    WHERE id = column_ids[i]
    AND board_id = board_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## Заключение

TaskFlow - это полнофункциональное приложение для управления задачами, демонстрирующее современные практики разработки:

### Технические достижения:
- ✅ Современный стек (React 19, Vite, Supabase)
- ✅ Продвинутое управление состоянием (React Query + Context)
- ✅ Real-time синхронизация
- ✅ Оптимистичные обновления UI
- ✅ Drag & Drop с @dnd-kit
- ✅ Row Level Security
- ✅ React Portals для модальных окон
- ✅ Темная тема
- ✅ Адаптивный дизайн

### Функциональные возможности:
- ✅ Kanban доски
- ✅ Многопользовательская работа
- ✅ Комментарии и обсуждения
- ✅ Файловые вложения
- ✅ Чек-листы
- ✅ Метки и фильтрация
- ✅ Отслеживание времени
- ✅ Статистика и аналитика

Приложение готово к использованию и дальнейшему развитию.

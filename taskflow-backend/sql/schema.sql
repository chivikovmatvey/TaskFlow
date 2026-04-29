-- TaskFlow database schema for Microsoft SQL Server
-- Создаёт базу данных taskflow и все таблицы

IF DB_ID('taskflow') IS NULL
BEGIN
    CREATE DATABASE taskflow;
END
GO

USE taskflow;
GO

-- Users (заменяет Supabase Auth + profiles)
IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(255) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- Boards
IF OBJECT_ID('dbo.boards', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.boards (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        background_color NVARCHAR(20) NOT NULL DEFAULT '#3b82f6',
        owner_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_boards_owner FOREIGN KEY (owner_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );
END
GO

-- Columns
IF OBJECT_ID('dbo.columns', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.columns (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        board_id UNIQUEIDENTIFIER NOT NULL,
        title NVARCHAR(255) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_columns_board FOREIGN KEY (board_id) REFERENCES dbo.boards(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_columns_board ON dbo.columns(board_id);
END
GO

-- Tasks
IF OBJECT_ID('dbo.tasks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tasks (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        board_id UNIQUEIDENTIFIER NOT NULL,
        column_id UNIQUEIDENTIFIER NOT NULL,
        title NVARCHAR(500) NOT NULL,
        description NVARCHAR(MAX) NULL,
        position INT NOT NULL DEFAULT 0,
        priority NVARCHAR(20) NOT NULL DEFAULT 'medium',
        due_date DATETIMEOFFSET NULL,
        assigned_to UNIQUEIDENTIFIER NULL,
        created_by UNIQUEIDENTIFIER NULL,
        is_archived BIT NOT NULL DEFAULT 0,
        archived_at DATETIMEOFFSET NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_tasks_board FOREIGN KEY (board_id) REFERENCES dbo.boards(id) ON DELETE CASCADE,
        CONSTRAINT FK_tasks_column FOREIGN KEY (column_id) REFERENCES dbo.columns(id),
        CONSTRAINT FK_tasks_assigned FOREIGN KEY (assigned_to) REFERENCES dbo.users(id),
        CONSTRAINT FK_tasks_creator FOREIGN KEY (created_by) REFERENCES dbo.users(id)
    );
    CREATE INDEX IX_tasks_board ON dbo.tasks(board_id);
    CREATE INDEX IX_tasks_column ON dbo.tasks(column_id);
END
GO

-- Comments
IF OBJECT_ID('dbo.comments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.comments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_comments_task FOREIGN KEY (task_id) REFERENCES dbo.tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_comments_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
    );
    CREATE INDEX IX_comments_task ON dbo.comments(task_id);
END
GO

-- Board members
IF OBJECT_ID('dbo.board_members', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.board_members (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        board_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        user_email NVARCHAR(255) NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'viewer',
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_members_board FOREIGN KEY (board_id) REFERENCES dbo.boards(id) ON DELETE CASCADE,
        CONSTRAINT FK_members_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT UQ_member UNIQUE (board_id, user_id)
    );
END
GO

-- Labels
IF OBJECT_ID('dbo.labels', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.labels (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        board_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(100) NOT NULL,
        color NVARCHAR(20) NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_labels_board FOREIGN KEY (board_id) REFERENCES dbo.boards(id) ON DELETE CASCADE
    );
END
GO

-- Task labels
IF OBJECT_ID('dbo.task_labels', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.task_labels (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_id UNIQUEIDENTIFIER NOT NULL,
        label_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_tl_task FOREIGN KEY (task_id) REFERENCES dbo.tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_tl_label FOREIGN KEY (label_id) REFERENCES dbo.labels(id),
        CONSTRAINT UQ_task_label UNIQUE (task_id, label_id)
    );
END
GO

-- Checklist items
IF OBJECT_ID('dbo.checklist_items', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.checklist_items (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_id UNIQUEIDENTIFIER NOT NULL,
        title NVARCHAR(500) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        is_completed BIT NOT NULL DEFAULT 0,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_checklist_task FOREIGN KEY (task_id) REFERENCES dbo.tasks(id) ON DELETE CASCADE
    );
END
GO

-- Task attachments
IF OBJECT_ID('dbo.task_attachments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.task_attachments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_id UNIQUEIDENTIFIER NOT NULL,
        file_name NVARCHAR(500) NOT NULL,
        file_path NVARCHAR(1000) NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        file_type NVARCHAR(255) NULL,
        uploaded_by UNIQUEIDENTIFIER NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_attach_task FOREIGN KEY (task_id) REFERENCES dbo.tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_attach_user FOREIGN KEY (uploaded_by) REFERENCES dbo.users(id)
    );
END
GO

-- Time tracking
IF OBJECT_ID('dbo.time_tracking', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.time_tracking (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        started_at DATETIMEOFFSET NOT NULL,
        ended_at DATETIMEOFFSET NULL,
        duration INT NULL,
        notes NVARCHAR(MAX) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_time_task FOREIGN KEY (task_id) REFERENCES dbo.tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_time_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
    );
END
GO

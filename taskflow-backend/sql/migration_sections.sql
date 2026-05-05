-- Миграция: добавление разделов (sections), участников разделов, лога действий
USE taskflow;
GO

-- Разделы
IF OBJECT_ID('dbo.sections', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.sections (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        color NVARCHAR(20) NOT NULL DEFAULT '#cc785c',
        owner_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_sections_owner FOREIGN KEY (owner_id) REFERENCES dbo.users(id)
    );
END
GO

-- Участники разделов
IF OBJECT_ID('dbo.section_members', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.section_members (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        section_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        user_email NVARCHAR(255) NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'viewer', -- viewer / member / admin
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_smembers_section FOREIGN KEY (section_id) REFERENCES dbo.sections(id) ON DELETE CASCADE,
        CONSTRAINT FK_smembers_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT UQ_section_member UNIQUE (section_id, user_id)
    );
END
GO

-- Колонка section_id в boards
IF NOT EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.boards') AND name = 'section_id'
)
BEGIN
    ALTER TABLE dbo.boards ADD section_id UNIQUEIDENTIFIER NULL;
    ALTER TABLE dbo.boards ADD CONSTRAINT FK_boards_section
        FOREIGN KEY (section_id) REFERENCES dbo.sections(id);
END
GO

-- Лог действий
IF OBJECT_ID('dbo.activity_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.activity_log (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        board_id UNIQUEIDENTIFIER NULL,
        user_id UNIQUEIDENTIFIER NULL,
        action NVARCHAR(80) NOT NULL,            -- task.created, task.moved, comment.added, ...
        entity_type NVARCHAR(40) NOT NULL,       -- task / column / comment / board / member
        entity_id UNIQUEIDENTIFIER NULL,
        title NVARCHAR(500) NULL,
        details NVARCHAR(MAX) NULL,              -- JSON
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX IX_activity_board ON dbo.activity_log(board_id, created_at DESC);
    CREATE INDEX IX_activity_user ON dbo.activity_log(user_id, created_at DESC);
END
GO

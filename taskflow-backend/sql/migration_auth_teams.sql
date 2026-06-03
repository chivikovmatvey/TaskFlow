-- Миграция: username, email verification, OAuth, teams
USE taskflow;
GO

-- ─────────────── USERS: новые колонки ───────────────

-- username (уникальный, через @)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'username')
BEGIN
    ALTER TABLE dbo.users ADD username NVARCHAR(50) NULL;
END
GO

-- Уникальный индекс на username (NULL допустим)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_users_username' AND object_id = OBJECT_ID('dbo.users'))
BEGIN
    CREATE UNIQUE INDEX UQ_users_username ON dbo.users(username) WHERE username IS NOT NULL;
END
GO

-- email_verified
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'email_verified')
BEGIN
    ALTER TABLE dbo.users ADD email_verified BIT NOT NULL DEFAULT 0;
END
GO

-- auth_provider: 'email' | 'google' | 'yandex' | 'telegram'
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'auth_provider')
BEGIN
    ALTER TABLE dbo.users ADD auth_provider NVARCHAR(20) NOT NULL DEFAULT 'email';
END
GO

-- OAuth IDs
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'google_id')
BEGIN
    ALTER TABLE dbo.users ADD google_id NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'yandex_id')
BEGIN
    ALTER TABLE dbo.users ADD yandex_id NVARCHAR(100) NULL;
END
GO

-- password_hash должен быть NULL-able (OAuth-юзер может не иметь пароля)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'password_hash' AND is_nullable = 0)
BEGIN
    ALTER TABLE dbo.users ALTER COLUMN password_hash NVARCHAR(255) NULL;
END
GO

-- avatar_url (URLы Google/Yandex могут быть длинными)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'avatar_url')
BEGIN
    ALTER TABLE dbo.users ADD avatar_url NVARCHAR(2000) NULL;
END
ELSE
BEGIN
    ALTER TABLE dbo.users ALTER COLUMN avatar_url NVARCHAR(2000) NULL;
END
GO

-- ─────────────── Email verification codes ───────────────

IF OBJECT_ID('dbo.email_verification_codes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.email_verification_codes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL,
        code NVARCHAR(10) NOT NULL,
        purpose NVARCHAR(30) NOT NULL DEFAULT 'register', -- register | login | telegram-register | oauth-link
        payload NVARCHAR(MAX) NULL, -- JSON: данные для финализации регистрации (full_name, username, password_hash, telegram_chat_id и т.п.)
        expires_at DATETIMEOFFSET NOT NULL,
        used_at DATETIMEOFFSET NULL,
        attempts INT NOT NULL DEFAULT 0,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX IX_evc_email ON dbo.email_verification_codes(email);
END
GO

-- ─────────────── Teams ───────────────

IF OBJECT_ID('dbo.teams', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.teams (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        color NVARCHAR(20) NOT NULL DEFAULT '#f97316',
        owner_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_teams_owner FOREIGN KEY (owner_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID('dbo.team_members', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.team_members (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        team_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'member', -- owner | member
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_tm_team FOREIGN KEY (team_id) REFERENCES dbo.teams(id) ON DELETE CASCADE,
        CONSTRAINT FK_tm_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT UQ_team_member UNIQUE (team_id, user_id)
    );
    CREATE INDEX IX_tm_user ON dbo.team_members(user_id);
END
GO

-- ─────────────── Telegram register sessions ───────────────
-- Используется для регистрации нового аккаунта через TG бота
IF OBJECT_ID('dbo.tg_register_sessions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tg_register_sessions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        code NVARCHAR(40) NOT NULL UNIQUE,
        status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | telegram_verified | completed
        telegram_chat_id BIGINT NULL,
        telegram_username NVARCHAR(100) NULL,
        telegram_first_name NVARCHAR(255) NULL,
        expires_at DATETIMEOFFSET NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- Старые пользователи (которые регистрировались до миграции) считаются верифицированными
UPDATE dbo.users SET email_verified = 1 WHERE email_verified = 0;
GO

-- is_admin (для админ-панели)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'is_admin')
BEGIN
    ALTER TABLE dbo.users ADD is_admin BIT NOT NULL DEFAULT 0;
END
GO

-- last_seen (presence)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'last_seen')
BEGIN
    ALTER TABLE dbo.users ADD last_seen DATETIMEOFFSET NULL;
END
GO

-- tg_register_sessions — расширение для login-flow
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tg_register_sessions') AND name = 'purpose')
BEGIN
    ALTER TABLE dbo.tg_register_sessions ADD purpose NVARCHAR(20) NOT NULL DEFAULT 'register';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tg_register_sessions') AND name = 'user_id')
BEGIN
    ALTER TABLE dbo.tg_register_sessions ADD user_id UNIQUEIDENTIFIER NULL;
END
GO

-- Миграция: поддержка Telegram уведомлений
USE taskflow;
GO

-- Telegram username (для отображения) и chat_id (для отправки)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'telegram_username')
BEGIN
    ALTER TABLE dbo.users ADD telegram_username NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'telegram_chat_id')
BEGIN
    ALTER TABLE dbo.users ADD telegram_chat_id BIGINT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'telegram_link_code')
BEGIN
    ALTER TABLE dbo.users ADD telegram_link_code NVARCHAR(40) NULL;
END
GO

-- Уровень уведомлений (можно отключить)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'notify_telegram')
BEGIN
    ALTER TABLE dbo.users ADD notify_telegram BIT NOT NULL DEFAULT 1;
END
GO

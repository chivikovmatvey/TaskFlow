IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.task_attachments') AND name = 'file_data')
BEGIN
    ALTER TABLE dbo.task_attachments ADD file_data VARBINARY(MAX) NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.task_attachments') AND name = 'file_path' AND is_nullable = 0)
BEGIN
    ALTER TABLE dbo.task_attachments ALTER COLUMN file_path NVARCHAR(1000) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'avatar_data')
BEGIN
    ALTER TABLE dbo.users ADD avatar_data VARBINARY(MAX) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'avatar_mime')
BEGIN
    ALTER TABLE dbo.users ADD avatar_mime NVARCHAR(100) NULL;
END
GO

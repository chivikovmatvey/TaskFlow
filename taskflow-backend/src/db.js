import sql from 'mssql'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'taskflow',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Pass1234!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    cryptoCredentialsDetails: {
      minVersion: 'TLSv1',
      ciphers: 'DEFAULT@SECLEVEL=0',
    },
  },
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let poolPromise = null

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

async function connectWithRetry(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const pool = await new sql.ConnectionPool(config).connect()
      console.log('✅ Connected to SQL Server')
      return pool
    } catch (err) {
      if (attempt === retries) {
        console.error('❌ SQL Server connection failed after', retries, 'attempts:', err.message)
        throw err
      }
      console.warn(`⏳ SQL Server не готов (попытка ${attempt}/${retries}), повтор через ${delayMs / 1000}с...`)
      await delay(delayMs)
    }
  }
}

export function getPool() {
  if (!poolPromise) {
    poolPromise = connectWithRetry().catch((err) => {
      poolPromise = null
      throw err
    })
  }
  return poolPromise
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function inferType(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    if (UUID_RE.test(value)) return sql.UniqueIdentifier
    return sql.NVarChar(sql.MAX)
  }
  if (typeof value === 'boolean') return sql.Bit
  if (typeof value === 'number') {
    return Number.isInteger(value) ? sql.BigInt : sql.Float
  }
  if (typeof value === 'bigint') return sql.BigInt
  if (value instanceof Date) return sql.DateTimeOffset
  if (Buffer.isBuffer(value)) return sql.VarBinary(sql.MAX)
  return null
}

export async function query(text, params = {}) {
  const pool = await getPool()
  const request = pool.request()
  for (const [key, value] of Object.entries(params)) {
    const type = inferType(value)
    if (type) {
      request.input(key, type, value)
    } else {
      request.input(key, value)
    }
  }
  return request.query(text)
}

export { sql }

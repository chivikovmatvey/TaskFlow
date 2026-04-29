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
  },
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let poolPromise = null

export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log('✅ Connected to SQL Server')
        return pool
      })
      .catch((err) => {
        console.error('❌ SQL Server connection failed:', err)
        poolPromise = null
        throw err
      })
  }
  return poolPromise
}

export async function query(text, params = {}) {
  const pool = await getPool()
  const request = pool.request()
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value)
  }
  return request.query(text)
}

export { sql }

import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // necesario para RDS con SSL sin certs personalizados
  }
})

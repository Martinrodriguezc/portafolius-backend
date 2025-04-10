import dotenv from "dotenv";
import { Pool } from 'pg'

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  /*ssl: {
    rejectUnauthorized: false // necesario para RDS con SSL sin certs personalizados
  }*/
})

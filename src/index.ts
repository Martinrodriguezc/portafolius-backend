import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("PortafoliUS Backend 🩻");
});


pool.query('SELECT NOW()')
  .then(res => console.log('✅ DB conectada:', res.rows[0]))
  .catch(err => console.error('❌ Error de conexión DB:', err))


app.listen(PORT, () => {
  console.log(`🚀 Server running`);
});

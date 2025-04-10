import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool } from "./config/db";
import userRouter from "./routes/authRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV === "production") {
  // Si usas un reverse proxy, habilita trust proxy
  app.enable("trust proxy");

  // Aplicar Helmet para seguridad de cabeceras HTTP
  app.use(helmet());

  // Configurar rate limiting: máximo 100 peticiones en 15 minutos por IP
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite de 100 peticiones por IP
    message: "Demasiadas peticiones. Por favor, inténtalo de nuevo más tarde.",
  });
  app.use(limiter);

  // Configurar CORS con orígenes permitidos en producción
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [];
  app.use(
    cors({
      origin: allowedOrigins,
      optionsSuccessStatus: 200,
    })
  );
} else {
  app.use(cors());
}

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("PortafoliUS Backend 🩻");
});

app.use("/users", userRouter);

pool
  .query("SELECT NOW()")
  .then((dbRes) => console.log("✅ DB conectada:", dbRes.rows[0]))
  .catch((err) => console.error("❌ Error de conexión DB:", err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

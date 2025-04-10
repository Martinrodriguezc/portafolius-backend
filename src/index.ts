import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool } from "./config/db";
import userRouter from "./routes/authRoutes";
import { config } from "./config";
import logger from "./config/logger";

const app = express();
const PORT = config.PORT;
const NODE_ENV = config.NODE_ENV;

if (NODE_ENV === "production") {
  //Seguridad de cabeceras HTTP
  app.use(helmet());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 peticiones por IP
    message: "Demasiadas peticiones. Por favor, inténtalo de nuevo más tarde.",
  });
  app.use(limiter);

  // Configurar CORS con orígenes permitidos
  const allowedOrigins = config.ALLOWED_ORIGINS;

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

app.use("/users", userRouter);

pool
  .query("SELECT NOW()")
  .then((dbRes) => logger.info("DB conectada:", dbRes.rows[0]))
  .catch((err) => logger.error("Error de conexión DB:", err));

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

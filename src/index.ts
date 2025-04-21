import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool } from "./config/db";
import uploadRouter from "./routes/videoRoutes";
import studyRouter from "./routes/studyRoutes";
import authRouter from "./routes/authRoutes";
import userRouter from "./routes/userRoutes";
import teacherRouter from "./routes/teacherRoutes";
import evaluationRouter from "./routes/evaluationRoutes";
import { config } from "./config";
import logger from "./config/logger";
import { Request, Response } from "express";
import { initializeDatabase } from "./db/initDb";

dotenv.config();

const app = express();
const PORT = config.PORT || 3000;
const NODE_ENV = config.NODE_ENV;

if (NODE_ENV === "production") {
  //Seguridad de headers en HTTP
  app.use(helmet());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 peticiones por IP
    message: "Demasiadas peticiones. Por favor, inténtalo de nuevo más tarde.",
  });
  app.use(limiter);

  const allowedOrigins = config.ALLOWED_ORIGINS || [];

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

// Ruta de prueba para verificar la conexión a la base de datos
app.get("/health", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    logger.error("Error en health check:", error);
    res.status(500).json({
      status: "error",
      message: "Error al conectar con la base de datos",
    });
  }
});

app.use("/auth", authRouter);
app.use("/users", userRouter);

app.use("/evaluations", evaluationRouter);
app.use("/video", uploadRouter);
app.use("/study", studyRouter);
app.use("/teacher", teacherRouter)

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    logger.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

startServer();

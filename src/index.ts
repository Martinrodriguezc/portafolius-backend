import { initializeDatabase } from "./db/initDb";
import express, { Request, Response } from "express";
import passport from "./config/passport";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool } from "./config/db";
import uploadRouter from "./routes/videoRoutes";
import studyRouter from "./routes/studyRoutes";
import authRouter from "./routes/authRoutes";
import userRouter from "./routes/userRoutes";
import evaluationRouter from "./routes/evaluationRoutes";
import protocolRouter   from "./routes/protocolRoutes";
import teacherRouter from "./routes/teacherRoutes";
import materialRoutes from "./routes/materialRoutes";
import metricRoutes from "./routes/metricRoutes";
import attemptRoutes   from "./routes/attemptRoutes";
import responseRoutes  from "./routes/responseRoutes";
import interactionRoutes from './routes/interactionRoutes';
import adminRoutes from "./routes/adminRoutes";
import { config } from "./config";
import logger from "./config/logger";

dotenv.config();

const app = express();
const PORT = config.PORT || 3000;
const NODE_ENV = config.NODE_ENV;

//REVISAR
const allowedOrigins = Array.isArray(config.ALLOWED_ORIGINS) 
  ? config.ALLOWED_ORIGINS 
  : config.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = config.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];
    
    // En desarrollo o test, permitir requests sin origen (para tests con supertest)
    if (NODE_ENV === 'development' || NODE_ENV === 'test') {
      if (!origin) {
        callback(null, true);
        return;
      }
    }
    
    // Verificar si el origen está en la lista de permitidos
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (!origin && NODE_ENV === 'production') {
      // Solo rechazar requests sin origen en producción por seguridad
      callback(new Error('Origen no especificado'), false);
    } else if (!origin) {
      // Permitir en desarrollo/test
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'), false);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

console.log('Allowed Origins:', allowedOrigins);
console.log('CORS configuration:', corsOptions);

app.use(cors(corsOptions));

if (NODE_ENV === "production") {
  app.use(helmet());
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,                 // 100 peticiones por IP
    message: "Demasiadas peticiones. Por favor, inténtalo de nuevo más tarde.",
  });
  app.use(limiter);
}

app.use(express.json());
app.use(passport.initialize());

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", timestamp: result.rows[0].now });
  } catch (err) {
    logger.error("Error en health check:", err);
    res.status(500).json({ status: "error", message: "Error de BD" });
  }
});

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/evaluations", evaluationRouter);
app.use("/protocols", protocolRouter);
app.use("/video", uploadRouter);
app.use("/study", studyRouter);
app.use("/teacher", teacherRouter);
app.use("/materials", materialRoutes);
app.use("/metrics", metricRoutes);
app.use("/interactions", interactionRoutes);

app.use(attemptRoutes);
app.use(responseRoutes);
app.use("/admin", adminRoutes);

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

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scenesRouter from './routes/scenes.js';
import { errorHandler } from './middleware/errorHandler.js';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' })); // limit для thumbnail (base64)
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: '3D Scene Editor API',
  });
});

// Маршруты
app.use('/api/scenes', scenesRouter);

// Обработка несуществующих маршрутов
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Централизованный обработчик ошибок (должен быть последним)
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Scenes API: http://localhost:${PORT}/api/scenes`);
});

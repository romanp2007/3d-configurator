import path from 'path';
import fs from 'fs';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Папка для загрузок (рядом с корнем сервера)
const UPLOADS_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Разрешённые MIME-типы и расширения
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'model/gltf-binary': '.glb',
  'model/gltf+json': '.gltf',
  // Браузеры часто не выставляют корректный MIME для GLB/GLTF
  'application/octet-stream': '.glb',
};

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.glb', '.gltf']);
const MAX_SIZE_MB = 50;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safe}-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = ALLOWED_TYPES[file.mimetype] !== undefined;
    const extOk = ALLOWED_EXTENSIONS.has(ext);

    if (mimeOk || extOk) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Недопустимый тип файла: ${ext}. Разрешены: PNG, JPG, GLB, GLTF`));
    }
  },
});

/**
 * POST /api/assets/upload
 * Загрузка одного файла (текстура или 3D-модель)
 * Возвращает URL для доступа к файлу
 */
router.post(
  '/upload',
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'Файл не передан');
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const isModel = ext === '.glb' || ext === '.gltf';

      res.status(201).json({
        url: `/api/assets/files/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        type: isModel ? 'model' : 'texture',
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/assets/files/:filename
 * Отдать загруженный файл статически
 */
router.get('/files/:filename', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = path.basename(req.params.filename); // защита от path traversal
    const filepath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      throw new AppError(404, 'Файл не найден');
    }

    res.sendFile(filepath);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/assets
 * Список всех загруженных файлов
 */
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).map((filename) => {
      const ext = path.extname(filename).toLowerCase();
      const isModel = ext === '.glb' || ext === '.gltf';
      return {
        filename,
        url: `/api/assets/files/${filename}`,
        type: isModel ? 'model' : 'texture',
      };
    });
    res.json(files);
  } catch (err) {
    next(err);
  }
});

export default router;

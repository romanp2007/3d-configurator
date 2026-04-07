import { PrismaClient } from '@prisma/client';

// Синглтон PrismaClient — один экземпляр на всё приложение
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

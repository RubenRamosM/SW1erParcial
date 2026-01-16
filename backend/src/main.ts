import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

// Validar variables de entorno críticas antes de iniciar
function validateEnvVariables() {
  const logger = new Logger('Bootstrap');
  const errors: string[] = [];

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET no está definido');
  } else if (process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET debería tener al menos 32 caracteres para mayor seguridad');
  }

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL no está definido');
  }

  if (!process.env.GROQ_API_KEY) {
    logger.warn('GROQ_API_KEY no está definido - Las funciones de IA no estarán disponibles');
  }

  if (errors.length > 0) {
    errors.forEach((err) => logger.error(err));
    throw new Error(`Variables de entorno faltantes: ${errors.join(', ')}`);
  }

  logger.log('Variables de entorno validadas correctamente');
}

async function bootstrap() {
  validateEnvVariables();

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Habilita CORS para el frontend en Vite
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
  logger.log('Aplicación iniciada en http://localhost:3000');
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express, { json, urlencoded } from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Allow all origins, all methods, all headers
  app.enableCors({
    origin: '*',
    methods: '*',
    allowedHeaders: '*',
  });

  const ATTACH_ROOT = process.env.ATTACH_ROOT || './data';
  app.use('/attachments', express.static(join(ATTACH_ROOT, 'attachments')));

  // Request size limits
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0'); // so you can access it externally (e.g. via ngrok)
  console.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap();
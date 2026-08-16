import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

app.enableCors({
  origin: [
    'http://localhost:3001',
    'https://travora-gamma.vercel.app',
  ],
  credentials: true,
});

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);

  console.log(
    `🚀 Server running at http://localhost:${process.env.PORT ?? 3001}/api`,
  );
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  });

  // Aplica las reglas de los DTO (@IsEnum, @MinLength, etc.) a todo lo que llega.
  // whitelist: descarta los campos que no estén en el DTO, para que nadie pueda
  // cambiar datos que no le corresponden (por ejemplo el id o "activo").
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

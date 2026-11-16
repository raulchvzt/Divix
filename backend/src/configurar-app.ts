import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Configuración común de la app. La usan main.ts y las pruebas e2e, para que
 * las pruebas validen exactamente igual que el servidor real.
 */
export function configurarApp(app: INestApplication) {
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  });

  // Aplica las reglas de los DTO (@IsEnum, @MinLength, etc.) a todo lo que llega.
  // whitelist: descarta los campos que no estén en el DTO, para que nadie pueda
  // cambiar datos que no le corresponden (por ejemplo el id o "activo").
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
}

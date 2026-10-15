// Se carga el .env aquí porque los módulos de la app deciden su base de datos
// al importarse, antes de que ConfigModule alcance a leer el archivo.
import 'dotenv/config';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { JsonRepository } from './json/json-repository';
import { JsonSeedService } from './json/json-seed.service';

/** DB_DRIVER=json -> base temporal en archivos JSON. Cualquier otro valor -> MySQL. */
export const usarJson = (): boolean => (process.env.DB_DRIVER ?? 'mysql').toLowerCase() === 'json';

@Module({})
export class DatabaseModule {
  /** Se importa una sola vez, en AppModule. */
  static forRoot(): DynamicModule {
    if (usarJson()) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DB_DRIVER=json no está permitido en producción. Usa MySQL.');
      }
      return { module: DatabaseModule, providers: [JsonSeedService] };
    }

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'mysql' as const,
            host: config.get<string>('DB_HOST', 'localhost'),
            port: parseInt(config.get<string>('DB_PORT', '3306'), 10),
            username: config.get<string>('DB_USER'),
            password: config.get<string>('DB_PASSWORD'),
            database: config.get<string>('DB_NAME', 'divix'),
            // Registra automáticamente las entidades declaradas con forFeature()
            autoLoadEntities: true,
            // false: el esquema lo controla el script SQL, no TypeORM.
            // Nunca pongas true en producción: puede alterar o borrar tablas.
            synchronize: false,
          }),
        }),
      ],
    };
  }

  /** Reemplaza a TypeOrmModule.forFeature([...]) en cada módulo de la app. */
  static forFeature(entidades: Function[]): DynamicModule {
    if (!usarJson()) {
      return TypeOrmModule.forFeature(entidades as any);
    }
    const providers = entidades.map((entidad) => ({
      provide: getRepositoryToken(entidad as any),
      useValue: new JsonRepository(entidad),
    }));
    return {
      module: DatabaseModule,
      providers,
      exports: providers.map((p) => p.provide),
    };
  }
}

import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { Usuario } from '../../entities/usuario.entity';
import { AuthService } from '../../services/auth.service';
import { AuthController } from './auth.controller';

// @Global() porque AuthGuard (usado en TODOS los módulos) depende de
// JwtService para verificar el token. Sin esto, cada módulo tendría
// que importar AuthModule por separado solo para poder usar el guard.
@Global()
@Module({
  imports: [
    DatabaseModule.forFeature([Usuario]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { Usuario } from '../../entities/usuario.entity';
import { UsuariosService } from '../../services/usuarios.service';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [DatabaseModule.forFeature([Usuario])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}

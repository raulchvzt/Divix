import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';;
import { Rol } from '../../entities/rol.entity';
import { RolesService } from '../../services/roles.service';
import { RolesController } from './roles.controller';

@Module({
  imports: [DatabaseModule.forFeature([Rol])],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}

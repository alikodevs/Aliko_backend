import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ProjectsModule } from '../projects/projects.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [forwardRef(() => ProjectsModule), forwardRef(() => UserModule)],
  controllers: [AdminController],
})
export class AdminModule {}

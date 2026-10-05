import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { CommentsService } from './comments.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, CommentsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

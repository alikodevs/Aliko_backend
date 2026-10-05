import { Module } from '@nestjs/common';
import { CourseModulesService } from './course-modules.service';
import { CourseModulesController } from './course-modules.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ModuleAccessGuard } from './guards/module-access.guard';
import { InstructorModuleGuard } from './guards/instructor-module.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CourseModulesController],
  providers: [CourseModulesService, ModuleAccessGuard, InstructorModuleGuard],
  exports: [CourseModulesService],
})
export class CourseModulesModule {}

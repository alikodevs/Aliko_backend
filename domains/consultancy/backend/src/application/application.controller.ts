import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { Prisma, ApplicationStatus } from '../generated/client';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  resolvePayload,
  resolveParam,
} from '../common/utils/payload-resolver.util';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @MessagePattern({ cmd: 'get_all_applications' })
  findAllApplications() {
    return this.applicationService.findAll();
  }

  @MessagePattern({ cmd: 'create_application' })
  @Post()
  create(
    @Body() data: Omit<Prisma.ApplicationCreateInput, 'applicationCode'>,
    @Payload() payload: any,
  ) {
    const resolvedData = resolvePayload(data, payload);
    return this.applicationService.create(resolvedData);
  }

  @MessagePattern({ cmd: 'get_application' })
  @Get(':id')
  findOne(@Param('id') id: string, @Payload() payload: any) {
    const targetId = resolveParam(id, payload, 'id');
    return this.applicationService.findOne(targetId);
  }

  @MessagePattern({ cmd: 'get_user_applications' })
  handleGetUserApplications(@Payload() payload: any) {
    const targetUserId = resolveParam(undefined, payload, 'userId');
    return this.applicationService.findByUserId(targetUserId);
  }

  @MessagePattern({ cmd: 'get_application_by_code' })
  findByCode(@Payload() payload: any) {
    const targetCode = resolveParam(undefined, payload, 'code');
    return this.applicationService.findByCode(targetCode);
  }

  @MessagePattern({ cmd: 'update_application' })
  update(@Payload() payload: any) {
    const dataObj = payload.data || payload;
    const { id, ...dataToUpdate } = dataObj;
    return this.applicationService.update(payload.id || id, dataToUpdate);
  }

  @MessagePattern({ cmd: 'update_application_status' })
  @Patch(':id/status')
  updateStatus(
    @Payload()
    payload: {
      id: string;
      status: ApplicationStatus;
      notes?: string;
      changedBy?: string;
    },
    // Keep decorators for HTTP fallback if needed, but only use payload for logic
    @Param('id') id?: string,
    @Body('status') status?: ApplicationStatus,
    @Body('notes') notes?: string,
    @Body('changedBy') changedBy?: string,
  ) {
    return this.applicationService.updateStatus(
      payload.id || id as string,
      payload.status || status as any,
      payload.notes || notes,
      payload.changedBy || changedBy,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicationService.remove(id);
  }

  @MessagePattern({ cmd: 'add_application_document' })
  @Post('documents')
  addDocument(@Body() data: Prisma.ApplicationDocumentCreateInput, @Payload() payload: any) {
    const resolvedData = resolvePayload(data, payload);
    return this.applicationService.addDocument(resolvedData);
  }

  @Get(':id/documents')
  findDocuments(@Param('id') applicationId: string) {
    return this.applicationService.findDocuments(applicationId);
  }

  @Delete('documents/:id')
  removeDocument(@Param('id') id: string) {
    return this.applicationService.removeDocument(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { Prisma } from '../generated/client';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  resolvePayload,
  resolveParam,
} from '../common/utils/payload-resolver.util';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // --- Availability Rules ---
  @MessagePattern({ cmd: 'create_availability_rule' })
  @Post('rules')
  createRule(
    @Body() data: Prisma.AvailabilityRuleCreateInput,
    @Payload() payload: Prisma.AvailabilityRuleCreateInput,
  ) {
    return this.availabilityService.createRule(resolvePayload(data, payload));
  }

  @MessagePattern({ cmd: 'get_availability_rules' })
  @Get('rules')
  findAllRules() {
    return this.availabilityService.findAllRules();
  }

  @MessagePattern({ cmd: 'get_availability_rule' })
  @Get('rules/:id')
  findOneRule(@Param('id') id: string, @Payload() payload: any) {
    return this.availabilityService.findOneRule(resolveParam(id, payload?.id));
  }

  @MessagePattern({ cmd: 'update_availability_rule' })
  @Patch('rules/:id')
  updateRule(
    @Param('id') id: string,
    @Body() data: Prisma.AvailabilityRuleUpdateInput,
    @Payload() payload: any,
  ) {
    const targetId = resolveParam(id, payload?.id);
    const resolvedData = resolvePayload(data, payload?.data || payload);
    const { id: ignoredId, ...updateFields } = resolvedData || {};
    return this.availabilityService.updateRule(targetId, updateFields);
  }

  @MessagePattern({ cmd: 'remove_availability_rule' })
  @Delete('rules/:id')
  removeRule(@Param('id') id: string, @Payload() payload: any) {
    const targetId = resolveParam(id, payload?.id);
    return this.availabilityService.removeRule(targetId);
  }

  // --- Time Blocks ---
  @MessagePattern({ cmd: 'create_time_block' })
  @Post('time-blocks')
  createTimeBlock(
    @Body() data: Prisma.TimeBlockCreateInput,
    @Payload() payload: Prisma.TimeBlockCreateInput,
  ) {
    return this.availabilityService.createTimeBlock(
      resolvePayload(data, payload),
    );
  }

  @MessagePattern({ cmd: 'get_time_blocks' })
  @Get('time-blocks')
  findAllTimeBlocks() {
    return this.availabilityService.findAllTimeBlocks();
  }

  @MessagePattern({ cmd: 'get_time_block' })
  @Get('time-blocks/:id')
  findOneTimeBlock(@Param('id') id: string, @Payload() payload: any) {
    return this.availabilityService.findOneTimeBlock(
      resolveParam(id, payload?.id),
    );
  }

  @MessagePattern({ cmd: 'update_time_block' })
  @Patch('time-blocks/:id')
  updateTimeBlock(
    @Param('id') id: string,
    @Body() data: Prisma.TimeBlockUpdateInput,
    @Payload() payload: any,
  ) {
    const targetId = resolveParam(id, payload?.id);
    const resolvedData = resolvePayload(data, payload?.data || payload);
    const { id: ignoredId, ...updateFields } = resolvedData || {};
    return this.availabilityService.updateTimeBlock(targetId, updateFields);
  }

  @MessagePattern({ cmd: 'remove_time_block' })
  @Delete('time-blocks/:id')
  removeTimeBlock(@Param('id') id: string, @Payload() payload: any) {
    const targetId = resolveParam(id, payload?.id);
    return this.availabilityService.removeTimeBlock(targetId);
  }
}

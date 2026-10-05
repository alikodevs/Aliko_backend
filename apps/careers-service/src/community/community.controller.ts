import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommunityService } from './community.service';

@Controller()
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @MessagePattern({ cmd: 'join_community' })
  async join(@Payload() data: { email: string; fullName?: string; interests?: string[] }) {
    return this.communityService.join(data);
  }

  @MessagePattern({ cmd: 'get_community_members' })
  async findAll() {
    return this.communityService.findAll();
  }
}

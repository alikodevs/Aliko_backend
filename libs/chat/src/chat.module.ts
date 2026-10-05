import { Global, Module } from '@nestjs/common';
import { ChatPolicyService } from './chat-policy.service';

@Global()
@Module({
  providers: [ChatPolicyService],
  exports: [ChatPolicyService],
})
export class ChatModule {}

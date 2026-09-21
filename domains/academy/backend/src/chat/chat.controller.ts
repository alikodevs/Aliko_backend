import { Controller, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CHAT_MESSAGE_PATTERNS } from '@alikohub/chat';
import { ChatService } from './chat.service';
import { StartConversationDto, SendMessageDto } from './dto/chat.dto';
import { AuthenticatedUser } from '../user/user.service';
import { AcademyProfileGuard } from '../auth/academy-profile.guard';
import { RoleGuard } from '../auth/role-guard/role-guard';
import { Roles } from '../auth/role-guard/roles.decorator';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  StartConversationSchema,
  ConversationIdSchema,
  ListMessagesSchema,
  SendMessageSchema,
  UserOnlyChatSchema,
} from './chat.validation';

@Controller()
@UseGuards(AcademyProfileGuard, RoleGuard)
@Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.START_OR_GET_CONVERSATION })
  @UsePipes(new JoiValidationPipe(StartConversationSchema))
  async startOrGet(
    @Payload()
    payload: { dto: StartConversationDto; user: AuthenticatedUser },
  ) {
    this.logger.log(
      `User ${payload.user.firebaseId} starting conversation with ${payload.dto.recipientId}`,
    );
    return this.chatService.startOrGetConversation(payload.user, payload.dto);
  }

  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.LIST_MY_CONVERSATIONS })
  @UsePipes(new JoiValidationPipe(UserOnlyChatSchema))
  async listConversations(@Payload() payload: { user: AuthenticatedUser }) {
    return this.chatService.listMyConversations(payload.user);
  }

  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.LIST_MESSAGES })
  @UsePipes(new JoiValidationPipe(ListMessagesSchema))
  async listMessages(
    @Payload()
    payload: {
      conversationId: number;
      cursor?: number;
      limit?: number;
      user: AuthenticatedUser;
    },
  ) {
    return this.chatService.listMessages(
      payload.user,
      payload.conversationId,
      payload.cursor,
      payload.limit,
    );
  }

  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.SEND_MESSAGE })
  @UsePipes(new JoiValidationPipe(SendMessageSchema))
  async sendMessage(
    @Payload()
    payload: {
      conversationId: number;
      dto: SendMessageDto;
      user: AuthenticatedUser;
    },
  ) {
    this.logger.log(
      `User ${payload.user.firebaseId} sending message in conversation ${payload.conversationId}`,
    );
    return this.chatService.sendMessage(
      payload.user,
      payload.conversationId,
      payload.dto,
    );
  }

  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.MARK_CONVERSATION_READ })
  @UsePipes(new JoiValidationPipe(ConversationIdSchema))
  async markRead(
    @Payload()
    payload: { conversationId: number; user: AuthenticatedUser },
  ) {
    return this.chatService.markRead(payload.user, payload.conversationId);
  }

  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.LIST_ELIGIBLE_CONTACTS })
  @UsePipes(new JoiValidationPipe(UserOnlyChatSchema))
  async listContacts(@Payload() payload: { user: AuthenticatedUser }) {
    return this.chatService.listEligibleContacts(payload.user);
  }

  @MessagePattern({
    cmd: CHAT_MESSAGE_PATTERNS.VERIFY_CONVERSATION_MEMBERSHIP,
  })
  @UsePipes(new JoiValidationPipe(ConversationIdSchema))
  async verifyMembership(
    @Payload()
    payload: { conversationId: number; user: AuthenticatedUser },
  ) {
    return this.chatService.verifyMembership(
      payload.user,
      payload.conversationId,
    );
  }
}

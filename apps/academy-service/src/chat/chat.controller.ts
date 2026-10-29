import {
  Controller,
  UseGuards,
  UsePipes,
  Logger,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Query,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
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
@Roles('STUDENT', 'INSTRUCTOR', 'ADMIN', 'USER', 'COURSE_MANAGER')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post(['chat/conversations', 'academy/chat/conversations'])
  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.START_OR_GET_CONVERSATION })
  @UsePipes(new JoiValidationPipe(StartConversationSchema))
  async startOrGet(
    @Body() body?: StartConversationDto,
    @Req() req?: any,
    @Payload()
    payload?: { dto: StartConversationDto; user: AuthenticatedUser },
  ) {
    const dto = payload?.dto || body;
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!dto || !dto.recipientId) {
      throw new BadRequestException('Recipient ID required');
    }
    this.logger.log(
      `User ${user.firebaseId} starting conversation with ${dto.recipientId}`,
    );
    return this.chatService.startOrGetConversation(user, dto);
  }

  @Get(['chat/conversations', 'academy/chat/conversations'])
  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.LIST_MY_CONVERSATIONS })
  @UsePipes(new JoiValidationPipe(UserOnlyChatSchema))
  async listConversations(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.chatService.listMyConversations(user);
  }

  @Get(['chat/conversations/:conversationId/messages', 'academy/chat/conversations/:conversationId/messages'])
  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.LIST_MESSAGES })
  @UsePipes(new JoiValidationPipe(ListMessagesSchema))
  async listMessages(
    @Param('conversationId') paramConversationId?: string,
    @Query('cursor') queryCursor?: string,
    @Query('limit') queryLimit?: string,
    @Req() req?: any,
    @Payload()
    payload?: {
      conversationId: number;
      cursor?: number;
      limit?: number;
      user: AuthenticatedUser;
    },
  ) {
    const rawConvId = payload?.conversationId !== undefined ? payload.conversationId : paramConversationId;
    const conversationId = Number(rawConvId);
    if (!conversationId || isNaN(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const cursor = payload?.cursor !== undefined ? payload.cursor : queryCursor ? Number(queryCursor) : undefined;
    const limit = payload?.limit !== undefined ? payload.limit : queryLimit ? Number(queryLimit) : undefined;

    return this.chatService.listMessages(
      user,
      conversationId,
      cursor,
      limit,
    );
  }

  @Post(['chat/conversations/:conversationId/messages', 'academy/chat/conversations/:conversationId/messages'])
  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.SEND_MESSAGE })
  @UsePipes(new JoiValidationPipe(SendMessageSchema))
  async sendMessage(
    @Param('conversationId') paramConversationId?: string,
    @Body() body?: SendMessageDto,
    @Req() req?: any,
    @Payload()
    payload?: {
      conversationId: number;
      dto: SendMessageDto;
      user: AuthenticatedUser;
    },
  ) {
    const rawConvId = payload?.conversationId !== undefined ? payload.conversationId : paramConversationId;
    const conversationId = Number(rawConvId);
    if (!conversationId || isNaN(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }
    const dto = payload?.dto || body;
    if (!dto || !dto.body) {
      throw new BadRequestException('Message body required');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `User ${user.firebaseId} sending message in conversation ${conversationId}`,
    );
    return this.chatService.sendMessage(
      user,
      conversationId,
      dto,
    );
  }

  @Put(['chat/conversations/:conversationId/read', 'academy/chat/conversations/:conversationId/read'])
  @Patch(['chat/conversations/:conversationId/read', 'academy/chat/conversations/:conversationId/read'])
  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.MARK_CONVERSATION_READ })
  @UsePipes(new JoiValidationPipe(ConversationIdSchema))
  async markRead(
    @Param('conversationId') paramConversationId?: string,
    @Req() req?: any,
    @Payload()
    payload?: { conversationId: number; user: AuthenticatedUser },
  ) {
    const rawConvId = payload?.conversationId !== undefined ? payload.conversationId : paramConversationId;
    const conversationId = Number(rawConvId);
    if (!conversationId || isNaN(conversationId)) {
      throw new BadRequestException('Invalid conversation ID');
    }
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.chatService.markRead(user, conversationId);
  }

  @Get(['chat/contacts', 'academy/chat/contacts'])
  @MessagePattern({ cmd: CHAT_MESSAGE_PATTERNS.LIST_ELIGIBLE_CONTACTS })
  @UsePipes(new JoiValidationPipe(UserOnlyChatSchema))
  async listContacts(
    @Req() req?: any,
    @Payload() payload?: { user: AuthenticatedUser },
  ) {
    const user = payload?.user || req?.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.chatService.listEligibleContacts(user);
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

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { CHAT_MESSAGE_PATTERNS } from '@alikohub/chat';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { StartConversationDto, SendMessageDto } from './dto/chat.dto';
import { ChatRealtimeService } from './chat-realtime.service';

@ApiTags('Academy Chat')
@Controller('academy/chat')
@UseGuards(AuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    @Inject('ACADEMY_SERVICE') private academyClient: ClientProxy,
    private readonly realtime: ChatRealtimeService,
  ) {}

  private handleError(error: any, operation: string): never {
    this.logger.error(`${operation} failed:`, error);

    if (error instanceof TimeoutError) {
      throw new HttpException(
        'Academy service timeout',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    if (error?.code === 'ECONNREFUSED') {
      throw new HttpException(
        'Academy service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let status = HttpStatus.BAD_REQUEST;
    if (typeof error?.statusCode === 'number') {
      status = error.statusCode;
    } else if (typeof error?.status === 'number') {
      status = error.status;
    }

    throw new HttpException(
      {
        statusCode: status,
        message: error?.message || 'Error from academy microservice',
        error: error?.error || 'Microservice Error',
        details: error?.details || null,
      },
      status,
    );
  }

  private send<T>(cmd: string, payload: unknown): Promise<T> {
    return firstValueFrom(
      this.academyClient.send({ cmd }, payload).pipe(
        timeout(10000),
        catchError((err) => throwError(() => err)),
      ),
    );
  }

  /**
   * Normalize academy session role onto the user payload for chat.
   * Prefer academyActiveRole (current session) over base academyRole.
   */
  private chatUser(req: RequestWithUser) {
    const user = req.user as any;
    if (!user) return user;

    const academyActiveRole =
      user.academyActiveRole ||
      user.activeRole ||
      user.academyUser?.activeRole ||
      null;

    return {
      ...user,
      academyActiveRole: academyActiveRole || undefined,
      activeRole: academyActiveRole || user.activeRole || undefined,
      // Keep base role separate; chat must not treat this as the session role
      academyRole: user.academyRole || user.academyUser?.role || undefined,
    };
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start or get a direct conversation' })
  @ApiBody({ type: StartConversationDto })
  @ApiResponse({ status: 201, description: 'Conversation created or returned' })
  async startConversation(
    @Request() req: RequestWithUser,
    @Body() dto: StartConversationDto,
  ) {
    try {
      return await this.send(CHAT_MESSAGE_PATTERNS.START_OR_GET_CONVERSATION, {
        dto,
        user: this.chatUser(req),
      });
    } catch (error) {
      this.handleError(error, 'startConversation');
    }
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations' })
  async listConversations(@Request() req: RequestWithUser) {
    try {
      return await this.send(CHAT_MESSAGE_PATTERNS.LIST_MY_CONVERSATIONS, {
        user: this.chatUser(req),
      });
    } catch (error) {
      this.handleError(error, 'listConversations');
    }
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'List messages in a conversation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listMessages(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      return await this.send(CHAT_MESSAGE_PATTERNS.LIST_MESSAGES, {
        conversationId: id,
        cursor: cursor ? Number(cursor) : undefined,
        limit: limit ? Number(limit) : undefined,
        user: this.chatUser(req),
      });
    } catch (error) {
      this.handleError(error, 'listMessages');
    }
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: SendMessageDto })
  async sendMessage(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    try {
      const message = await this.send(CHAT_MESSAGE_PATTERNS.SEND_MESSAGE, {
        conversationId: id,
        dto,
        user: this.chatUser(req),
      });
      this.realtime.emitMessageCreated(id, message);
      return message;
    } catch (error) {
      this.handleError(error, 'sendMessage');
    }
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'id', type: Number })
  async markRead(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const result = await this.send(
        CHAT_MESSAGE_PATTERNS.MARK_CONVERSATION_READ,
        {
          conversationId: id,
          user: this.chatUser(req),
        },
      );
      this.realtime.emitMessageRead(id, result);
      return result;
    } catch (error) {
      this.handleError(error, 'markRead');
    }
  }

  @Get('contacts')
  @ApiOperation({ summary: 'List eligible chat contacts for current role' })
  async listContacts(@Request() req: RequestWithUser) {
    try {
      const user = this.chatUser(req);
      this.logger.log(
        `Chat contacts for ${user?.firebaseId} sessionRole=${user?.academyActiveRole || user?.activeRole || 'unknown'} baseRole=${user?.academyRole || 'unknown'}`,
      );
      return await this.send(CHAT_MESSAGE_PATTERNS.LIST_ELIGIBLE_CONTACTS, {
        user,
      });
    } catch (error) {
      this.handleError(error, 'listContacts');
    }
  }
}

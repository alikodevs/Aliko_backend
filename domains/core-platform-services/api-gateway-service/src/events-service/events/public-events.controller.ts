import {
    Body,
    Controller,
    Get,
    Inject,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreatePromotionRequestDto } from './dto/promotion-request.dto';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Public Events')
@Controller('events')
@UseGuards(AuthGuard)
export class PublicEventsController {
    constructor(@Inject('EVENTS_SERVICE') private eventsClient: ClientProxy) { }

    @Public()
    @Get()
    @ApiOperation({ summary: 'Get all published events/announcements/news' })
    findAllPosts(@Query() query: any) {
        return this.eventsClient.send({ cmd: 'find_all_posts' }, { ...query, public: true });
    }

    @Public()
    @Post('promote')
    @ApiOperation({ summary: 'Submit a promotion request (public form)' })
    submitPromotionRequest(@Request() req: any, @Body() dto: CreatePromotionRequestDto) {
        return this.eventsClient.send({ cmd: 'submit_promotion_request' }, { ...dto, userId: req.user?.firebaseId });
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get a specific published post by ID' })
    findPostById(@Param('id', ParseUUIDPipe) id: string) {
        return this.eventsClient.send({ cmd: 'find_one_post' }, { id, public: true });
    }
}

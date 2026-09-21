import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { AuthGuard } from '../../common/guard/firebase_auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { RequestWithUser } from '../../common/types/request-with-user.interface';
import { ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../../file-upload-service/file-upload.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('Internal Events Management')
@Controller('manage/events')
@UseGuards(AuthGuard)
export class EventsController {
    constructor(
        @Inject('EVENTS_SERVICE') private eventsClient: ClientProxy,
        private readonly fileUploadService: FileUploadService
    ) { }

    // --- Static Routes First ---

    @ApiOperation({ summary: 'Get current user Events profile' })
    @Get('profile')
    getProfile(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'get_events_profile' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get statistics for events management' })
    @Get('stats')
    getStats(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'get_stats' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get all user profiles (Admin only)' })
    @Get('users')
    getAllProfiles(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'get_all_profiles' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get all promotion requests (Admin only)' })
    @Get('promotions')
    findAllPromotionRequests(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'find_all_promotion_requests' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get all registrations for my events' })
    @Get('registrations')
    findAllRegistrations(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'find_all_registrations' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get all RSVPs for my social events' })
    @Get('rsvps')
    findAllRsvps(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'find_all_rsvps' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get my submitted promotion requests' })
    @Get('my-promotions')
    findMyPromotions(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'find_my_promotion_requests' }, { userId: req.user!.firebaseId });
    }

    @ApiOperation({ summary: 'Get my event registrations as attendee' })
    @Get('my-tickets')
    findMyTickets(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'find_my_tickets' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get all my ticket tiers' })
    @Get('tickets')
    findAllMyTickets(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'find_all_tickets' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get all portfolio media' })
    @Get('portfolio')
    findAllPortfolio(@Request() req: RequestWithUser, @Query('portal') portal?: string) {
        return this.eventsClient.send({ cmd: 'find_all_portfolio' }, { portal, user: req.user });
    }

    @Get('landing')
    getLandingInfo() {
        // public flag bypasses EventsProfileGuard on the events service
        return this.eventsClient.send({ cmd: 'get_landing_info' }, { public: true });
    }

    @ApiOperation({ summary: 'Get messaging statistics' })
    @Get('messaging/stats')
    getMessagingStats(@Request() req: RequestWithUser) {
        return this.eventsClient.send({ cmd: 'get_messaging_stats' }, { user: req.user });
    }

    @ApiOperation({ summary: 'Get posts for management (supports filtering by status/type)' })
    @Get()
    findAllPosts(@Request() req: RequestWithUser, @Query() query: any) {
        return this.eventsClient.send({ cmd: 'find_all_posts' }, { ...query, user: req.user });
    }

    // --- Dynamic Routes / Sub-paths Last ---

    @ApiOperation({ summary: 'Create a new post (Draft)' })
    @Post()
    @UseInterceptors(FileInterceptor('coverImage'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: CreateEventDto })
    async createPost(
        @Request() req: RequestWithUser, 
        @Body() createPostDto: CreateEventDto,
        @UploadedFile() coverImage?: Express.Multer.File,
    ) {
        if (coverImage) {
            const uploadResult = await this.fileUploadService.uploadFile(coverImage, 'image');
            createPostDto.coverImage = uploadResult.url;
        }
        return this.eventsClient.send({ cmd: 'create_post' }, { dto: createPostDto, user: req.user });
    }

    @ApiOperation({ summary: 'Get a single post by ID' })
    @Get(':id')
    findOnePost(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'find_one_post' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Update a draft or rejected post' })
    @Patch(':id')
    @UseInterceptors(FileInterceptor('coverImage'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateEventDto })
    async updatePost(
        @Request() req: RequestWithUser, 
        @Param('id') id: string, 
        @Body() updatePostDto: UpdateEventDto,
        @UploadedFile() coverImage?: Express.Multer.File,
    ) {
        if (coverImage) {
            const uploadResult = await this.fileUploadService.uploadFile(coverImage, 'image');
            updatePostDto.coverImage = uploadResult.url;
        }
        return this.eventsClient.send({ cmd: 'update_post' }, { id, dto: updatePostDto, user: req.user });
    }

    @ApiOperation({ summary: 'Submit a draft for admin review' })
    @Post(':id/submit')
    submitForReview(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'submit_post_for_review' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Review a pending post (Approve/Publish/Reject)' })
    @Post(':id/review')
    reviewPost(@Request() req: RequestWithUser, @Param('id') id: string, @Body() body: { status: string; rejectionReason?: string }) {
        return this.eventsClient.send({ cmd: 'review_post' }, { id, status: body.status, rejectionReason: body.rejectionReason, user: req.user });
    }

    @ApiOperation({ summary: 'Delete a post' })
    @Delete(':id')
    removePost(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'remove_post' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Get attendees for a specific event' })
    @Get(':id/attendees')
    findEventAttendees(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'find_event_attendees' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Get analytics for a specific event' })
    @Get(':id/stats')
    getEventStats(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'get_event_stats' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Mark an attendee as checked-in' })
    @Post(':id/checkin/:registrationId')
    checkInAttendee(@Request() req: RequestWithUser, @Param('id') id: string, @Param('registrationId') registrationId: string) {
        return this.eventsClient.send({ cmd: 'checkin_attendee' }, { id, registrationId, user: req.user });
    }

    @ApiOperation({ summary: 'Update user role (Admin only)' })
    @Patch('users/:userId/role')
    updateUserRole(@Request() req: RequestWithUser, @Param('userId') userId: string, @Body() body: { role: string }) {
        return this.eventsClient.send({ cmd: 'update_user_role' }, { userId, role: body.role, user: req.user });
    }

    @ApiOperation({ summary: 'Remove user access (Admin only)' })
    @Delete('users/:userId')
    deleteUserProfile(@Request() req: RequestWithUser, @Param('userId') userId: string) {
        return this.eventsClient.send({ cmd: 'delete_profile' }, { userId, user: req.user });
    }

    @ApiOperation({ summary: 'Mark a promotion request as reviewed (Admin only)' })
    @Patch('promotions/:id/review')
    markPromotionReviewed(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'mark_promotion_request_reviewed' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Convert a promotion request to an event draft (Admin only)' })
    @Post('promotions/:id/convert')
    convertPromotionToEvent(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'convert_promotion_to_event' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Create a ticket tier' })
    @Post('tickets')
    createTicket(@Request() req: RequestWithUser, @Body() body: any) {
        return this.eventsClient.send({ cmd: 'create_ticket' }, { dto: body, user: req.user });
    }

    @ApiOperation({ summary: 'Update a ticket tier' })
    @Patch('tickets/:id')
    updateTicket(@Request() req: RequestWithUser, @Param('id') id: string, @Body() body: any) {
        return this.eventsClient.send({ cmd: 'update_ticket' }, { id, dto: body, user: req.user });
    }

    @ApiOperation({ summary: 'Get tickets for an event' })
    @Get(':eventId/tickets')
    findEventTickets(@Request() req: RequestWithUser, @Param('eventId') eventId: string) {
        return this.eventsClient.send({ cmd: 'find_event_tickets' }, { eventId, user: req.user });
    }

    @ApiOperation({ summary: 'Remove a ticket tier' })
    @Delete('tickets/:id')
    removeTicket(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'remove_ticket' }, { id, user: req.user });
    }

    @Public()
    @ApiOperation({ summary: 'Register for an event' })
    @Post('registrations')
    async createRegistration(@Request() req: RequestWithUser, @Body() body: any) {
        try {
            return await firstValueFrom(
                this.eventsClient.send({ cmd: 'create_registration' }, { dto: body, user: req?.user, public: !req?.user }).pipe(
                    timeout(15000),
                    catchError(err => throwError(() => err))
                )
            );
        } catch (error: any) {
            console.error(`Registration error: ${error.message}`);
            throw error;
        }
    }

    @ApiOperation({ summary: 'Check in an attendee (idempotent)' })
    @Patch('registrations/:id/checkin')
    toggleCheckIn(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'toggle_checkin' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Add a session to an event' })
    @Post('sessions')
    createSession(@Request() req: RequestWithUser, @Body() body: any) {
        return this.eventsClient.send({ cmd: 'create_session' }, { dto: body, user: req.user });
    }

    @ApiOperation({ summary: 'Remove a session' })
    @Delete('sessions/:id')
    removeSession(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'remove_session' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Add a sponsor to an event' })
    @Post('sponsors')
    createSponsor(@Request() req: RequestWithUser, @Body() body: any) {
        return this.eventsClient.send({ cmd: 'create_sponsor' }, { dto: body, user: req.user });
    }

    @ApiOperation({ summary: 'Remove a sponsor' })
    @Delete('sponsors/:id')
    removeSponsor(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'remove_sponsor' }, { id, user: req.user });
    }

    @Public()
    @ApiOperation({ summary: 'RSVP for a social event' })
    @Post('rsvps')
    async createRsvp(@Body() body: any) {
        try {
            return await firstValueFrom(
                this.eventsClient.send({ cmd: 'create_rsvp' }, { dto: body }).pipe(
                    timeout(15000),
                    catchError(err => throwError(() => err))
                )
            );
        } catch (error: any) {
            console.error(`RSVP error: ${error.message}`);
            throw error;
        }
    }

    @Public()
    @ApiOperation({ summary: 'Update/confirm RSVP response' })
    @Patch('rsvps/:id/status')
    async updateRsvpStatus(@Param('id') id: string, @Body() body: { response: string }) {
        try {
            return await firstValueFrom(
                this.eventsClient.send({ cmd: 'update_rsvp_status' }, { id, dto: body }).pipe(
                    timeout(15000),
                    catchError(err => throwError(() => err))
                )
            );
        } catch (error: any) {
            console.error(`Update RSVP status error: ${error.message}`);
            throw error;
        }
    }

    @ApiOperation({ summary: 'Upload a file' })
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                type: { type: 'string', enum: ['image', 'video', 'document'] },
            },
        },
    })
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body('type') type: 'image' | 'video' | 'document' = 'image',
    ) {
        return this.fileUploadService.uploadFile(file, type);
    }

    @ApiOperation({ summary: 'Remove an RSVP' })
    @Delete('rsvps/:id')
    removeRsvp(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'remove_rsvp' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Add portfolio media' })
    @Post('portfolio')
    createPortfolio(@Request() req: RequestWithUser, @Body() body: any) {
        return this.eventsClient.send({ cmd: 'create_portfolio' }, { dto: body, user: req.user });
    }

    @ApiOperation({ summary: 'Remove portfolio media' })
    @Delete('portfolio/:id')
    removePortfolio(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.eventsClient.send({ cmd: 'remove_portfolio' }, { id, user: req.user });
    }

    @ApiOperation({ summary: 'Send message to event attendees' })
    @Post(':id/message')
    sendMessage(@Request() req: RequestWithUser, @Param('id') id: string, @Body() body: any) {
        return this.eventsClient.send({ cmd: 'send_event_message' }, { id, dto: body, user: req.user });
    }
}
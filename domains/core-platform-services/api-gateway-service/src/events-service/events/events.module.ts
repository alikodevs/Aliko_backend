import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { PublicEventsController } from './public-events.controller';

@Module({
    // Roles-sensitive static routes live in RolesModule; register PublicEvents after
    // EventsController so manage static paths stay ahead of :id where applicable.
    controllers: [EventsController, PublicEventsController]
})
export class EventsModule { }

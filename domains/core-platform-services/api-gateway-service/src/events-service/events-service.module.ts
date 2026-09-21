import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { RolesModule } from './roles/roles.module';

@Module({
    imports: [
        // Roles first so /events/profile and /events/user-role are not swallowed by PublicEvents :id
        RolesModule,
        EventsModule,
    ],
})
export class EventsServiceModule { }

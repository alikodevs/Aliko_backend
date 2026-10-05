import { Module } from '@nestjs/common';
import { AppConfigModule } from '@aliko/config';
import { AppLoggerModule } from '@aliko/logger';
import { EventBusModule } from '@aliko/event-bus';
import { ApplicationModule } from './application/application.module';
import { AuthModule } from './auth/auth.module';
import { FirebaseModule } from './firebase/firebase.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { UserOutboxPublisherWorker } from './modules/events/user-outbox-publisher.worker';
import { UserEventsConsumer } from './modules/events/user-events.consumer';
import { PrismaService } from './database/prisma.service';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    EventBusModule,
    ApplicationModule,
    AuthModule,
    FirebaseModule,
    PrismaModule,
    UserModule,
  ],
  providers: [UserOutboxPublisherWorker, UserEventsConsumer],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppNotificationGateway } from './app.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AppNotification,
  AppNotificationSchema,
} from './schemas/app-notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppNotification.name, schema: AppNotificationSchema },
    ]),
  ],
  providers: [AppNotificationGateway],
  exports: [AppNotificationGateway],
})
export class AppModule {}

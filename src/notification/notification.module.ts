import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from './email/email.service';
import { PushService } from './push/push.service';
import { EmailModule } from './email/email.module';
import { AppModule } from './app/app.module';

@Global()
@Module({
  imports: [EmailModule, AppModule],
  providers: [NotificationService, EmailService, PushService],
  exports: [NotificationService],
})
export class NotificationModule {}

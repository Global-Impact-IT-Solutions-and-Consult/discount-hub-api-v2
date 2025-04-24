import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
// import { EmailService } from './email/email.service';
// import { EmailModule } from './email/email.module';
import { PushService } from './push/push.service';
import { AppModule } from './app/app.module';
import { MailerModule } from '@nestjs-modules/mailer';

@Global()
@Module({
  // imports: [EmailModule, AppModule, MailerModule],
  // providers: [NotificationService, EmailService, PushService],
  imports: [AppModule, MailerModule],
  providers: [NotificationService, PushService],
  exports: [NotificationService],
})
export class NotificationModule {}

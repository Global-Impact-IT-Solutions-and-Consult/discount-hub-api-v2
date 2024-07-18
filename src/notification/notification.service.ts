import { Injectable } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { format } from 'date-fns';
import * as uniqid from 'uniqid';
import { UserDocument } from 'src/user/schemas/user.schema';

@Injectable()
export class NotificationService {
  constructor(private emailService: EmailService) {}

  private generateNotificationReference(id: string) {
    const presentDate = format(new Date(), 'yyMMdd');
    const notificationReference = uniqid(
      `CG_${id}-`,
      `-${presentDate}`,
    ) as string;
    return notificationReference.toUpperCase();
  }

  async sendConfirmEmailNotification(user: UserDocument) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const notificationReference = this.generateNotificationReference(user.id);

    await this.emailService.sendConfirmEmailMail(user);
  }
  async sendResetPasswordNotification(user: UserDocument) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const notificationReference = this.generateNotificationReference(user.id);

    await this.emailService.sendResetPasswordMail(user);
  }
}

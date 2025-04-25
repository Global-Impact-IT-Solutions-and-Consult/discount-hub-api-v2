import { Injectable } from '@nestjs/common';
// import { EmailService } from './email/email.service';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { UserDocument } from 'src/user/schemas/user.schema';
import { Resend } from 'resend';

@Injectable()
export class NotificationService {
  // constructor(private emailService: EmailService) {}

  private generateNotificationReference(id: string) {
    const presentDate = format(new Date(), 'yyMMdd');
    const notificationReference = `CG_${id}-${uuidv4()}-${presentDate}`;
    return notificationReference.toUpperCase();
  }

  async sendConfirmEmailNotification(user: UserDocument) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const notificationReference = this.generateNotificationReference(user.id);

    // await this.emailService.sendConfirmEmailMail(user);

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'DiscountsHub <giitsc1@gmail.com>',
      to: [`${user?.email}`],
      subject: 'Confirmation Mail',
      html: '<strong>Welcome to Discounts Hub, Please confirm your email</strong>',
    });

    if (error) {
      return console.error({ error });
    }

    console.log({ data });
  }
  async sendResetPasswordNotification(user: UserDocument) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const notificationReference = this.generateNotificationReference(user.id);

    // await this.emailService.sendResetPasswordMail(user);

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'DiscountsHub <giitsc1@gmail.com>',
      to: [`${user?.email}`],
      subject: 'Password Reset',
      html: '<strong>Forgot your password, click here to reset.</strong>',
    });

    if (error) {
      return console.error({ error });
    }

    console.log({ data });
  }
}

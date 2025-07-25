// import { Injectable, Logger } from '@nestjs/common';
// import { MailerService } from '@nestjs-modules/mailer';
// import { ConfigService } from '@nestjs/config';
// import { UserDocument } from 'src/user/schemas/user.schema';

// @Injectable()
// export class EmailService {
//   constructor(
//     private mailerService: MailerService,
//     private configService: ConfigService,
//   ) {}

//   emailLogger = new Logger(EmailService.name);

//   async sendConfirmEmailMail(user: UserDocument) {
//     const response = await this.mailerService.sendMail({
//       to: user.email,
//       from: '<no-reply@discounthub.com>', // override default from
//       subject: 'Welcome to Guideli Please confirm your email',
//       template: './email_verification', // `.hbs` extension is appended automatically
//       context: {
//         email: user.email,
//         first_name: user.firstName,
//         last_name: user.lastName,
//         project_name: this.configService.get('PROJECT'),
//         domain_url: this.configService.get('BASE_URL'),
//         verify_endpoint: `/auth/confirm-email/confirm?token=${user.confirmEmailToken}&email=${user.email}`,
//       },
//     });
//     this.emailLogger.log(
//       `Verification Mail Sent to : ${response?.envelope?.to?.toString()}`,
//     );
//     return response?.response;
//   }

//   async sendRegistrationSuccessMail(user: UserDocument) {
//     const response = await this.mailerService.sendMail({
//       to: user.email,
//       from: '<no-reply@guideli.com>', // override default from
//       subject: 'Welcome to Guideli Please confirm your email',
//       template: './new/registration_success', // `.hbs` extension is appended automatically
//       context: {
//         // ✏️ filling curly brackets with content
//         // "request": request,
//         email: user.email,
//         first_name: user.firstName,
//         last_name: user.lastName,
//         project_name: this.configService.get('PROJECT'),
//         domain_url: this.configService.get('BASE_URL'),
//         verify_endpoint: encodeURI(
//           `/auth/confirm-email/confirm?token=${user.confirmEmailToken}&email=${user.email}`,
//         ),
//       },
//     });
//     this.emailLogger.log(
//       `Registration  Success Mail Sent to : ${response?.envelope?.to?.toString()}`,
//     );
//     return response?.response;
//   }

//   async sendResetPasswordMail(user: UserDocument) {
//     const response = await this.mailerService.sendMail({
//       to: user.email,
//       from: '<no-reply@guideli.com>', // override default from
//       subject: 'Password Reset',
//       template: './reset_password', // `.hbs` extension is appended automatically
//       context: {
//         email: user.email,
//         first_name: user.firstName,
//         last_name: user.lastName,
//         project_name: this.configService.get('PROJECT'),
//         domain_url: this.configService.get('CLIENT_URL'),
//         reset_endpoint: encodeURI(
//           `/auth/reset-password?token=${user.changePasswordToken}&email=${user.email}`,
//         ),
//       },
//     });
//     this.emailLogger.log(
//       `Password Reset Mail Sent to : ${response?.envelope?.to?.toString()}`,
//     );
//     return response;
//   }
// }

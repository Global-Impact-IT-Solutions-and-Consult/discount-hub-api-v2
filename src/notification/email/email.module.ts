import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EnvironmentVariables } from 'src/common/config/env.config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (
        configService: ConfigService<EnvironmentVariables>,
      ) => ({
        transport: {
          service: 'gmail',
          // host: configService.get('EMAIL_HOST'),
          // secure: false,
          auth: {
            user: configService.get('EMAIL_USER'),
            pass: configService.get('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `${configService.get('EMAIL_USER')}`,
        },
        template: {
          dir: join(__dirname, '../../templates/mail'),
          adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
          options: {
            strict: true,
          },
        },
        options: {
          partials: {
            dir: join(__dirname, '../../templates/mail', 'partials'),
            options: {
              strict: true,
            },
          },
        },
      }),
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
  ],
})
export class EmailModule {}

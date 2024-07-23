import { Module, forwardRef } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../user/schemas/user.schema'; 
import { UserModule } from '../user/user.module';
// import { GoogleStrategy } from './strategies/google.strategy';
// import { GoogleAuthController } from './google-auth.controller';
// import { GoogleAuthService } from './services/google-auth.service';
import { MailService } from '../mail/mail.service';
import { ErrorSchema } from 'src/modules/error/schemas/error.schema';
import { WalletService } from '../wallet/services/wallet.service';
import { WalletSchema } from '../wallet/schemas/wallet.schema';
import { NotificationModule } from '../notification/notification.module';
// import { WalletModule } from '../wallet/wallet.module';
// import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Error', schema: ErrorSchema },
      { name: 'Wallet', schema: WalletSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => NotificationModule),
    // WalletModule,
    // MailModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    MailService,
    ConfigService,
    WalletService
    // GoogleStrategy,
    // GoogleAuthService
  ],
  exports: [AuthService, JwtService]
})
export class AuthModule {}

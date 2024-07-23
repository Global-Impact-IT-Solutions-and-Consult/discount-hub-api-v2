import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from '../dtos/sign-in.dto';
import { User } from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';
import { CreateAccountDto } from '../dtos/create-store-account.dto';
import { AuthOtpType, TokenTimeout } from '../constants/auth.constants';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { WalletService } from 'src/modules/wallet/services/wallet.service';
import { MailService } from 'src/modules/mail/mail.service';
import { VerifyAccountDto } from '../dtos/verify-account.dto';
import { SignInWithGoogleDto } from '../dtos/sign-in-with-google.dto';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { CreateAdmin } from '../interfaces/create-admin.interface';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService, // private walletService: WalletService,
    private mailService: MailService,
    private walletService: WalletService,
    private notificationService: NotificationService,
  ) {}

  private generateNumericToken(length: number): string {
    let token = '';
    while (token.length !== length) {
      const max = Number(`1${'0'.repeat(length)}`) - 1;
      token = `${Math.floor(Math.random() * max)}`;
    }
    return token;
  }

  private async validateOtp(data: {
    identifier: string;
    type: AuthOtpType;
    otp: string;
  }): Promise<boolean> {
    const user: User = await this.userService.findById(data.identifier);
    const date: Date = new Date();

    if (user?.otp?.expirationTime < date || !user?.otp)
      throw new UnauthorizedException({
        status: false,
        message: 'Invalid/Expired Token!',
      });
    if (user?.otp.token !== data?.otp)
      throw new BadRequestException({
        status: false,
        message: 'Invalid Token!',
      });
    await this.userService.update(user.id, {
      otp: null,
    });
    return true;
  }

  async makeOtp(data: {
    identifier: string;
    type: AuthOtpType;
    timeout: TokenTimeout;
  }): Promise<string> {
    const otp: string = this.generateNumericToken(6);
    const expirationTime: number = Date.now() + data?.timeout * 1000;
    const date: Date = new Date(expirationTime);
    const user: User = await this.userService.update(data.identifier, {
      otp: {
        token: otp,
        expirationTime: date,
      },
    });
    if (!user?.otp?.token)
      throw new InternalServerErrorException({
        status: false,
        message: 'Something went wrong generating otp!',
      });
    return otp;
  }

  async signUp(body: CreateAccountDto): Promise<string> {
    const { email, user_name, password, device_id } = body;
    const userExists: User = await this.userService.findByEmailOrUsername(
      email,
      user_name,
    );
    if (userExists) {
      throw new BadRequestException({
        status: false,
        message: 'User already exists',
      });
    }
    const hashedPassword: string = await this.hashData(password);
    const newUser = await this.userService.create({
      ...body,
      device_ids: [device_id],
      password: hashedPassword,
    });
    const tokens = await this.getTokens(newUser._id, newUser.email);
    await this.updateRefreshToken(newUser._id, tokens.refreshToken);
    const otp: string = await this.makeOtp({
      identifier: newUser?._id,
      type: AuthOtpType?.VERIFICATION,
      timeout: TokenTimeout?.ONE_HOUR,
    });
    this.mailService.sendUserConfirmation(newUser, otp).catch((err) => {
      console.error('Error sending email:', err);
    });
    await this.walletService.createWallet({
      role: newUser.role,
      user: newUser.id,
    });
    return 'User registered successfully. Please check your email to verify your mail';
  }

  async createAdmin(body: CreateAdmin): Promise<User>{
    const { password, device_ids } = body;
    const hashedPassword: string = await this.hashData(password);
    const newUser = await this.userService.create({
      ...body,
      is_confirmed: true,
      password: hashedPassword,
    });
    await this.walletService.createWallet({
      role: newUser.role,
      user: newUser.id,
    });
    return newUser
  }

  async signIn(data: SignInDto) {
    const user: User = await this.userService.findPasswordByEmail(data.email);
    if (!user)
      throw new BadRequestException({
        status: false,
        message: 'User does not exist',
      });
    if (!user.password)
      throw new BadRequestException({
        status: false,
        message: 'Please set your password.',
      });
    if (!user.is_confirmed)
      throw new BadRequestException({
        status: false,
        is_confirmed: false,
        message: 'Please verify your email',
      });
    const passwordMatches = await argon2.verify(user.password, data.password);
    if (!passwordMatches)
      throw new BadRequestException({
        status: false,
        message: 'Password is incorrect',
      });
    const tokens = await this.getTokens(user._id, user.email);
    await this.updateRefreshToken(user._id, tokens.refreshToken);
    const findUser: User = await this.userService.findById(user.id);
    await this.walletService.createWallet({
      role: user.role,
      user: user.id,
    });
    this.mailService.sendLoginEmail(findUser).catch((err) => {
      console.error('Error sending email:', err);
    });
    if (user.token) {
      const message_body =
        'New login attempt detected on your account. If this was not you, please secure your account immediately.';
      const title = 'Login Attempt Notification';
      await this.notificationService.sendNotification(
        { message_body, title },
        user,
      );
    }
    return { tokens, user: findUser };
  }

  async logout(userId: string) {
    return this.userService.update(userId, { refreshToken: null });
  }

  hashData(data: string) {
    return argon2.hash(data);
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.userService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async userVerifyEmail(body: VerifyOtpDto): Promise<any> {
    const user: User = await this.userService.findByEmail(body?.email);
    if (user?.is_confirmed)
      throw new BadRequestException({
        status: false,
        message: 'Email verified already!',
      });
    const isValid = await this.validateOtp({
      identifier: user?.id,
      type: AuthOtpType?.VERIFICATION,
      otp: body?.token,
    });
    if (!isValid)
      throw new BadRequestException({
        success: true,
        message: 'Otp is invalid or expired',
      });
    const updatedUser: User = await this.userService.update(user?.id, {
      is_confirmed: true,
    });
    // await this.mailService.sendWelcomeEmail({
    //   email: updatedUsxer?.email,
    //   name: updatedUser?.full_name,
    // });
    const tokens = await this.getTokens(user._id, user.email);
    await this.updateRefreshToken(user._id, tokens.refreshToken);
    return { updatedUser, tokens };
  }

  async userResendVerificationToken(email: string): Promise<string> {
    const user: User = await this.userService.findByEmail(email);
    if (!user)
      throw new NotFoundException({
        status: false,
        message: 'User not found',
      });
    if (user.is_confirmed)
      throw new BadRequestException({
        status: false,
        message: 'Account already verified',
      });
    // await this.redisService.del(`otp:${AuthOtpType?.VERIFICATION}:${user?.id}`);
    await this.userService.update(user.id, {
      code: null,
    });
    const otp: string = await this.makeOtp({
      identifier: user?.id,
      type: AuthOtpType?.VERIFICATION,
      timeout: TokenTimeout?.TWELVE_HOUR,
    });
    this.mailService.sendUserConfirmation(user, otp).catch((err) => {
      console.error('Error sending email:', err);
    });
    return 'Verification OTP sent successfully.';
  }

  async verifyAccount(body: VerifyAccountDto): Promise<string> {
    const user: User = await this.userService.findByEmail(body.email);
    if (!user)
      throw new BadRequestException({
        status: false,
        message: 'Account does not exist',
      });

    if (!user?.is_confirmed)
      throw new UnauthorizedException({
        status: false,
        message: 'Account not verified, please contact support!',
      });
    const isValid: boolean = await this.validateOtp({
      identifier: user?.id,
      type: AuthOtpType.VERIFICATION,
      otp: body?.token,
    });
    if (!isValid)
      throw new UnauthorizedException({
        status: false,
        message: 'This otp is Invalid or expired',
      });
    // const hashedPassword: string = await this.hashData(body?.password);
    // await this.userService.update(user.id, {
    //   password: hashedPassword,
    // });
    await this.walletService.createWallet({
      role: user.role,
      user: user.id,
    });
    return 'Account has been verified.';
  }

  async resetPassword(body: ResetPasswordDto): Promise<string> {
    const user: User = await this.userService.findByEmail(body.email);
    if (!user)
      throw new BadRequestException({
        status: false,
        message: 'Account does not exist',
      });

    if (!user?.is_confirmed)
      throw new UnauthorizedException({
        status: false,
        message: 'Account not verified, please contact support!',
      });
    const hashedPassword: string = await this.hashData(body?.password);
    await this.userService.update(user.id, {
      password: hashedPassword,
    });
    return 'Password updated successfully.';
  }

  async userForgotPassword(email: string): Promise<string> {
    const user: User = await this.userService.findByEmail(email);
    if (!user)
      throw new BadRequestException({
        status: false,
        message: 'Account does not exist',
      });
    if (!user?.is_confirmed)
      throw new UnauthorizedException({
        status: false,
        message: 'Account not verified, please contact support!',
      });
    const otp: string = await this.makeOtp({
      identifier: user?.id,
      type: AuthOtpType.VERIFICATION,
      timeout: TokenTimeout.ONE_HOUR,
    });

    const expirationTime: number = Date.now() + TokenTimeout.ONE_HOUR * 1000;
    const expirationDate: Date = new Date(expirationTime);
    await this.userService.update(user.id, {
      otp: {
        token: otp,
        expirationTime: expirationDate,
      },
    });
    this.mailService.sendResetPasswordEmail(user, otp).catch((err) => {
      console.error('Error sending email:', err);
    });
    return 'Please check your email to continue.';
  }

  async signInWithGoogle(body: SignInWithGoogleDto) {
    const { email, role, device_id, full_name } = body;
    let user: User = await this.userService.findByEmail(email);
    if (!user) {
      if (!role)
        throw new ForbiddenException({
          status: false,
          message: 'Role must be specified for first sign in',
        });
      user = await this.userService.create({
        full_name: full_name,
        email,
        user_name: this.generateRandomUsername(),
        role: role,
        device_ids: [device_id],
      });
      user.is_confirmed = true;
      await user.save();
    } else {
      if (!user.device_ids.includes(device_id)) {
        user.device_ids.push(device_id);
        await this.userService.updateUser({
          userId: user.id,
          updateUserId: user.id,
          device_ids: user.device_ids,
        });
      }
    }
    if (user.token) {
      const message_body =
        'New login attempt detected on your account. If this was not you, please secure your account immediately.';
      const title = 'Login Attempt Notification';
      await this.notificationService.sendNotification(
        { message_body, title },
        user,
      );
    }
    await this.walletService.createWallet({
      role: user.role,
      user: user.id,
    });
    this.mailService.sendLoginEmail(user).catch((err) => {
      console.error('Error sending email:', err);
    });
    const tokens = await this.getTokens(user._id, user.email);
    await this.updateRefreshToken(user._id, tokens.refreshToken);
    return { tokens, user: user };
  }

  // async signInWithGoogle(body: GoogleDetailsInterface) {
  //   const { email, verified_email } = body;
  //   if (!verified_email)
  //     throw new BadRequestException({
  //       success: false,
  //       message: 'Google email has not been verified',
  //     });
  //   let user: User = await this.userService.findByEmail(email);
  //   // if (user) {
  //   //   if (user.sign_in_type !== 'google')
  //   //     throw new BadRequestException({
  //   //       success: false,
  //   //       message: 'Please sign in with username and password.',
  //   //     });
  //   // } else {
  //   if (!user) {
  //     user = await this.userService.create({
  //       full_name: body.name,
  //       email,
  //       user_name: this.generateRandomUsername(),
  //     });
  //     user.is_confirmed = true;
  //     await user.save();
  //   }
  //   // }
  //   const tokens = await this.getTokens(user._id, user.email);
  //   await this.updateRefreshToken(user._id, tokens.refreshToken);
  //   return { tokens };
  // }

  async changePassword(body: {
    user: User;
    password: string;
    newPassword: string;
  }): Promise<string> {
    const { user, password, newPassword } = body;
    const findUser: User = await this.userService.findPasswordByEmail(
      user.email,
    );
    const passwordMatches = await argon2.verify(findUser.password, password);
    if (!passwordMatches)
      throw new BadRequestException({
        status: false,
        message: 'Password is incorrect',
      });
    const hash = await this.hashData(newPassword);
    await this.userService.update(user.id, {
      password: hash,
    });
    return 'Password changed successfully';
  }

  async getTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '6h',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  generateRandomUsername(): string {
    const adjectives = [
      'happy',
      'silly',
      'funny',
      'clever',
      'bright',
      'witty',
      'lively',
      'great',
      'bubbly',
    ];
    const nouns = [
      'cat',
      'dog',
      'rabbit',
      'penguin',
      'elephant',
      'koala',
      'unicorn',
      'dragon',
      'narwhal',
      'octopus',
    ];

    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    let username =
      this.getRandomElement(adjectives) + this.getRandomElement(nouns);

    const numDigits = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numDigits; i++) {
      username += this.getRandomElement(numbers);
    }

    return username;
  }

  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

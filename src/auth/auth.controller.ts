import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { SignInDto } from './dtos/sign-in.dto';
import { ExceptionsLoggerFilter } from 'src/framework/exceptions/exceptionLogger.filter';
import { IAuthorizedRequest } from 'src/common/interfaces/authorized-request.interface';
import { ApiTags } from '@nestjs/swagger';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { User } from '../user/interfaces/user.interface';
import { ResendOtpDto } from './dtos/resend-otp.dto';
import { Tokens } from './interfaces/tokens.interface';
import { AuthGuard } from 'src/framework/guards/auth.guard';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserGuard } from 'src/framework/guards/user.guard';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { CreateAccountDto } from './dtos/create-store-account.dto';
import { VerifyAccountDto } from './dtos/verify-account.dto';
import { SignInWithGoogleDto } from './dtos/sign-in-with-google.dto';
import { SpikkGuard } from 'src/framework/guards/spikk.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  @UseFilters(ExceptionsLoggerFilter)
  async signup(@Body() createAccountDto: CreateAccountDto) {
    const message: string = await this.authService.signUp(
      createAccountDto,
    );
    return {
      status: true,
      message
    };
  }

  @Post('/email/validate')
  @UseFilters(ExceptionsLoggerFilter)
  @HttpCode(200)
  async verifyEmail(@Body() body: VerifyOtpDto) {
    const data = await this.authService.userVerifyEmail(body);
    return {
      status: true,
      message: 'Your email has been verified.',
      data,
    };
  }

  @Post('login')
  @HttpCode(200)
  @UseFilters(ExceptionsLoggerFilter)
  async signIn(@Body() data: SignInDto) {
    const tokens = await this.authService.signIn(data);
    return {
      status: true,
      message: 'Login successful',
      data: tokens,
    };
  }

  @Get('/forgot/:email')
  @UseFilters(ExceptionsLoggerFilter)
  async forgotPassword(@Param() param: ForgotPasswordDto) {
    const message: string = await this.authService.userForgotPassword(
      param.email,
    );
    return {
      status: true,
      message,
      data: null,
    };
  }

  @Post('/verify/validate')
  @HttpCode(200)
  @UseFilters(ExceptionsLoggerFilter)
  async verifyAccount(@Body() body: VerifyAccountDto) {
    const message: string = await this.authService.verifyAccount(body);
    return {
      status: true,
      message,
    };
  }

  @Post('/reset/validate')
  @HttpCode(200)
  @UseFilters(ExceptionsLoggerFilter)
  async resetPassword(@Body() body: ResetPasswordDto) {
    const message: string = await this.authService.resetPassword(body);
    return {
      status: true,
      message,
      data: null,
    };
  }

  @Get('/email/resend/:email')
  @UseFilters(ExceptionsLoggerFilter)
  async resendVerificationToken(@Param() param: ResendOtpDto) {
    const message: string = await this.authService.userResendVerificationToken(
      param.email,
    );
    return {
      status: true,
      message,
      data: null,
    };
  }

  @Put('/change-password')
  @UseGuards(AuthGuard)
  @UseFilters(ExceptionsLoggerFilter)
  async changePassword(
    @Body() body: ChangePasswordDto,
    @UserGuard() user: User,
  ) {
    const message: string = await this.authService.changePassword({
      user,
      ...body,
    });
    return {
      status: true,
      message,
      data: null,
    };
  }

  @Post('/google/sign-in')
  @UseGuards(SpikkGuard)
  async signInWithGoogle(@Body() body: SignInWithGoogleDto){
    const tokens = await this.authService.signInWithGoogle(body)
    return {
      status: true,
      message: "Google sign in successful",
      data: tokens
    }
  }

  @Get('logout')
  @UseGuards(AuthGuard)
  @UseFilters(ExceptionsLoggerFilter)
  logout(@Req() request: IAuthorizedRequest) {
    this.authService.logout(request.user.id);
    return {
      status: true,
      message: 'Logged out successfully',
      data: null,
    };
  }
}

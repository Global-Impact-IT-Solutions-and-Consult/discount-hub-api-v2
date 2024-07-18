import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/loginGuard.guard';
import { UserDocument } from 'src/user/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '@nestjs/passport';
import { IGoogleUser } from './strategy/google.strategy';
import { Response } from 'express';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async loginUser(@Req() request: Request) {
    const user = (request as any).user as UserDocument;
    const data = await this.authService.loginUser(user);
    return {
      success: true,
      message: 'user logged in successfully',
      data: data,
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async signInWithGoogle() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() request: Request, @Res() res: Response) {
    const user = (request as any).user as IGoogleUser;
    const data = await this.authService.googleLogin(user);
    res.redirect(data);
  }

  @Post('register')
  async registerAgent(@Body() registerDto: RegisterDto) {
    const data = await this.authService.register(registerDto);
    return {
      success: true,
      message: 'User registered please confirm your email',
      data: data,
    };
  }

  @Post('confirm-email')
  async confirmEmail(@Body() confirmEmailDto: ConfirmEmailDto) {
    const data = await this.authService.confirmUserEmail(
      confirmEmailDto.email,
      confirmEmailDto.token,
    );
    return {
      success: true,
      message: 'Email confirmed successfully',
      data: data,
    };
  }

  @Get('confirm-email')
  async sendConfirmEmail(@Query('email') email: string) {
    const data = await this.authService.sendConfirmEmail(email);
    return {
      success: true,
      message: 'Email confirmed request sent successfully',
      data: data,
    };
  }

  @Get('change-password')
  async sendChangePasswordLink(@Query('email') email: string) {
    const data = await this.authService.sendChangePasswordUrl(email);
    return {
      success: true,
      message: 'Password reset link sent successfully',
      data: data,
    };
  }

  @Post('change-password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    const data = await this.authService.changePassword(changePasswordDto);
    return {
      success: true,
      message: 'Password changed successfully',
      data: data,
    };
  }
}

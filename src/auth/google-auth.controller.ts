// import {
//   Controller,
//   Get,
//   UseGuards,
//   Request,
//   Res,
//   Req,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { Response } from 'express';
// import { ApiTags } from '@nestjs/swagger';
// import { GoogleAuthService } from './services/google-auth.service';
// import { CheckTokenExpiryGuard } from 'src/framework/guards/checkTokenExpiry.guard';
// import { env } from 'src/common/config/env.config';
// import { AuthService } from './services/auth.service';
// const { GOOGLE_REDIRECT_URL } = env;

// @ApiTags('google')
// @Controller('google')
// export class GoogleAuthController {
//   constructor(
//     private googleAuthService: GoogleAuthService,
//     private authService: AuthService,
//   ) {}

  // @Get('/')
  // @UseGuards(AuthGuard('google'))
  // googleLogin() {}

  // @Get('/callback')
  // @UseGuards(AuthGuard('google'))
  // googleLoginCallback(@Request() req, @Res() res: Response) {
  //   const googleToken = req.user.accessToken;
  //   const googleRefreshToken = req.user.refreshToken;

  //   res.cookie('access_token', googleToken, { httpOnly: true });
  //   res.cookie('refresh_token', googleRefreshToken, {
  //     httpOnly: true,
  //   });
  //   res.redirect(`${GOOGLE_REDIRECT_URL}`);
  // }

  // @UseGuards(CheckTokenExpiryGuard)
  // @Get('profile')
  // async getProfile(@Request() req) {
  //   const accessToken = req.cookies['access_token'];
  //   if (accessToken) {
  //     const userData = (await this.googleAuthService.getProfile(accessToken))
  //       .data;
  //     return await this.authService.signInWithGoogle(userData);
  //   }
  //   throw new UnauthorizedException('No access token');
  // }

  // @Get('logout')
  // logout(@Req() req, @Res() res: Response) {
  //   const refreshToken = req.cookies['refresh_token'];
  //   res.clearCookie('access_token');
  //   res.clearCookie('refresh_token');
  //   this.googleAuthService.revokeGoogleToken(refreshToken);
  //   res.redirect('http://localhost:3000/');
  // }
// }

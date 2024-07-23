import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth2';
import { AuthService } from '../auth.service';
import { EnvironmentVariables } from 'src/common/config/env.config';

export interface IGoogleUser {
  provider: string;
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService<EnvironmentVariables>,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get('GOOGLE_OAUTH_CLIENTID'),
      clientSecret: configService.get('GOOGLE_OAUTH_SECRET'),
      callbackURL: `${configService.get('BASE_URL')}/auth/google/callback`,
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const googleUser = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
    } as IGoogleUser;

    done(null, googleUser);
  }
}

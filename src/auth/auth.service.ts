import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { IGoogleUser } from './strategy/google.strategy';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { RegistrationTypeEnum } from 'src/utils/constants';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/common/config/env.config';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.userService.create(registerDto);
    return user;
  }

  loginUser(user: UserDocument) {
    const payload = { username: user.email, sub: user._id };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken: accessToken,
      user: user,
    };
  }

  async googleLogin(data: IGoogleUser) {
    try {
      const user = await this.userService.findOneByEmail(data.email);
      const loggedInUser = this.loginUser(user);
      return `${this.configService.get(`CLIENT_URL`)}/auth/login?type=google&email=${loggedInUser.user.email}&token=${loggedInUser.accessToken}&auth=login`;
    } catch (error) {
      if (error.status === 404) {
        interface IGoogleCreateUserDto extends CreateUserDto {
          isEmailVerified: boolean;
          roleName?: string;
          registrationType: RegistrationTypeEnum;
        }
        const userDetails: IGoogleCreateUserDto = {
          email: data.email,
          lastName: data.lastName,
          firstName: data.firstName,
          isEmailVerified: true,
          password: data.providerId,
          registrationType: RegistrationTypeEnum.GOOGLE,
        };

        const newUser = await this.userService.create(userDetails);
        const loggedInUser = this.loginUser(newUser);
        return `${this.configService.get(`CLIENT_URL`)}/auth/login?type=google&email=${loggedInUser.user.email}&token=${loggedInUser.accessToken}&auth=register`;
      } else {
        console.log(error);
        throw new InternalServerErrorException(error.detail);
      }
    }
  }

  async getAuthenticatedUser(usernameOrEmail: string, password: string) {
    const user = await this.userService.findOneByEmail(usernameOrEmail);
    const result = await user.comparePassword(password);
    if (!result) {
      throw new BadRequestException('Wrong details provided');
    }
    return user;
  }

  async getUser(emailOrUserName: string) {
    const user = await this.userService.findOneByEmail(emailOrUserName);
    return user;
  }

  //Confirm User Email
  async sendConfirmEmail(email: string) {
    const user = await this.userService.findOneByEmail(email);
    const res = await this.userService.generateConfirmEmailToken(user);
    return res;
  }

  async confirmUserEmail(email: string, token: string) {
    const res = await this.userService.confirmUserEmail(email, token);
    return res;
  }

  //Change Password
  async sendChangePasswordUrl(email: string) {
    const user = await this.userService.findOneByEmail(email);
    const res = await this.userService.generatePasswordResetToken(user);
    return res;
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    const res = await this.userService.changePassword(changePasswordDto);
    return res;
  }
}

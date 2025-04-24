import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { add } from 'date-fns';
import * as otpGenerator from 'otp-generator';
import { CreateUserDto } from './dto/create-user.dto';
import { NotificationService } from 'src/notification/notification.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from 'src/auth/dto/change-password.dto';
import { Newsletter, NewsletterDocument } from './schemas/newsletter.schema';

@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel('Newsletter')
    private readonly newsletterModel: Model<Newsletter>,
    private notificationService: NotificationService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const user = new this.userModel({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      password: createUserDto.password,
    });
    const emailSentUser = await this.generateConfirmEmailToken(user);
    return emailSentUser;
  }

  async findAll() {
    const users = await this.userModel.find();
    return users;
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User Not found for this ID:${id}`);
    }
    return user;
  }

  async findOneByEmail(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException(`User Not found for this email:${email}`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    for (const key in updateUserDto) {
      user[key] = updateUserDto[key];
    }

    return await user.save();
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }

  // Confirm Email
  async generateConfirmEmailToken(user: UserDocument) {
    const verificationToken = otpGenerator.generate(4, {
      digits: true,
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });
    const expire = add(new Date(), { minutes: 15 });
    user.confirmEmailToken = verificationToken;
    user.confirmEmailTTL = expire;
    // this.notificationService.sendConfirmEmailNotification(user);
    await user.save();
    return user;
  }

  async confirmUserEmail(email: string, token: string) {
    const user = await this.findOneByEmail(email);
    const currentDate = new Date().getTime();

    if (currentDate > new Date(user.confirmEmailTTL).getTime()) {
      throw new UnauthorizedException('Token Expired');
    }
    if (token !== user.confirmEmailToken) {
      throw new UnauthorizedException('Invalid Token');
    }
    user.isEmailVerified = true;
    user.confirmEmailTTL = null;
    user.confirmEmailToken = null;
    // await this.notificationService.sendConfirmEmailNotification(user);
    await user.save();
    return user;
  }

  // Password Reset
  async generatePasswordResetToken(user: UserDocument) {
    const passwordResetToken = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });

    const expire = add(new Date(), { minutes: 15 });

    user.changePasswordToken = passwordResetToken;
    user.changePasswordTokenTTL = expire;
    this.notificationService.sendResetPasswordNotification(user);
    await user.save();
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    const user = await this.findOneByEmail(changePasswordDto.email);
    const currentDate = new Date().getTime();

    if (currentDate > new Date(user.changePasswordTokenTTL).getTime()) {
      throw new UnauthorizedException('Token Expired');
    }
    if (changePasswordDto.token !== user.changePasswordToken) {
      throw new UnauthorizedException('Invalid Token');
    }
    user.password = changePasswordDto.password;
    user.changePasswordToken = null;
    user.changePasswordTokenTTL = null;
    await user.save();
    return user;
  }

  // ************* //
  // Newsletter functions
  // ************* //
  async createNewsletter(NewsletterData: {
    email: string;
  }): Promise<NewsletterDocument> {
    const existingNewsletter = await this.newsletterModel
      .findOne({ email: NewsletterData.email })
      .exec();
    if (existingNewsletter) {
      throw new ConflictException('Email already subscribed to the newsletter');
    }
    const newNewsletter = new this.newsletterModel(NewsletterData);
    return await newNewsletter.save();
  }

  async getAllNewsletters(): Promise<NewsletterDocument[]> {
    const cacheKey = 'all_newsletters';
    const cachedNewsletters =
      await this.cacheManager.get<NewsletterDocument[]>(cacheKey);
    if (cachedNewsletters) {
      console.log(`Fetching all newsletters from cache`);
      return cachedNewsletters;
    }

    console.log(`Fetching all newsletters from database`);
    const newsletters = await this.newsletterModel.find().exec();

    if (newsletters) {
      await this.cacheManager.set(cacheKey, newsletters, 3600); // Cache for 1 hour
    }

    return newsletters;
  }

  async deleteNewsletter(id: string): Promise<NewsletterDocument | null> {
    return await this.newsletterModel.findByIdAndDelete(id).exec();
  }

  async deleteAllNewsletters(): Promise<void> {
    await this.newsletterModel.deleteMany().exec();
    await this.cacheManager.del('all_newsletters'); // Invalidate cache
  }
}

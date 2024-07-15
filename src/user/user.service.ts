import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(User.name) private userModel: Model<User>,
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
    this.notificationService.sendEmailConfirmationSuccessNotification(user);
    await user.save();
    return user;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './interfaces/user.interface';
// import { RedisService } from 'src/redis.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel('User') private readonly userModel: Model<User>,
    // private readonly redisService: RedisService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<User> {
    // let users = await this.cacheManager.get('users');
    // let users = await this.redisService.get('users');
    const users = this.userModel.find().exec();
    // this.cacheManager.set('users', users);
    if (!users)
      throw new NotFoundException({
        status: false,
        message: 'No User found',
      });
    return users as any;
  }

  // async findAll(): Promise<User[]> {
  //   // Attempt to get users from Redis cache
  //   let users = await this.redisService.get('users');

  //   // If users are not in the cache, retrieve them from the database
  //   if (!users) {
  //     users = (await this.userModel.find().exec()) as any;
  //     // Cache the users as a JSON string
  //     await this.redisService.set('users', JSON.stringify(users));
  //   } else {
  //     // Parse the cached JSON string back into an array of users
  //     users = JSON.parse(users);
  //   }

  //   return users as any;
  // }

  async findOne(id: string): Promise<User> {
    const user = this.userModel.findById(id);
    if (!user)
      throw new NotFoundException({
        status: false,
        message: 'User not found',
      });
    return user;
  }

  async findByEmailOrUsername(email: string, user_name: string): Promise<User> {
    const user = this.userModel
      .findOne({ $or: [{ email }, { user_name }] })
      .exec();
    if (!user)
      throw new NotFoundException({
        status: false,
        message: 'User not found',
      });
    return user;
  }

  update(id: string, body: UpdateUserDto) {
    return `This action updates a #${id} user ${body}`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}

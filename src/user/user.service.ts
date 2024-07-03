import { Inject, Injectable } from '@nestjs/common';
import { CreateUser } from './interfaces/create-user.interface';
import { UpdateUser } from './interfaces/update-user.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  create(body: CreateUser) {
    return `This action adds a new user ${body}`;
  }

  findAll() {
    // let users = this.cacheManager.get('users');
    // if (!users) {
    //   users = this.
    // }
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, body: UpdateUser) {
    return `This action updates a #${id} user ${body}`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}

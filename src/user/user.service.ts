import { Injectable } from '@nestjs/common';
import { CreateUser } from './interfaces/create-user.interface';
import { UpdateUser } from './interfaces/update-user.interface';

@Injectable()
export class UserService {
  create(body: CreateUser) {
    return `This action adds a new user ${body}`;
  }

  findAll() {
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

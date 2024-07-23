import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(@InjectModel(Role.name) private roleModel: Model<Role>) {}
  async create(createRoleDto: CreateRoleDto) {
    const newRole = new this.roleModel(createRoleDto);
    return await newRole.save();
  }

  async findAll() {
    const roles = await this.roleModel.find();
    return roles;
  }

  async findOne(id: string) {
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  }

  async findOneByName(name: string) {
    const role = await this.roleModel.findOne({
      name: name,
    });
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);

    for (const item in updateRoleDto) {
      role[item] = updateRoleDto[item];
    }
    await role.save();
    return role;
  }

  async remove(id: string) {
    // const deleteResponse = await this.roleModel.deleteOne(id);
    // if (!deleteResponse.affected) {
    //   throw new NotFoundException('Role not found for this ID');
    // }
    const role = await this.findOne(id);
    return role.deleteOne();
  }
}

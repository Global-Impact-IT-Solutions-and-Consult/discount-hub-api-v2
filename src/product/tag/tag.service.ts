import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Tag } from './schema/tag.schema';
import { Model } from 'mongoose';

@Injectable()
export class TagService {
  constructor(@InjectModel(Tag.name) private tagModel: Model<Tag>) {}

  async create(name: string) {
    return this.tagModel.create({ name });
  }

  async findAll() {
    return this.tagModel.find().exec();
  }

  async findOne(id: string) {
    return this.tagModel.findById(id).exec();
  }

  async update(id: string, name: string) {
    return this.tagModel.findByIdAndUpdate(id, { name }, { new: true }).exec();
  }

  async remove(id: string) {
    return this.tagModel.findByIdAndDelete(id).exec();
  }

  async findOrCreate(name: string) {
    let tag = await this.tagModel.findOne({ name }).exec();
    if (!tag) {
      tag = await this.create(name);
    }
    return tag;
  }
}

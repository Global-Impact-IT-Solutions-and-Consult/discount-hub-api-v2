import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Tag } from './schema/tag.schema';
import { Model } from 'mongoose';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateCategoryDto } from '../category/dto/update-category.dto';

@Injectable()
export class TagService {
  constructor(@InjectModel(Tag.name) private tagModel: Model<Tag>) {}

  async create(createTagDto: CreateTagDto) {
    return this.tagModel.create(createTagDto);
  }

  async findAll() {
    return this.tagModel.find().exec();
  }

  async findOne(id: string) {
    return this.tagModel.findById(id).exec();
  }

  async findOneByName(name: string) {
    return this.tagModel.findOne({ name }).exec();
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    return this.tagModel
      .findByIdAndUpdate(id, { ...updateCategoryDto }, { new: true })
      .exec();
  }

  async remove(id: string) {
    return this.tagModel.findByIdAndDelete(id).exec();
  }

  async findOrCreate(createTagDto: CreateTagDto) {
    return this.tagModel
      .findOneAndUpdate(
        { name: createTagDto.name },
        { $set: { ...createTagDto } },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
  }

  async clearTags() {
    return await this.tagModel.deleteMany({ isSeeded: false }).exec();
  }
}

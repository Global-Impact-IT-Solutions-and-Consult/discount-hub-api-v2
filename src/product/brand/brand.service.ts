import { Injectable } from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Brand } from './schemas/brand.schema';
import { Model } from 'mongoose';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(@InjectModel(Brand.name) private brandModel: Model<Brand>) {}

  async create(createBrandDto: CreateBrandDto) {
    return this.brandModel.create(createBrandDto);
  }

  async findAll() {
    return this.brandModel.find().exec();
  }

  async findOne(id: string) {
    return this.brandModel.findById(id).exec();
  }

  async findOneByName(name: string) {
    return this.brandModel.findOne({ name }).exec();
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    return this.brandModel
      .findByIdAndUpdate(id, { ...updateBrandDto }, { new: true })
      .exec();
  }

  async remove(id: string) {
    return this.brandModel.findByIdAndDelete(id).exec();
  }

  async findOrCreate(createBrandDto: CreateBrandDto) {
    return this.brandModel
      .findOneAndUpdate(
        { name: createBrandDto.name },
        { $set: { ...createBrandDto } },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
  }
}

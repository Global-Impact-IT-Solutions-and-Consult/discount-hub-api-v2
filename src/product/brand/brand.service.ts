import { Injectable } from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Brand } from './schemas/brand.schema';
import { Model, Types } from 'mongoose';
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

  async clearBrands(): Promise<any> {
    return await this.brandModel.deleteMany({ isSeeded: false }).exec();
  }

  async getProductsByBrand(
    brandId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const products = await this.brandModel.db
      .collection('products')
      .aggregate([
        {
          $match: {
            brand: new Types.ObjectId(brandId),
          },
        },
        {
          $lookup: {
            from: 'brands',
            localField: 'brand',
            foreignField: '_id',
            as: 'brandDetails',
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categories',
            foreignField: '_id',
            as: 'categoryDetails',
          },
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'store',
            foreignField: '_id',
            as: 'companyDetails',
          },
        },
        {
          $lookup: {
            from: 'tags',
            localField: 'tags',
            foreignField: '_id',
            as: 'tagDetails',
          },
        },
        {
          $addFields: {
            brand: { $arrayElemAt: ['$brandDetails', 0] },
            categories: '$categoryDetails',
            store: { $arrayElemAt: ['$companyDetails', 0] },
            tags: '$tagDetails',
          },
        },
        {
          $project: {
            brandDetails: 0,
            categoryDetails: 0,
            companyDetails: 0,
            tagDetails: 0,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    const total = await this.brandModel.db
      .collection('products')
      .countDocuments({
        brand: new Types.ObjectId(brandId),
      });

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

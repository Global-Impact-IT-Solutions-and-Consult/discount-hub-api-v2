import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category } from './schemas/category.schema';
import { Model } from 'mongoose';
import { CreateCategoryDTO } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-categories.dto';
import { QueryOrderEnum } from 'src/utils/constants';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(createCategoryDTO: CreateCategoryDTO) {
    const newCategory = new this.categoryModel(createCategoryDTO);
    if (createCategoryDTO.parentCategoryId) {
      const parentCategory = await this.findOneById(
        createCategoryDTO.parentCategoryId,
      );
      if (!parentCategory) {
        throw new BadRequestException('No Category found for this ID');
      }
      newCategory.parentCategory = parentCategory;
    }
    return await newCategory.save();
  }

  async findAll() {
    const categories = await this.categoryModel.find().populate('productCount');
    return categories;
  }

  async findOneById(id: string) {
    const category = await this.categoryModel
      .findById(id)
      .populate('productCount');
    return category;
  }

  async findOneByName(name: string) {
    const category = await this.categoryModel
      .findOne({ name })
      .populate('productCount');
    return category;
  }

  async findOneOrCreate(createCategoryDTO: CreateCategoryDTO) {
    const category = await this.categoryModel
      .findOneAndUpdate(
        { name: createCategoryDTO.name },
        {
          $set: {
            ...createCategoryDTO,
            parentCategory: createCategoryDTO.parentCategoryId,
          },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .collation({ locale: 'en', strength: 2 });
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOneById(id);
    if (!category) {
      throw new BadRequestException('No Category found for this ID');
    }

    for (const key in updateCategoryDto) {
      if (updateCategoryDto.parentCategoryId) {
        const parentCategory = await this.findOneById(
          updateCategoryDto.parentCategoryId,
        );
        if (!parentCategory) {
          throw new BadRequestException('No Category found for this ID');
        }
        category.parentCategory = parentCategory;
      }
      category[key] = updateCategoryDto[key];
    }
  }

  async queryCategories(queryCategoryDto: QueryCategoryDto) {
    const filter: any = {};

    if (queryCategoryDto.name) {
      filter.name = { $regex: queryCategoryDto.name, $options: 'i' };
    }
    if (queryCategoryDto.isFeatured !== undefined) {
      filter.isFeatured = queryCategoryDto.isFeatured;
    }

    const {
      sortBy = 'createdAt',
      order = QueryOrderEnum.DESC,
      page = 1,
      limit = 10,
    } = queryCategoryDto;

    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = order === QueryOrderEnum.ASC ? 1 : -1;

    const [categories, total] = await Promise.all([
      this.categoryModel.find(filter).sort(sort).skip(skip).limit(limit),
      this.categoryModel.countDocuments(filter),
    ]);

    return {
      data: categories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async fetchFeaturedCategories() {
    const categories = await this.categoryModel.aggregate([
      { $match: { isSeeded: true } },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'categories',
          as: 'productCount',
        },
      },
      { $addFields: { productCount: { $size: '$productCount' } } },
      { $sort: { productCount: -1 } },
      { $limit: 3 },
    ]);
    return categories;
  }
  async delete(id: string) {
    return await this.categoryModel.findByIdAndDelete(id);
  }

  async clearCategories() {
    return await this.categoryModel.deleteMany({ isSeeded: false });
  }
}

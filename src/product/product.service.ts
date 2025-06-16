import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Model, Types } from 'mongoose';
import { QueryProductDto } from './dto/query-product.dto';
import { QueryOrderEnum } from 'src/utils/constants';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createProduct: CreateProductDto) {
    const product = new this.productModel(createProduct);
    await product.save();
    return product;
  }

  async findAll() {
    const products = await this.productModel
      .find()
      .populate('categories')
      .populate('brand')
      .exec();
    return products;
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();
    return updatedProduct;
  }

  async remove(id: string) {
    await this.productModel.findByIdAndDelete(id).exec();
  }

  // TODO create comprehensive query for fetching products
  async queryProduct(queryProductDto: QueryProductDto) {
    const {
      name,
      minPrice,
      maxPrice,
      minDiscountPrice,
      maxDiscountPrice,
      minRating,
      minNumberOfRatings,
      maxNumberOfRatings,
      storeName,
      storeIds,
      tagNames,
      tagIds,
      brandName,
      brandIds,
      categoryName,
      categoryIds,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = QueryOrderEnum.DESC,
    } = queryProductDto;

    // Build the aggregation pipeline
    const pipeline: any[] = [];

    // Match stage for basic product fields
    const matchStage: any = {};

    // 1. Name search (case insensitive)
    if (name) {
      matchStage.name = { $regex: name, $options: 'i' };
    }

    // 2. Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      matchStage.price = {};
      if (minPrice !== undefined) matchStage.price.$gte = minPrice;
      if (maxPrice !== undefined) matchStage.price.$lte = maxPrice;
    }

    // 3. Discount price range
    if (minDiscountPrice !== undefined || maxDiscountPrice !== undefined) {
      matchStage.discountPrice = {};
      if (minDiscountPrice !== undefined)
        matchStage.discountPrice.$gte = minDiscountPrice;
      if (maxDiscountPrice !== undefined)
        matchStage.discountPrice.$lte = maxDiscountPrice;
    }

    // 4. Rating greater than
    if (minRating !== undefined) {
      matchStage.rating = { $gte: minRating.toString() };
    }

    // 5. Number of ratings range
    if (minNumberOfRatings !== undefined || maxNumberOfRatings !== undefined) {
      matchStage.numberOfRatings = {};
      if (minNumberOfRatings !== undefined) {
        matchStage.numberOfRatings.$gte = minNumberOfRatings.toString();
      }
      if (maxNumberOfRatings !== undefined) {
        matchStage.numberOfRatings.$lte = maxNumberOfRatings.toString();
      }
    }

    // Add the initial match stage if there are any conditions
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Populate stages with filtering
    const lookupStages: any[] = [];

    // 6. Store/Company lookup and filtering
    lookupStages.push({
      $lookup: {
        from: 'companies',
        localField: 'store',
        foreignField: '_id',
        as: 'storeDetails',
      },
    });

    // 7. Tags lookup and filtering
    lookupStages.push({
      $lookup: {
        from: 'tags',
        localField: 'tags',
        foreignField: '_id',
        as: 'tagDetails',
      },
    });

    // 8. Brand lookup and filtering
    lookupStages.push({
      $lookup: {
        from: 'brands',
        localField: 'brand',
        foreignField: '_id',
        as: 'brandDetails',
      },
    });

    // 9. Categories lookup and filtering
    lookupStages.push({
      $lookup: {
        from: 'categories',
        localField: 'categories',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    });

    // Add all lookup stages
    pipeline.push(...lookupStages);

    // Build the match stage for populated fields
    const populatedMatchStage: any = {};

    // Store filtering
    if (storeName || storeIds) {
      const storeConditions: any[] = [];
      if (storeName) {
        storeConditions.push({
          'storeDetails.name': { $regex: storeName, $options: 'i' },
        });
      }
      if (storeIds) {
        storeConditions.push({
          'storeDetails._id': {
            $in: storeIds.map((id) => new Types.ObjectId(id)),
          },
        });
      }
      populatedMatchStage.$or = [
        ...(populatedMatchStage.$or || []),
        ...storeConditions,
      ];
    }

    // Tag filtering
    if (tagNames || tagIds) {
      const tagConditions: any[] = [];
      if (tagNames && tagNames.length > 0) {
        tagConditions.push({
          'tagDetails.name': {
            $in: tagNames.map((name) => new RegExp(name, 'i')),
          },
        });
      }
      if (tagIds && tagIds.length > 0) {
        tagConditions.push({
          'tagDetails._id': { $in: tagIds.map((id) => new Types.ObjectId(id)) },
        });
      }
      populatedMatchStage.$or = [
        ...(populatedMatchStage.$or || []),
        ...tagConditions,
      ];
    }

    // Brand filtering
    if (brandName || brandIds) {
      const brandConditions: any[] = [];
      if (brandName) {
        brandConditions.push({
          'brandDetails.name': { $regex: brandName, $options: 'i' },
        });
      }
      if (brandIds) {
        brandConditions.push({
          'brandDetails._id': {
            $in: brandIds.map((id) => new Types.ObjectId(id)),
          },
        });
      }
      populatedMatchStage.$or = [
        ...(populatedMatchStage.$or || []),
        ...brandConditions,
      ];
    }

    // Category filtering
    if (categoryName || categoryIds) {
      const categoryConditions: any[] = [];
      if (categoryName) {
        categoryConditions.push({
          'categoryDetails.name': { $regex: categoryName, $options: 'i' },
        });
      }
      if (categoryIds) {
        categoryConditions.push({
          'categoryDetails._id': {
            $in: categoryIds.map((id) => new Types.ObjectId(id)),
          },
        });
      }
      populatedMatchStage.$or = [
        ...(populatedMatchStage.$or || []),
        ...categoryConditions,
      ];
    }

    // Add populated match stage if there are conditions
    if (Object.keys(populatedMatchStage).length > 0) {
      pipeline.push({ $match: populatedMatchStage });
    }

    // Add sorting
    const sortStage: any = {};
    sortStage[sortBy] = order === QueryOrderEnum.ASC ? 1 : -1;
    pipeline.push({ $sort: sortStage });

    // Count total documents for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute the aggregation
    const [products, countResult] = await Promise.all([
      this.productModel.aggregate(pipeline),
      this.productModel.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

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

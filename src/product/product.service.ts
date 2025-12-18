import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Model, Types } from 'mongoose';
import { QueryProductDto } from './dto/query-product.dto';
import { JOB_NAMES, QueryOrderEnum } from 'src/utils/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SaveProductConsumerDto } from './save-product.consumer';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @InjectQueue(JOB_NAMES.product.PRODUCT_SAVE_PRODUCT)
    private saveProductQueue: Queue,
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
      .populate('store')
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

  async saveProductJob(data: SaveProductConsumerDto) {
    this.saveProductQueue.add(data.createProductDto.name, data, {
      jobId: data.createProductDto.name,
    });
  }

  async clearProducts() {
    await this.productModel.deleteMany({});
  }

  async fetchFeaturedProducts(limit: number = 20) {
    const products = await this.productModel.aggregate([
      { $match: { isFeatured: true } },
      {
        $lookup: {
          from: 'brands',
          localField: 'brand',
          foreignField: '_id',
          as: 'brandData',
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categories',
          foreignField: '_id',
          as: 'categoryData',
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'store',
          foreignField: '_id',
          as: 'companyData',
        },
      },
      {
        $lookup: {
          from: 'tags',
          localField: 'tags',
          foreignField: '_id',
          as: 'tagData',
        },
      },
      {
        $addFields: {
          store: {
            $arrayElemAt: ['$companyData', 0],
          },
          brand: {
            $arrayElemAt: ['$brandData', 0],
          },
          categories: '$categoryData',
          tags: '$tagData',
        },
      },
      {
        $project: {
          brandData: 0,
          categoryData: 0,
          companyData: 0,
          tagData: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
    ]);
    return products;
  }

  /**
   * Check if any featured products exist
   */
  async hasFeaturedProducts(): Promise<boolean> {
    const count = await this.productModel.countDocuments({ isFeatured: true });
    return count > 0;
  }

  /**
   * Remove featured status from all products
   */
  async unfeatureAllProducts(): Promise<void> {
    await this.productModel.updateMany(
      { isFeatured: true },
      { $set: { isFeatured: false } },
    );
  }

  /**
   * Select featured products based on criteria:
   * - Best discount percentage
   * - High ratings
   * - Recent products
   */
  async selectFeaturedProducts(limit: number = 20): Promise<void> {
    // First, unfeature all existing featured products
    await this.unfeatureAllProducts();

    // Select new featured products based on a scoring system
    const products = await this.productModel.aggregate([
      {
        $addFields: {
          // Calculate discount percentage
          discountPercentage: {
            $cond: {
              if: { $gt: ['$price', 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$price', '$discountPrice'] },
                      '$price',
                    ],
                  },
                  100,
                ],
              },
              else: 0,
            },
          },
          // Convert rating to number for sorting (handle string ratings)
          ratingNumber: {
            $cond: {
              if: { $ne: ['$rating', null] },
              then: {
                $toDouble: {
                  $ifNull: [
                    {
                      $arrayElemAt: [
                        {
                          $split: [{ $toString: '$rating' }, ' '],
                        },
                        0,
                      ],
                    },
                    '0',
                  ],
                },
              },
              else: 0,
            },
          },
          // Convert numberOfRatings to number
          numberOfRatingsNumber: {
            $cond: {
              if: { $ne: ['$numberOfRatings', null] },
              then: {
                $toDouble: {
                  $ifNull: [
                    {
                      $replaceAll: {
                        input: { $toString: '$numberOfRatings' },
                        find: ',',
                        replacement: '',
                      },
                    },
                    '0',
                  ],
                },
              },
              else: 0,
            },
          },
        },
      },
      {
        $addFields: {
          // Calculate a composite score
          // Weight: 50% discount, 30% rating, 20% recency (days since creation)
          score: {
            $add: [
              // Discount score (0-50 points)
              {
                $multiply: [
                  {
                    $min: [{ $divide: ['$discountPercentage', 2] }, 50],
                  },
                  1,
                ],
              },
              // Rating score (0-30 points) - normalized to 0-5 scale
              {
                $multiply: [
                  {
                    $min: [{ $multiply: ['$ratingNumber', 6] }, 30],
                  },
                  1,
                ],
              },
              // Recency score (0-20 points) - newer products get higher score
              {
                $multiply: [
                  {
                    $max: [
                      {
                        $subtract: [
                          20,
                          {
                            $divide: [
                              {
                                $subtract: [
                                  new Date(),
                                  { $ifNull: ['$createdAt', new Date()] },
                                ],
                              },
                              86400000, // milliseconds in a day
                            ],
                          },
                        ],
                      },
                      0,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
      // Sort by score descending, then by discount percentage
      { $sort: { score: -1, discountPercentage: -1 } },
      { $limit: limit },
      // Project only the _id field for updating
      { $project: { _id: 1 } },
    ]);

    // Update selected products to be featured
    if (products.length > 0) {
      const productIds = products.map((p) => p._id);
      await this.productModel.updateMany(
        { _id: { $in: productIds } },
        { $set: { isFeatured: true } },
      );
    }
  }
}

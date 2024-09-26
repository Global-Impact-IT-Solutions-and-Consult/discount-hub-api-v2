import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Model } from 'mongoose';
import { AiService } from 'src/services/ai/ai.service';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Brand, BrandDocument } from './schemas/brand.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private readonly aiService: AiService,
    @InjectModel('Category') private readonly categoryModel: Model<Category>,
    @InjectModel('Brand') private readonly brandModel: Model<Brand>,
  ) {}

  async create(createProduct: CreateProductDto): Promise<Product> {
    const product = new this.productModel(createProduct);
    return product.save();
  }

  async findAll(): Promise<Product[]> {
    return await this.productModel.find();
  }

  async findOne(id: string): Promise<Product> {
    return await this.productModel.findById(id);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    return await this.productModel.findByIdAndDelete(id);
  }

  // Category functions
  async findCategoryByName(name: string): Promise<CategoryDocument> {
    return await this.categoryModel.findOne({ name });
  }

  async createCategory(categoryData: {
    name: string;
  }): Promise<CategoryDocument> {
    const newCategory = new this.categoryModel(categoryData);
    return await newCategory.save();
  }

  // Brand functions
  async findBrandByName(name: string): Promise<BrandDocument> {
    return await this.brandModel.findOne({ name });
  }

  async createBrand(brandData: { name: string }): Promise<BrandDocument> {
    const newBrand = new this.brandModel(brandData);
    return await newBrand.save();
  }

  // AI categorization (example function, to be implemented)
  async categorize(body: any) {
    console.log('🚀 ~ categorize ~ body:', body);
    // Example usage of AI service for categorizing products
    // const product = await this.aiService.categorizeProducts({
    //   categories: body.categories,
    //   brands: body.brands,
    //   products: body.products,
    // });
    // return product;
  }
}

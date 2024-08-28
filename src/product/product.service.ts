import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Model } from 'mongoose';
import { AiService } from 'src/services/ai/ai.service';
// import { AiCategorizeDto } from './dto/ai-categorize.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private readonly aiService: AiService,
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

  // async categorize(aiCategorizeDto: AiCategorizeDto) {
  async categorize(body: any) {
    // const product = await this.aiService.categorizeWords();
    // const product = await this.aiService.categorizeWords(
    //   aiCategorizeDto.categories,
    //   aiCategorizeDto.words,
    // );
    const product = await this.aiService.categorizeProducts({
      categories: body.categories,
      brands: body.brands,
      products: body.products,
    });
    return product;
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AiService } from 'src/services/ai/ai.service';
// import { AiCategorizeDto } from './dto/ai-categorize.dto';

@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly aiService: AiService,
  ) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    const data = await this.productService.create(createProductDto);
    return {
      success: true,
      message: 'Product created successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.productService.findAll();
    return {
      success: true,
      message: 'Products fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.productService.findOne(id);
    return {
      success: true,
      message: 'Product fetched successfully',
      data,
    };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.productService.remove(id);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  // delete all
  @Delete()
  async removeAll() {
    await this.productService.removeAll();
    return {
      success: true,
      message: 'All products deleted successfully',
    };
  }

  @Post('categorize')
  // async categorize(@Body() aiCategorizeDto: AiCategorizeDto) {
  async categorize(@Body() body: any) {
    const categorizedProducts =
      // await this.productService.categorize(aiCategorizeDto);
      await this.productService.categorize(body);
    console.log(
      '🚀 ~ ProductController ~ categorize ~ categorizedProducts:',
      categorizedProducts,
    );
    return {
      success: true,
      message: 'Product categorized successfully',
      data: categorizedProducts,
    };
  }

  // Categories
  @Get('categories/product-count')
  async getCategoriesWithProductCount() {
    const data = await this.productService.getCategoriesWithProductCount();
    return {
      success: true,
      message: 'Categories with product counts fetched successfully',
      data,
    };
  }

  // delete all
  @Delete('categories')
  async removeAllCategories() {
    await this.productService.removeAllCategories();
    return {
      success: true,
      message: 'All categories deleted successfully',
    };
  }

  // New function to search products
  // To call this endpoint externally, use: GET /products/search?term=<searchTerm>
  @Get('search/v1')
  async search(@Query('term') searchTerm: string) {
    console.log('🚀 ~ search ~ searchTerm:', searchTerm);
    const data = await this.productService.searchProducts(searchTerm);
    return {
      success: true,
      message: 'Search results fetched successfully',
      data,
    };
  }
}

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
import { ApiTags } from '@nestjs/swagger';
// import { AiCategorizeDto } from './dto/ai-categorize.dto';

@ApiTags('Product')
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
  async categorize(@Body() body: any) {
    const categorizedProducts = await this.productService.categorize(body);
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

  // Get category by ID
  @Get('categories/one/:id') // Changed URL to distinguish from featured category
  async getCategoryById(@Param('id') id: string) {
    const data = await this.productService.findCategoryById(id);
    return {
      success: true,
      message: 'Category fetched successfully',
      data,
    };
  }

  @Get('categories/featured') // URL for fetching featured category
  async getFeaturedCategory() {
    const category = await this.productService.getFeaturedCategory();
    return {
      success: true,
      message: 'Featured category fetched successfully',
      data: category,
    };
  }

  // delete all categories
  @Delete('categories')
  async removeAllCategories() {
    await this.productService.removeAllCategories();
    return {
      success: true,
      message: 'All categories deleted successfully',
    };
  }

  // Tag functions

  @Post('tags')
  async createTag(@Body() tagData: { name: string }) {
    const newTag = await this.productService.createTag(tagData);
    return {
      success: true,
      message: 'Tag created successfully',
      data: newTag,
    };
  }

  @Get('tags/one')
  async findTagById(@Query('tagId') tagId: string) {
    const tag = await this.productService.findTagById(tagId);
    return {
      success: true,
      message: 'Tag fetched successfully',
      data: tag,
    };
  }

  @Get('tags/name/:name')
  async findTagByName(@Param('name') name: string) {
    const tag = await this.productService.findTagByName(name);
    return {
      success: true,
      message: 'Tag fetched successfully',
      data: tag,
    };
  }

  @Get('tags/all') // New function to get all tags
  async getAllTags() {
    const tags = await this.productService.getAllTags();
    return {
      success: true,
      message: 'All tags fetched successfully',
      data: tags,
    };
  }

  @Get('tags/by-tag') // New function to get all tags
  async findProductsByTagIdAndName(@Query('tagId') tagId: string) {
    const tags = await this.productService.findProductsByTagId(tagId);
    return {
      success: true,
      message: 'All tags fetched successfully',
      data: tags,
    };
  }

  @Get('tags/featured/all') // New function to get all tags
  async getAllFeaturedItems() {
    const tags = await this.productService.getAllFeaturedItems();
    return {
      success: true,
      message: 'All tags fetched successfully',
      data: tags,
    };
  }

  @Get('tags/featured/random') // New function to get all tags
  async getRandomFeaturedItemsByTag() {
    const tags = await this.productService.getRandomFeaturedItemsByTag();
    return {
      success: true,
      message: 'All tags fetched successfully',
      data: tags,
    };
  }

  // ***************** //
  // ******* BRANDS ********** //
  // ***************** //
  @Get('brands/one')
  async findBrandById(@Query('brandId') brandId: string) {
    const brand = await this.productService.findBrandById(brandId);
    return {
      success: true,
      message: 'Brand fetched successfully',
      data: brand,
    };
  }

  @Get('brands/all') // New function to get all brands
  async getAllBrands() {
    const brands = await this.productService.getAllBrands();
    return {
      success: true,
      message: 'All brands fetched successfully',
      data: brands,
    };
  }

  @Get('brands/products-by-brand') // New function to get all brands
  async findProductsByBrandId(@Query('brandId') brandId: string) {
    const brands = await this.productService.findProductsByBrandId(brandId);
    return {
      success: true,
      message: 'products for brand fetched successfully',
      data: brands,
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

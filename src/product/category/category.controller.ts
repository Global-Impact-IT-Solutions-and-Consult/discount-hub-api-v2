import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDTO } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-categories.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Product | Category')
@Controller('product/category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(@Body() createCategoryDTO: CreateCategoryDTO) {
    const data = await this.categoryService.create(createCategoryDTO);
    return {
      success: true,
      message: 'Category created successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.categoryService.findAll();
    return {
      success: true,
      message: 'Categories fetched successfully',
      data,
    };
  }

  @Get('search')
  async queryCategories(@Query() query: QueryCategoryDto) {
    const data = await this.categoryService.queryCategories(query);
    return {
      success: true,
      message: 'Categories fetched successfully',
      data,
    };
  }

  @Get('featured')
  async getFeaturedCategories() {
    const data = await this.categoryService.fetchFeaturedcategories();
    return {
      success: true,
      message: 'Featured categories fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.categoryService.findOneById(id);
    return {
      success: true,
      message: 'Category fetched successfully',
      data,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const data = await this.categoryService.update(id, updateCategoryDto);
    return {
      success: true,
      message: 'Category updated successfully',
      data,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.categoryService.delete(id);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }
}

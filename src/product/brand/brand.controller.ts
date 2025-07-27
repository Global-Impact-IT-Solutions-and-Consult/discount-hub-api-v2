import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('Product | Brand')
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  async create(@Body() createBrandDto: CreateBrandDto) {
    const data = await this.brandService.create(createBrandDto);
    return {
      success: true,
      message: 'Brand created successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.brandService.findAll();
    return {
      success: true,
      message: 'Brands fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.brandService.findOne(id);
    return {
      success: true,
      message: 'Brand fetched successfully',
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    const data = await this.brandService.update(id, updateBrandDto);
    return {
      success: true,
      message: 'Brand updated successfully',
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.brandService.remove(id);
    return {
      success: true,
      message: 'Brand deleted successfully',
    };
  }
}

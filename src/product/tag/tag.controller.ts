import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Product|Tag')
@Controller('product/tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  async create(@Body() tagData: { name: string }) {
    const data = await this.tagService.create(tagData.name);
    return {
      success: true,
      message: 'Tag created successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.tagService.findAll();
    return {
      success: true,
      message: 'Tags fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.tagService.findOne(id);
    return {
      success: true,
      message: 'Tag fetched successfully',
      data,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() tagData: { name: string }) {
    const data = await this.tagService.update(id, tagData.name);
    return {
      success: true,
      message: 'Tag updated successfully',
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tagService.remove(id);
    return {
      success: true,
      message: 'Tag deleted successfully',
    };
  }
}

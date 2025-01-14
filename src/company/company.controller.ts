import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Body() createCompanyDto: CreateCompanyDto,
    @UploadedFile() logo: Express.Multer.File,
  ) {
    const data = await this.companyService.create({
      ...createCompanyDto,
      logo,
    });
    return {
      success: true,
      message: 'Company Created Successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.companyService.findAll();
    return {
      success: true,
      message: 'Companies fetched Successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.companyService.findOne(id);
    return {
      success: true,
      message: 'Company fetched Successfully',
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    const data = await this.companyService.update(id, updateCompanyDto);
    return {
      success: true,
      message: 'Company updated Successfully',
      data,
    };
  }

  @Patch(':id/logo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  async updateLogo(
    @Param('id') id: string,
    @UploadedFile() logo: Express.Multer.File,
  ) {
    const data = await this.companyService.updateLogo(id, logo);
    return {
      success: true,
      message: 'Company updated Successfully',
      data,
    };
  }

  @Get('/find-by-key/:key')
  async findByKey(@Param('key') apiKey: string) {
    const data = await this.companyService.findOneByApiKey(apiKey);
    return {
      success: true,
      message: 'Company fetched successfully',
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // await this.companyService.remove(id);
    await this.companyService.deleteById(id);
    return {
      success: true,
      message: 'Company deleted Successfully',
    };
  }
}

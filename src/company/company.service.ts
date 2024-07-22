import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UserService } from 'src/user/user.service';
import { InjectModel } from '@nestjs/mongoose';
import { Company } from './schemas/company.schema';
import { Model } from 'mongoose';
import { CloudinaryService } from 'src/services/cloudinary/cloudinary.service';
import { CloudinaryFoldersEnum } from 'src/utils/constants';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<Company>,
    private userService: UserService,
    private cloudinaryService: CloudinaryService,
  ) {}
  async create(
    createCompanyDto: CreateCompanyDto & { logo: Express.Multer.File },
  ) {
    const user = await this.userService.findOne(createCompanyDto.adminId);
    const logoUrl = await this.cloudinaryService.upload(
      createCompanyDto.logo,
      CloudinaryFoldersEnum.COMPANY_LOGO,
    );
    const company = this.companyModel.create({
      admin: user.id,
      logo: logoUrl,
      name: createCompanyDto.name,
      urls: createCompanyDto.urls,
      website: createCompanyDto.website,
    });
    return company;
  }

  async findAll() {
    const companies = await this.companyModel.find();
    return companies;
  }

  async findOne(id: string) {
    const company = await this.companyModel.findById(id);
    if (!company) {
      throw new NotFoundException(`Company not found for this ${id}`);
    }
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findOne(id);
    for (const key in updateCompanyDto) {
      company[key] = updateCompanyDto[key];
    }
    const updatedCompany = await company.save();
    return updatedCompany;
  }

  async updateLogo(id: string, logo: Express.Multer.File) {
    const company = await this.findOne(id);
    const logoUrl = await this.cloudinaryService.upload(
      logo,
      CloudinaryFoldersEnum.COMPANY_LOGO,
    );
    company.logo = logoUrl;
    const updatedCompany = await company.save();
    return updatedCompany;
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }
}

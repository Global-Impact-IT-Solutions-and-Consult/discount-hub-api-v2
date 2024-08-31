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
    createCompanyDto: CreateCompanyDto & { logo?: Express.Multer.File },
  ) {
    let logoUrl = createCompanyDto.logoUrl;
    const user = await this.userService.findOne(createCompanyDto.adminId);
    if (!logoUrl) {
      logoUrl = await this.cloudinaryService.upload(
        createCompanyDto.logo,
        CloudinaryFoldersEnum.COMPANY_LOGO,
      );
    }

    const company = this.companyModel.create({
      admin: user.id,
      logo: logoUrl,
      name: createCompanyDto.name,
      slug: createCompanyDto.slug,
      urls: createCompanyDto.urls,
      website: createCompanyDto.website,
    });
    return company;
  }

  // async create(
  //   createCompanyDto: CreateCompanyDto & { logo?: Express.Multer.File },
  // ) {
  //   try {
  //     // Check if a company with the same slug already exists
  //     const existingCompany = await this.companyModel
  //       .findOne({ slug: createCompanyDto.slug })
  //       .exec();

  //     if (existingCompany) {
  //       // If company exists, return the existing company to avoid duplication
  //       return existingCompany;
  //     }

  //     // Fetch the user based on adminId provided in DTO
  //     const user = await this.userService.findOne(createCompanyDto.adminId);
  //     if (!user) {
  //       throw new Error('Admin user not found'); // Handle the case where the admin user is not found
  //     }

  //     // Upload logo to Cloudinary if a new logo is provided and logoUrl is not already set
  //     let logoUrl = createCompanyDto.logoUrl;
  //     if (!logoUrl && createCompanyDto.logo) {
  //       logoUrl = await this.cloudinaryService.upload(
  //         createCompanyDto.logo,
  //         CloudinaryFoldersEnum.COMPANY_LOGO,
  //       );
  //     }

  //     // Create new company object
  //     const newCompany = new this.companyModel({
  //       admin: user.id,
  //       logo: logoUrl,
  //       name: createCompanyDto.name,
  //       slug: createCompanyDto.slug,
  //       urls: createCompanyDto.urls,
  //       website: createCompanyDto.website,
  //     });

  //     // Save new company to the database
  //     const savedCompany = await newCompany.save();
  //     return savedCompany;
  //   } catch (error) {
  //     // Handle duplicate key error (E11000)
  //     if (error.code === 11000 && error.keyPattern?.slug) {
  //       const existingCompany = await this.companyModel
  //         .findOne({ slug: createCompanyDto.slug })
  //         .exec();
  //       if (existingCompany) {
  //         return existingCompany; // Return existing company on duplicate slug error
  //       }
  //     }

  //     // Log other errors and provide meaningful feedback
  //     console.error('Error creating company:', error);
  //     throw new Error('Failed to create company. Please try again later.');
  //   }
  // }

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

  async findOneBySlug(slug: string) {
    const company = await this.companyModel.findOne({ slug: slug });
    if (!company) {
      throw new NotFoundException(`Company not found for this slug: ${slug}`);
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

  async remove(id: string) {
    const company = await this.companyModel.findByIdAndUpdate(id, {
      isDeleted: true,
    });
    if (!company) {
      throw new NotFoundException(`No Company found for this id: ${id}`);
    }
    return true;
  }
}

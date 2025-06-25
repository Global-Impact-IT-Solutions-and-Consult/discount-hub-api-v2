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

    // Generate voucher code
    const alphabets = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'q',
      'r',
      's',
      't',
      'u',
      'v',
      'w',
      'x',
      'y',
      'z',
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z',
    ];

    const rand = Math.floor(Math.random() * 48);
    const rand2 = Math.floor(Math.random() * 48);
    const rand3 = Math.floor(Math.random() * 48);
    const rand4 = Math.floor(Math.random() * 48);

    let apiKey = '';
    apiKey = `${alphabets[rand]}${rand}${alphabets[rand3]}${alphabets[rand2]}${rand4}`;

    const findKey = await this.companyModel.findOne({ apiKey: apiKey });
    if (findKey) {
      const rand = Math.floor(Math.random() * 48);
      const rand2 = Math.floor(Math.random() * 48);
      const rand3 = Math.floor(Math.random() * 48);
      const rand4 = Math.floor(Math.random() * 48);

      apiKey = `${alphabets[rand]}${rand}${alphabets[rand3]}${alphabets[rand2]}${rand4}`;
    }

    // badge color feature
    const colors = [
      'slate',
      'gray',
      'zinc',
      'neutral',
      'stone',
      'red',
      'orange',
      'amber',
      'yellow',
      'lime',
      'green',
      'emerald',
      'teal',
      'cyan',
      'sky',
      'blue',
      'indigo',
      'violet',
      'purple',
      'fuchsia',
      'pink',
      'rose',
    ];

    const randColor = Math.floor(Math.random() * colors.length);

    const company = this.companyModel.create({
      admin: user.id,
      logo: logoUrl,
      name: createCompanyDto.name,
      slug: createCompanyDto.slug,
      urls: createCompanyDto.urls,
      website: createCompanyDto.website,
      special_links: createCompanyDto.special_links,
      apiKey: apiKey,
      badgeColor: colors[randColor],
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

  async findOneBySlug(slug: string) {
    const company = await this.companyModel.findOne({ slug: slug });
    if (!company) {
      throw new NotFoundException(`Company not found for this slug: ${slug}`);
    }
    return company;
  }

  async findOneByApiKey(apiKey: string) {
    const company = await this.companyModel.findOne({ apiKey: apiKey });
    console.log('🚀 ~ CompanyService ~ findOneByApiKey ~ company:', company);
    if (!company) {
      throw new NotFoundException(
        `Company not found for this apiKey: ${apiKey}`,
      );
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

  // New function to delete a company by Id
  async deleteById(id: string) {
    const company = await this.companyModel.findByIdAndDelete(id);
    if (!company) {
      throw new NotFoundException(`No Company found for this id: ${id}.`);
    }
    return true;
  }

  // Delete all the products
  async removeAll(): Promise<{ message: string }> {
    console.log('Deleting all companies.');
    await this.companyModel.deleteMany({}).exec();

    return {
      message: 'All company categories have been deleted',
    };
  }
}

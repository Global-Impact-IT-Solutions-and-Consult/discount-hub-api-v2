import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  // UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags } from '@nestjs/swagger';
// import { AuthGuard } from '@nestjs/passport';
// import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('user')
// @UseGuards(AuthGuard('jwt'))
@ApiTags('User')
// @ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const data = await this.userService.create(createUserDto);
    return {
      success: true,
      message: 'User created successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.userService.findAll();
    return {
      success: true,
      message: 'Users fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.userService.findOne(id);
    return {
      success: true,
      message: 'User fetched successfully',
      data,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const data = await this.userService.update(id, updateUserDto);
    return {
      success: true,
      message: 'User updated successfully',
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  // ************* //
  // Newsletter stuff
  // ************* //
  @Post('newsletter')
  async createNewsletter(@Body() newsletterData: { email: string }) {
    const data = await this.userService.createNewsletter(newsletterData);
    return {
      success: true,
      message: 'Newsletter created successfully',
      data,
    };
  }

  @Get('newsletter/all')
  async getAllNewsletters() {
    const data = await this.userService.getAllNewsletters();
    return {
      success: true,
      message: 'Newsletters fetched successfully',
      data,
    };
  }

  @Delete('newsletter/one/:id')
  async deleteNewsletter(@Param('id') id: string) {
    const data = await this.userService.deleteNewsletter(id);
    return {
      success: true,
      message: 'Newsletter deleted successfully',
      data,
    };
  }

  @Delete('newsletter/all')
  async deleteAllNewsletters() {
    await this.userService.deleteAllNewsletters();
    return {
      success: true,
      message: 'All newsletters deleted successfully',
    };
  }
}

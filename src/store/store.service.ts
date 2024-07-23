import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Store } from './interfaces/store.interface';

@Injectable()
export class StoreService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel('Store') private readonly storeModel: Model<Store>,
  ) {}

  async create(createStoreDto: CreateStoreDto): Promise<Store> {
    const createdStore = new this.storeModel(createStoreDto);
    return createdStore.save();
  }

  async findAll(): Promise<Store> {
    let stores = await this.cacheManager.get('stores');
    if (!stores) {
      stores = this.storeModel.find().exec();
      this.cacheManager.set('stores', stores);
      return stores as any;
    }
    return stores as any;
  }

  async findOne(id: string): Promise<Store> {
    return this.storeModel.findById(id);
  }

  update(id: number, body: UpdateStoreDto) {
    return `This action updates a #${id} user ${body}`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}

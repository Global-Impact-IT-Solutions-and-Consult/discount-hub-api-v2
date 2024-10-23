import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Model } from 'mongoose';
import { AiService } from 'src/services/ai/ai.service';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Brand, BrandDocument } from './schemas/brand.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private readonly aiService: AiService,
    @InjectModel('Category') private readonly categoryModel: Model<Category>,
    @InjectModel('Brand') private readonly brandModel: Model<Brand>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache, // Corrected import
  ) {}

  async create(createProduct: CreateProductDto): Promise<Product> {
    const product = new this.productModel(createProduct);
    await product.save();

    // Invalidate cache after creating a new product
    await this.cacheManager.del('products');

    return product;
  }

  async findAll(): Promise<Product[]> {
    const cachedProducts = await this.cacheManager.get<Product[]>('products');
    if (cachedProducts) {
      console.log('Fetching products from cache');
      return cachedProducts;
    }

    console.log('Fetching products from database');
    const products = await this.productModel.find().exec();

    // Corrected: Passing ttl as a number, not an object
    await this.cacheManager.set('products', products, 3600); // TTL is 3600 seconds (1 hour)
    return products;
  }

  // async findByCategory(id: any): Promise<Product[]> {
  //   const cachedProducts = await this.cacheManager.get<Product[]>('products');
  //   if (cachedProducts) {
  //     console.log('Fetching products from cache');
  //     return cachedProducts;
  //   }

  //   console.log('Fetching products from database');
  //   const products = await this.productModel.find({

  //   }).exec();

  //   // Corrected: Passing ttl as a number, not an object
  //   await this.cacheManager.set('products', products, 3600); // TTL is 3600 seconds (1 hour)
  //   return products;
  // }

  async findOne(id: string): Promise<Product> {
    const cacheKey = `product_${id}`;
    const cachedProduct = await this.cacheManager.get<Product>(cacheKey);
    if (cachedProduct) {
      console.log(`Fetching product ${id} from cache`);
      return cachedProduct;
    }

    console.log(`Fetching product ${id} from database`);
    const product = await this.productModel.findById(id).exec();

    if (product) {
      // Corrected: Passing ttl as a number, not an object
      await this.cacheManager.set(cacheKey, product, 3600); // TTL is 3600 seconds (1 hour)
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();

    await this.cacheManager.del(`product_${id}`);
    await this.cacheManager.del('products');

    return updatedProduct;
  }

  async remove(id: string) {
    await this.productModel.findByIdAndDelete(id).exec();

    await this.cacheManager.del(`product_${id}`);
    await this.cacheManager.del('products');
  }

  // Delete all the products
  async removeAll(): Promise<{ message: string }> {
    await this.productModel.deleteMany({}).exec();

    // Clear related caches
    await this.cacheManager.del('products');

    return { message: 'All products have been deleted' };
  }

  // Category functions
  async findCategoryByName(name: string): Promise<CategoryDocument> {
    const cacheKey = `category_${name.toLowerCase()}`;

    // Check if the category is in the cache
    let category = await this.cacheManager.get<CategoryDocument>(cacheKey);

    if (category) {
      console.log(`Category ${name} found in cache`);
      return category;
    }

    console.log(`Fetching category ${name} from database`);
    category = await this.categoryModel.findOne({ name });

    // Cache the result if the category is found
    if (category) {
      await this.cacheManager.set(cacheKey, category, 3600); // Cache for 1 hour
    }

    return category;
  }

  async createCategory(categoryData: {
    name: string;
  }): Promise<CategoryDocument> {
    const newCategory = new this.categoryModel(categoryData);
    return await newCategory.save();
  }

  async getCategoriesWithProductCount() {
    const categories = await this.categoryModel.find();
    const products = await this.productModel.find();

    const categoriesWithCounts = [];
    // const productsInCategory = [];

    categories.forEach((categoryItem: any) => {
      const categoryVar = {
        category: categoryItem,
        productCount: 0,
        productsInCategory: [],
      };

      products.forEach((productItem: any) => {
        // Ensure IDs are compared as strings
        if (productItem.categories.includes(categoryItem._id.toString())) {
          categoryVar.productCount++;
          categoryVar.productsInCategory.push(productItem);
        }
      });

      categoriesWithCounts.push(categoryVar);
    });

    return categoriesWithCounts;
  }

  // Brand functions
  async findBrandByName(name: string): Promise<BrandDocument> {
    const cacheKey = `brand_${name.toLowerCase()}`;

    // Check if the brand is in the cache
    let brand = await this.cacheManager.get<BrandDocument>(cacheKey);

    if (brand) {
      console.log(`Brand ${name} found in cache`);
      return brand;
    }

    console.log(`Fetching brand ${name} from database`);
    brand = await this.brandModel.findOne({ name });

    // Cache the result if the brand is found
    if (brand) {
      await this.cacheManager.set(cacheKey, brand, 3600); // Cache for 1 hour
    }

    return brand;
  }

  async createBrand(brandData: { name: string }): Promise<BrandDocument> {
    const newBrand = new this.brandModel(brandData);
    return await newBrand.save();
  }

  // AI categorization (example function, to be implemented)
  async categorize(body: any) {
    console.log('🚀 ~ categorize ~ body:', body);
    // Example usage of AI service for categorizing products
    // const product = await this.aiService.categorizeProducts({
    //   categories: body.categories,
    //   brands: body.brands,
    //   products: body.products,
    // });
    // return product;
  }
}

// import { Injectable } from '@nestjs/common';
// import { CreateProductDto } from './dto/create-product.dto';
// import { UpdateProductDto } from './dto/update-product.dto';
// import { InjectModel } from '@nestjs/mongoose';
// import { Product } from './schemas/product.schema';
// import { Model } from 'mongoose';
// import { AiService } from 'src/services/ai/ai.service';
// import { Category, CategoryDocument } from './schemas/category.schema';
// import { Brand, BrandDocument } from './schemas/brand.schema';

// @Injectable()
// export class ProductService {
//   constructor(
//     @InjectModel('Product') private readonly productModel: Model<Product>,
//     private readonly aiService: AiService,
//     @InjectModel('Category') private readonly categoryModel: Model<Category>,
//     @InjectModel('Brand') private readonly brandModel: Model<Brand>,
//   ) {}

//   async create(createProduct: CreateProductDto): Promise<Product> {
//     const product = new this.productModel(createProduct);
//     return product.save();
//   }

//   async findAll(): Promise<Product[]> {
//     return await this.productModel.find();
//   }

//   async findOne(id: string): Promise<Product> {
//     return await this.productModel.findById(id);
//   }

//   async update(
//     id: string,
//     updateProductDto: UpdateProductDto,
//   ): Promise<Product> {
//     return this.productModel
//       .findByIdAndUpdate(id, updateProductDto, { new: true })
//       .exec();
//   }

//   async remove(id: string) {
//     return await this.productModel.findByIdAndDelete(id);
//   }

//   // Category functions
//   async findCategoryByName(name: string): Promise<CategoryDocument> {
//     return await this.categoryModel.findOne({ name });
//   }

//   async createCategory(categoryData: {
//     name: string;
//   }): Promise<CategoryDocument> {
//     const newCategory = new this.categoryModel(categoryData);
//     return await newCategory.save();
//   }

//   // Brand functions
//   async findBrandByName(name: string): Promise<BrandDocument> {
//     return await this.brandModel.findOne({ name });
//   }

//   async createBrand(brandData: { name: string }): Promise<BrandDocument> {
//     const newBrand = new this.brandModel(brandData);
//     return await newBrand.save();
//   }

//   // AI categorization (example function, to be implemented)
//   async categorize(body: any) {
//     console.log('🚀 ~ categorize ~ body:', body);
//     // Example usage of AI service for categorizing products
//     // const product = await this.aiService.categorizeProducts({
//     //   categories: body.categories,
//     //   brands: body.brands,
//     //   products: body.products,
//     // });
//     // return product;
//   }
// }

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createProduct: CreateProductDto): Promise<Product> {
    const product = new this.productModel(createProduct);
    await product.save();

    // Invalidate cache after creating a new product
    await this.cacheManager.del('products');

    return product;
  }

  async findAll(): Promise<ProductDocument[]> {
    const cachedProducts =
      await this.cacheManager.get<ProductDocument[]>('products');
    if (cachedProducts) {
      console.log('Fetching products from cache');
      return cachedProducts;
    }

    console.log('Fetching products from database');
    const products = await this.productModel
      .find()
      .populate('categories')
      .populate('tags')
      .populate('tagAtrributes')
      .exec();

    await this.cacheManager.set('products', products, 3600); // TTL is 3600 seconds (1 hour)
    return products;
  }

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
    await this.categoryModel.deleteMany({}).exec();

    // Clear related caches
    await this.cacheManager.del('products');
    await this.cacheManager.del('categories');

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

  async findAllCategories(): Promise<CategoryDocument[]> {
    const cachedCategories =
      await this.cacheManager.get<CategoryDocument[]>('categories');
    if (cachedCategories) {
      console.log('Fetching categories from cache');
      return cachedCategories;
    }

    console.log('Fetching categories from database');
    const categories = await this.categoryModel.find().exec();

    await this.cacheManager.set('categories', categories, 3600); // Cache for 1 hour
    return categories;
  }

  async findCategoryById(id: string): Promise<CategoryDocument> {
    const cacheKey = `category_id_${id}`;
    const cachedCategory =
      await this.cacheManager.get<CategoryDocument>(cacheKey);
    if (cachedCategory) {
      console.log(`Fetching category ${id} from cache`);
      return cachedCategory;
    }

    console.log(`Fetching category ${id} from database`);
    const category = await this.categoryModel.findById(id).exec();

    if (category) {
      await this.cacheManager.set(cacheKey, category, 3600); // Cache for 1 hour
    }

    return category;
  }

  async getCategoriesWithProductCount() {
    const categories = await this.categoryModel.find();
    const products = await this.productModel.find();

    const categoriesWithCounts = [];

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

    await this.cacheManager.set('categories', categoriesWithCounts, 3600); // TTL is 3600 seconds (1 hour)

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

  // Delete all categories
  async removeAllCategories(): Promise<{ message: string }> {
    try {
      // Find all category IDs before deleting
      const categories = await this.categoryModel.find({}, '_id');
      const categoryIds = categories.map((category) => category._id);

      // Remove references to categories in related products
      await this.productModel.updateMany(
        { categories: { $in: categoryIds } },
        { $pull: { categories: { $in: categoryIds } } },
      );

      // Delete all categories
      const result = await this.categoryModel.deleteMany({}).exec();

      console.log(
        `${result.deletedCount} categories deleted from the database`,
      );

      // Optionally clear related caches
      await this.cacheManager.del('categories');

      return { message: 'All categories have been deleted' };
    } catch (error) {
      console.error('Error deleting categories:', error);
      throw new Error('Failed to delete categories. Please try again.');
    }
  }

  // Search for products based on a search term
  async searchProducts(searchTerm: string): Promise<ProductDocument[]> {
    const cacheKey = `search_${searchTerm.toLowerCase()}`;
    const cachedResults =
      await this.cacheManager.get<ProductDocument[]>(cacheKey);

    if (cachedResults) {
      console.log(`Fetching search results for "${searchTerm}" from cache`);
      return cachedResults;
    }

    console.log(`Searching for products matching "${searchTerm}" in database`);
    const regex = new RegExp(searchTerm, 'i'); // Case-insensitive search
    const products = await this.productModel
      .find({
        $or: [
          { name: { $regex: regex } },
          { description: { $regex: regex } },
          { store: { $regex: regex } },
          { tags: { $regex: regex } },
          { categories: { $regex: regex } },
        ],
      })
      .populate('categories')
      .populate('tags')
      .populate('tagAtrributes')
      .exec();

    await this.cacheManager.set(cacheKey, products, 3600); // Cache for 1 hour
    return products;
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

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
import { Tag, TagDocument } from './schemas/tag.schema';
import { FeaturedItem } from './schemas/featuredItems.schema';
import { FeaturedCategory } from './schemas/featuredCategory.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    private readonly aiService: AiService,
    @InjectModel('Category') private readonly categoryModel: Model<Category>,
    @InjectModel('Brand') private readonly brandModel: Model<Brand>,
    @InjectModel('Tag') private readonly tagModel: Model<Tag>,
    @InjectModel('FeaturedItem')
    private readonly featuredItemModel: Model<FeaturedItem>,
    @InjectModel('FeaturedCategory')
    private readonly featuredCategoryModel: Model<FeaturedCategory>,
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
      // .populate('tag')
      // .populate('tags')
      // .populate('tagAtrributes')
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
    await this.tagModel.deleteMany({}).exec();
    await this.brandModel.deleteMany({}).exec();
    await this.featuredItemModel.deleteMany({}).exec();
    await this.featuredCategoryModel.deleteMany({}).exec();

    // Clear related caches
    await this.cacheManager.del('products');
    await this.cacheManager.del('categories');
    await this.cacheManager.del('all_tags');
    await this.cacheManager.del('all_brands');

    return {
      message:
        'All products, categories, tags, brands, featured items and featured categories have been deleted',
    };
  }

  // ************* //
  // Category functions
  // ************* //
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

  async findProductsByCategoryId(
    categoryId: string,
  ): Promise<ProductDocument[]> {
    const cacheKey = `products_by_category_${categoryId}`;
    const cachedProducts =
      await this.cacheManager.get<ProductDocument[]>(cacheKey);

    if (cachedProducts) {
      console.log(`Fetching products for category from cache`);
      return cachedProducts;
    }

    console.log(`Fetching products for category from database`);
    const products = await this.productModel
      .find({
        categories: categoryId, // Check if categoryId is included in the categories array
      })
      .exec();

    // Cache only if products exist
    if (products.length > 0) {
      await this.cacheManager.set(cacheKey, products, 3600); // Cache for 1 hour
    }

    return products;
  }

  async getRandomFeaturedCategory(): Promise<FeaturedCategory> {
    const categories = await this.findAllCategories();
    if (categories.length === 0) {
      console.log('No categories available');
      return null; // Return null if no categories are available
    }

    const randomIndex = Math.floor(Math.random() * categories.length);
    const randomCategory = categories[randomIndex];

    // Log the name of the random category
    console.log(`Selected random category: ${randomCategory.name}`);

    // delete all featured category
    console.log('Deleting featured category');
    await this.featuredCategoryModel.deleteMany({}).exec();

    const fetchedItems = await this.findProductsByCategoryId(
      randomCategory._id.toString(),
    );

    // Ensure fetchedItems is an array before creating newFeaturedCategory
    const newFeaturedCategory = new this.featuredCategoryModel({
      categoryId: randomCategory._id,
      categoryName: randomCategory.name,
      items: fetchedItems,
    });
    console.log('newFeaturedCategory: ', newFeaturedCategory);
    await newFeaturedCategory.save(); // Return the saved FeaturedItem
  }

  async getFeaturedCategory(): Promise<FeaturedCategory[]> {
    console.log('Fetching featured category from the database');
    const featuredCatwegory = await this.featuredCategoryModel.find().exec();
    return featuredCatwegory;
  }

  // ************* //
  // Brand functions
  // ************* //
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

  async findBrandById(id: string): Promise<BrandDocument> {
    const cacheKey = `brand_id_${id}`;
    const cachedBrand = await this.cacheManager.get<BrandDocument>(cacheKey);
    if (cachedBrand) {
      console.log(`Fetching brand ${id} from cache`);
      return cachedBrand;
    }

    console.log(`Fetching brand ${id} from database`);
    const brand = await this.brandModel.findById(id).exec();

    if (brand) {
      await this.cacheManager.set(cacheKey, brand, 3600); // Cache for 1 hour
    }

    return brand;
  }

  async getAllBrands(): Promise<BrandDocument[]> {
    const cacheKey = 'all_brands';
    const cachedBrands = await this.cacheManager.get<BrandDocument[]>(cacheKey);
    if (cachedBrands) {
      console.log(`Fetching all brands from cache`);
      return cachedBrands;
    }

    console.log(`Fetching all brands from database`);
    const brands = await this.brandModel.find().exec();

    if (brands) {
      await this.cacheManager.set(cacheKey, brands, 3600); // Cache for 1 hour
    }

    return brands;
  }

  async findProductsByBrandId(brandId: string) {
    const cacheKey = `products_by_brand_${brandId}`;
    const cachedProducts =
      await this.cacheManager.get<ProductDocument[]>(cacheKey);

    if (cachedProducts) {
      console.log(`Fetching products for brand from cache`);
      return cachedProducts;
    }

    console.log(`Fetching products for brand from database`);

    const products = await this.productModel
      .find({
        brand: brandId, // Convert to ObjectId
      })
      .exec();

    // Cache only if products exist
    if (products.length > 0) {
      await this.cacheManager.set(cacheKey, products, 3600); // Cache for 1 hour
    }

    const brand = await this.findBrandById(brandId);

    return {
      brand: brand.name,
      products,
    };
  }

  // ************* //
  // Tag functions
  // ************* //
  async findTagById(id: string): Promise<TagDocument> {
    const cacheKey = `tag_id_${id}`;
    const cachedTag = await this.cacheManager.get<TagDocument>(cacheKey);
    if (cachedTag) {
      console.log(`Fetching tag ${id} from cache.`);
      return cachedTag;
    }

    console.log(`Fetching tag ${id} from database`);
    const tag = await this.tagModel.findById(id).exec();

    if (tag) {
      await this.cacheManager.set(cacheKey, tag, 3600); // Cache for 1 hour
    }

    return tag;
  }

  async findTagByName(name: string): Promise<TagDocument> {
    const cacheKey = `tag_${name.toLowerCase()}`;
    let tag = await this.cacheManager.get<TagDocument>(cacheKey);

    if (tag) {
      console.log(`Tag ${name} found in cache`);
      return tag;
    }

    console.log(`Fetching tag ${name} from database`);
    tag = await this.tagModel.findOne({ name });

    if (tag) {
      await this.cacheManager.set(cacheKey, tag, 3600); // Cache for 1 hour
    }

    return tag;
  }

  async createTag(tagData: { name: string }): Promise<TagDocument> {
    const newTag = new this.tagModel(tagData);
    return await newTag.save();
  }

  async getAllTags(): Promise<TagDocument[]> {
    const cacheKey = 'all_tags';
    const cachedTags = await this.cacheManager.get<TagDocument[]>(cacheKey);
    if (cachedTags) {
      console.log(`Fetching all tags from cache`);
      return cachedTags;
    }

    console.log(`Fetching all tags from database`);
    const tags = await this.tagModel.find().exec();

    if (tags) {
      await this.cacheManager.set(cacheKey, tags, 3600); // Cache for 1 hour
    }

    return tags;
  }

  // New function to fetch all featured items
  async getAllFeaturedItems(): Promise<FeaturedItem[]> {
    console.log('Fetching all featured items from the database');
    const featuredItems = await this.featuredItemModel.find().exec();
    return featuredItems;
  }

  // New function to select a random tag and find all products with that tag
  async getRandomFeaturedItemsByTag(): Promise<FeaturedItem> {
    const tags = await this.getAllTags();
    if (tags.length === 0) {
      console.log('No tags available');
      return null; // Return null if no tags are available
    }

    const randomIndex = Math.floor(Math.random() * tags.length);
    const randomTag = tags[randomIndex];

    // Log the name of the random tag
    console.log(`Selected random tag: ${randomTag.name}`);

    // delete all featured items
    console.log('Deleting featured items');
    await this.featuredItemModel.deleteMany({}).exec();

    const fetchedItems = await this.findProductsByTagId(
      randomTag._id.toString(),
    );

    // Ensure fetchedItems is an array before creating newFeaturedItems
    const newFeaturedItems = new this.featuredItemModel({
      tagId: randomTag._id,
      tagName: randomTag.name, // Set the name of the featured item to the random tag's name
      items: fetchedItems,
    });
    await newFeaturedItems.save(); // Return the saved FeaturedItem
  }

  // New function to find all products by tag id
  async findProductsByTagId(tagId: string): Promise<ProductDocument[]> {
    const cacheKey = `products_by_tag_${tagId}`;
    const cachedProducts =
      await this.cacheManager.get<ProductDocument[]>(cacheKey);

    if (cachedProducts) {
      console.log(`Fetching products for tag from cache`);
      return cachedProducts;
    }

    console.log(`Fetching products for tag from database`);

    const products = await this.productModel
      .find({
        tag: tagId, // Convert to ObjectId
      })
      .exec();

    // Cache only if products exist
    if (products.length > 0) {
      await this.cacheManager.set(cacheKey, products, 3600); // Cache for 1 hour
    }

    return products;
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

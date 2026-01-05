/* eslint-disable */
// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ProductService } from 'src/product/product.service';

@Injectable()
export class QueryTool {
  constructor(private productService: ProductService) {}

  // Tool to query products with filters
  queryProductsTool = tool(
    async (data) => {
      const {
        name,
        brandName,
        brandIds,
        categoryName,
        categoryIds,
        minPrice,
        maxPrice,
        minDiscountPrice,
        maxDiscountPrice,
        minRating,
        sortBy,
        order,
        limit,
      } = data;

      try {
        // Build query parameters
        const queryParams: any = {
          limit: limit || 10,
          page: 1,
        };

        if (name) queryParams.name = name;
        if (brandName) queryParams.brandName = brandName;
        if (brandIds && brandIds.length > 0) queryParams.brandIds = brandIds;
        if (categoryName) queryParams.categoryName = categoryName;
        if (categoryIds && categoryIds.length > 0)
          queryParams.categoryIds = categoryIds;
        if (minPrice !== undefined) queryParams.minPrice = minPrice;
        if (maxPrice !== undefined) queryParams.maxPrice = maxPrice;
        if (minDiscountPrice !== undefined)
          queryParams.minDiscountPrice = minDiscountPrice;
        if (maxDiscountPrice !== undefined)
          queryParams.maxDiscountPrice = maxDiscountPrice;
        if (minRating !== undefined) queryParams.minRating = minRating;
        if (sortBy) queryParams.sortBy = sortBy;
        if (order) queryParams.order = order;

        // Query products using the product service
        const result = await this.productService.queryProduct(queryParams);

        // Return product IDs and basic info for the AI to process
        const productSummary = result.products.map((product) => ({
          id: product._id.toString(),
          name: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          brand: product.brand?.name || 'Unknown',
          categories: product.categories?.map((c) => c.name) || [],
          rating: product.rating,
        }));

        return JSON.stringify({
          success: true,
          count: result.pagination.total,
          products: productSummary,
          message: `Found ${result.pagination.total} products matching the criteria.`,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
          message: 'Failed to query products.',
        });
      }
    },
    {
      name: 'query_products',
      description:
        'Query products from the database with various filters including name, brand, category, price range, and rating. Returns a list of matching products with their IDs and basic information.',
      schema: z.object({
        name: z
          .string()
          .optional()
          .describe(
            'Search products by name (case insensitive, partial match)',
          ),
        brandName: z
          .string()
          .optional()
          .describe('Filter products by brand name (e.g., "LG", "Samsung")'),
        brandIds: z
          .array(z.string())
          .optional()
          .describe('Filter products by brand IDs'),
        categoryName: z
          .string()
          .optional()
          .describe(
            'Filter products by category name (e.g., "Refrigerators", "TVs")',
          ),
        categoryIds: z
          .array(z.string())
          .optional()
          .describe('Filter products by category IDs'),
        minPrice: z.number().optional().describe('Minimum price filter'),
        maxPrice: z
          .number()
          .optional()
          .describe(
            'Maximum price filter (use this for "cheap" or "affordable" queries)',
          ),
        minDiscountPrice: z
          .number()
          .optional()
          .describe('Minimum discount price filter'),
        maxDiscountPrice: z
          .number()
          .optional()
          .describe('Maximum discount price filter'),
        minRating: z
          .number()
          .optional()
          .describe('Minimum rating filter (0-5)'),
        sortBy: z
          .string()
          .optional()
          .describe(
            'Field to sort by (e.g., "price", "discountPrice", "rating", "createdAt")',
          ),
        order: z
          .enum(['asc', 'desc'])
          .optional()
          .describe('Sort order: "asc" for ascending, "desc" for descending'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of products to return (default: 10)'),
      }),
    },
  );
}

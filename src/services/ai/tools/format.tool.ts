/* eslint-disable */
// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/dist/tools';
import * as z from 'zod';
import { ProductService } from 'src/product/product.service';

@Injectable()
export class FormatTool {
  constructor(private productService: ProductService) {}

  // Tool to get and format product details as markdown
  formatProductCardTool = tool(
    async (data) => {
      const { productId } = data;

      try {
        // Fetch the full product details
        const product = await this.productService.findOne(productId);

        if (!product) {
          return JSON.stringify({
            success: false,
            message: `Product with ID ${productId} not found.`,
          });
        }

        // Generate markdown card
        const markdown = this.generateProductCard(product);

        return JSON.stringify({
          success: true,
          markdown,
          productId,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
          message: `Failed to format product with ID ${productId}.`,
        });
      }
    },
    {
      name: 'format_product_card',
      description:
        'Get detailed information for a specific product by ID and format it as a markdown card for display to the user. Use this tool after querying products to show detailed product cards.',
      schema: z.object({
        productId: z
          .string()
          .describe(
            'The ID of the product to fetch and format as a markdown card',
          ),
      }),
    },
  );

  private generateProductCard(product: any): string {
    const discountPercent = Math.round(
      ((product.price - product.discountPrice) / product.price) * 100,
    );

    let markdown = `### 🛒 ${product.name}\n\n`;

    // Image
    if (product.image) {
      markdown += `![${product.name}](${product.image})\n\n`;
    }

    // Price section
    markdown += `**Price:** `;
    if (product.discountPrice < product.price) {
      markdown += `~~$${product.price.toFixed(2)}~~ **$${product.discountPrice.toFixed(2)}** 🔥 (${discountPercent}% OFF)\n\n`;
    } else {
      markdown += `$${product.price.toFixed(2)}\n\n`;
    }

    // Rating
    if (product.rating) {
      markdown += `⭐ **Rating:** ${product.rating}`;
      if (product.numberOfRatings) {
        markdown += ` (${product.numberOfRatings} reviews)`;
      }
      markdown += `\n\n`;
    }

    // Brand
    if (product.brand) {
      markdown += `**Brand:** ${typeof product.brand === 'object' ? product.brand.name : product.brand}\n\n`;
    }

    // Categories
    if (product.categories && product.categories.length > 0) {
      const categories = product.categories
        .map((cat) => (typeof cat === 'object' ? cat.name : cat))
        .join(', ');
      markdown += `**Categories:** ${categories}\n\n`;
    }

    // Store
    if (product.store) {
      markdown += `**Store:** ${typeof product.store === 'object' ? product.store.name : product.store}\n\n`;
    }

    // Description
    if (product.description) {
      markdown += `**Description:**\n${product.description.substring(0, 200)}${product.description.length > 200 ? '...' : ''}\n\n`;
    }

    // Key Features
    if (product.keyFeatures) {
      markdown += `**Key Features:**\n${product.keyFeatures.substring(0, 200)}${product.keyFeatures.length > 200 ? '...' : ''}\n\n`;
    }

    // Link
    if (product.link) {
      markdown += `[🔗 View Product](${product.link})\n\n`;
    }

    markdown += `---\n\n`;

    return markdown;
  }
}

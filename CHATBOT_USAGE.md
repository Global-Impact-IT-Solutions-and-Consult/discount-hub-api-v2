# Product Chatbot Implementation Guide

## Overview

The chatbot has been successfully implemented with AI-powered tools to handle user queries for products. It can intelligently search for products based on various criteria and format them as markdown cards for display.

## Architecture

### Components Created/Updated

1. **Query Tool** (`src/services/ai/tools/query.tool.ts`)

   - Queries MongoDB products database with advanced filters
   - Supports filtering by: name, brand, category, price range, ratings
   - Returns product summaries with IDs for further processing

2. **Format Tool** (`src/services/ai/tools/format.tool.ts`)

   - Fetches full product details by ID
   - Generates markdown-formatted product cards
   - Includes images, pricing, ratings, descriptions, and links

3. **AI Service** (`src/services/ai/ai.service.ts`)

   - Enhanced with `handleChatbotQuery()` method
   - Implements tool calling with LangChain
   - Manages conversation flow and tool execution

4. **Chat Service** (`src/chat/chat.service.ts`)
   - Updated to use the new chatbot functionality
   - Maintains chat history
   - Stores messages in MongoDB

## How It Works

### User Query Flow

1. **User sends a query** (e.g., "I need cheap LG fridges")
2. **AI processes the query** with system instructions:

   - Extracts intent: looking for LG brand refrigerators at low prices
   - Determines appropriate filters: brandName="LG", categoryName="Refrigerators", maxPrice, sortBy="discountPrice"

3. **AI calls `query_products` tool**:

   ```typescript
   {
     brandName: "LG",
     categoryName: "Refrigerators",
     maxPrice: 1000,
     sortBy: "discountPrice",
     order: "asc",
     limit: 5
   }
   ```

4. **Tool returns product IDs and summaries**

5. **AI calls `format_product_card` tool** for each product:

   ```typescript
   {
     productId: '507f1f77bcf86cd799439011';
   }
   ```

6. **Tool generates markdown cards**:

   ```markdown
   ### 🛒 LG 198L Refrigerator

   ![Product Image](https://example.com/image.jpg)

   **Price:** ~~$899.99~~ **$699.99** 🔥 (22% OFF)

   ⭐ **Rating:** 4.5 (150 reviews)

   **Brand:** LG

   **Categories:** Refrigerators, Home Appliances

   **Description:**
   Energy-efficient refrigerator with smart features...

   [🔗 View Product](https://store.com/product)

   ---
   ```

7. **AI composes final response** with friendly text and product cards

## Example Use Cases

### Query: "I need cheap LG fridges"

- **Filters Applied**: brandName="LG", categoryName="Refrigerators/Fridges", maxPrice, sortBy="discountPrice"
- **Result**: Shows 3-5 affordable LG refrigerators with markdown cards

### Query: "Show me Samsung TVs under $500"

- **Filters Applied**: brandName="Samsung", categoryName="TVs/Televisions", maxPrice=500
- **Result**: Lists Samsung TVs within budget with formatted cards

### Query: "Best rated headphones"

- **Filters Applied**: categoryName="Headphones/Audio", minRating=4.0, sortBy="rating", order="desc"
- **Result**: Shows top-rated headphones

### Query: "I want a laptop for work"

- **Filters Applied**: categoryName="Laptops/Computers"
- **Result**: Shows various laptop options with details

## API Endpoint Usage

### Send a Chat Message

**POST** `/chat/:chatId/message`

```json
{
  "content": "I need cheap LG fridges"
}
```

**Response:**

```json
{
  "_id": "...",
  "content": "Here are some affordable LG refrigerators I found for you:\n\n### 🛒 LG 198L...",
  "type": "AI",
  "metaData": { ... }
}
```

## Tool Capabilities

### query_products Tool

**Parameters:**

- `name` (string, optional): Search by product name
- `brandName` (string, optional): Filter by brand name
- `brandIds` (string[], optional): Filter by brand IDs
- `categoryName` (string, optional): Filter by category name
- `categoryIds` (string[], optional): Filter by category IDs
- `minPrice` (number, optional): Minimum price
- `maxPrice` (number, optional): Maximum price
- `minDiscountPrice` (number, optional): Minimum discount price
- `maxDiscountPrice` (number, optional): Maximum discount price
- `minRating` (number, optional): Minimum rating (0-5)
- `sortBy` (string, optional): Sort field (price, discountPrice, rating, createdAt)
- `order` (enum, optional): Sort order (asc, desc)
- `limit` (number, optional): Max results (default: 10)

**Returns:**

```json
{
  "success": true,
  "count": 12,
  "products": [
    {
      "id": "...",
      "name": "LG 198L Refrigerator",
      "price": 899.99,
      "discountPrice": 699.99,
      "brand": "LG",
      "categories": ["Refrigerators", "Home Appliances"],
      "rating": "4.5"
    }
  ],
  "message": "Found 12 products matching the criteria."
}
```

### format_product_card Tool

**Parameters:**

- `productId` (string, required): Product ID to format

**Returns:**

```json
{
  "success": true,
  "markdown": "### 🛒 Product Name\n\n...",
  "productId": "..."
}
```

## Configuration

Ensure these environment variables are set:

```env
AI_URL=http://localhost:11434  # Ollama server URL
AI_MODEL=llama3.2               # AI model to use
```

## Dependencies

The implementation uses:

- **LangChain** with Ollama for LLM integration
- **@langchain/ollama** for ChatOllama
- **Zod** for schema validation
- **NestJS** framework
- **MongoDB** with Mongoose

## Benefits

1. **Natural Language Understanding**: Users can ask questions naturally
2. **Smart Filtering**: AI extracts relevant filters from queries
3. **Visual Product Cards**: Markdown formatting makes products easy to view
4. **Category & Brand Recognition**: Understands product types and brands
5. **Price Intelligence**: Interprets "cheap", "affordable", "under X" queries
6. **Tool Chaining**: Can query multiple products and format them all
7. **Conversation Context**: Maintains chat history for follow-up questions

## Extending the Chatbot

### Add New Tools

1. Create a new tool in `src/services/ai/tools/`
2. Register it in `ai.module.ts`
3. Bind it to the LLM in `ai.service.ts`
4. Update system prompt to describe the tool

### Customize Product Cards

Modify `generateProductCard()` in `format.tool.ts` to:

- Add more fields
- Change markdown styling
- Include additional metadata
- Add store-specific information

### Adjust AI Behavior

Update the system prompt in `handleChatbotQuery()` to:

- Change conversation tone
- Add specific instructions
- Modify tool usage patterns
- Include domain-specific knowledge

## Testing

Test the chatbot with various queries:

```bash
# Create a chat
POST /chat
{ "userId": "user-id" }

# Send messages
POST /chat/{chatId}/message
{ "content": "I need cheap LG fridges" }

POST /chat/{chatId}/message
{ "content": "Show me the cheapest one" }

POST /chat/{chatId}/message
{ "content": "What about Samsung?" }
```

## Troubleshooting

### AI not calling tools

- Ensure Ollama is running and the model supports tool calling
- Check model version (llama3.2 or newer recommended)
- Verify tool schemas are valid

### Products not found

- Check database connectivity
- Verify product data exists with proper fields
- Review query filters in debug logs

### Markdown not rendering

- Ensure frontend supports markdown rendering
- Check for proper markdown library integration
- Verify response content format

## Future Enhancements

- [ ] Add product comparison tool
- [ ] Implement favorites/wishlist integration
- [ ] Add price history/tracking
- [ ] Include store availability checking
- [ ] Support image-based product search
- [ ] Add multi-language support
- [ ] Implement recommendation engine
- [ ] Add voice query support

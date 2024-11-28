import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';
import { OllamaEmbeddings } from '@langchain/ollama';

@Injectable()
export class AiService {
  constructor(private configService: ConfigService) {}

  async categorizeProducts(input: {
    categories: string[];
    // brands: string[];
    product: string;
  }): Promise<any> {
    try {
      // const openai = new OpenAI({
      //   apiKey: this.configService.get('AI_API_KEY'),
      //   baseURL: this.configService.get('AI_URL'),
      // });

      const groq = new Groq({ apiKey: this.configService.get('AI_API_KEY') });

      // Convert the input object into a string format suitable for the AI model
      // const { categories, brands, product } = input;
      const { categories, product } = input;

      const prompt = `
        You are an AI model trained to categorize a product based on given categories and also suggests brands from the product name.
        Categories: ${categories.join(', ')}
        Product: ${product}
        decide which categories and brands the product falls under and return the product categorized under the given categories and brands in this format:
        {
          "categories": ["Category1", "Category2", ...],
          "brands": ["Brand1", "Brand2", ... ]
        }
        Do not include any other explanations. suggest new categories and brands for products that do not fit into any of the given categories and assign the products to them appropraitely but still under the categories key though.
      `;

      // const prompt = `
      //   You are an AI model trained to categorize a product based on given categories and brands.
      //   Categories: ${categories.join(', ')}
      //   Brands: ${brands.join(', ')}
      //   Product: ${product}
      //   decide which categories and brands the product falls under and return the product categorized under the given categories and brands in this format:
      //   {
      //     "categories": ["Category1", "Category2", ...],
      //     "brands": ["Brand1", "Brand2", ... ]
      //   }
      //   Do not include any other explanations. suggest new categories for products that do not fit into any of the given categories and assign the products to them appropraitely but still under the categories key though.
      // `;

      const chatCompletion = await groq.chat.completions.create({
        // const chatCompletion = await openai.chat.completions.create({
        // model: 'mistralai/Mistral-7B-Instruct-v0.2',
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI model trained to categorize products into provided categories and brands.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 512, // Increased token limit to handle more complex responses
      });

      const aiResponse = chatCompletion.choices[0].message.content.trim();
      console.log(
        '🚀 ~ AiService ~ categorizeProducts ~ aiResponse:',
        aiResponse,
      );

      // Parse the AI response into a JavaScript object
      const formattedResponse = JSON.parse(
        aiResponse.replace(/(\r\n|\n|\r)/gm, ''),
      );

      console.log('Categorized Products:', formattedResponse);
      return formattedResponse;
    } catch (error) {
      console.error('Error communicating with AIML API', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Request data:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      throw new Error('Failed to categorize products');
    }
  }

  async handleQuery(query: string, products: any[]) {
    try {
      const embeddings = new OllamaEmbeddings({ model: 'nomic-embed-text' });
    } catch (error) {}
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';

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
}

// ***************** //
// ***************** //
// ***************** //
// ***************** //
// ***************** //
// ***************** //
// ***************** //
// ***************** //

/* 
This works well with mistralai/Mistral-7B-Instruct-v0.2,
I just want to switch to Groq
*/
// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { OpenAI } from 'openai';

// @Injectable()
// export class AiService {
//   constructor(private configService: ConfigService) {}

//   async categorizeProducts(input: {
//     categories: string[];
//     brands: string[];
//     products: {
//       name: string;
//       brand: string;
//       color: string;
//     }[];
//   }): Promise<any> {
//     try {
//       const openai = new OpenAI({
//         apiKey: this.configService.get('AI_API_KEY'),
//         baseURL: this.configService.get('AI_URL'),
//       });

//       // Convert the input object into a string format suitable for the AI model
//       const { categories, brands, products } = input;
//       const productsString = products
//         .map((p) => `Name: ${p.name}, Brand: ${p.brand}, Color: ${p.color}`)
//         .join('; ');

//       const prompt = `
//         You are an AI model trained to categorize products based on given categories and brands.
//         Categories: ${categories.join(', ')}
//         Brands: ${brands.join(', ')}
//         Products: ${productsString}
//         Return the products categorized under the given categories and brands in this format:
//         {
//           "categories": { "Category1": [Product1, Product2, ...], "Category2": [...] },
//           "brands": { "Brand1": [Product1, Product2, ...], "Brand2": [...] }
//         }
//         Do not include any other explanations. suggest new categories for products that do not fit into any of the given categories and assign the products to them appropraitely but still under the categories key though.
//       `;

//       const chatCompletion = await openai.chat.completions.create({
//         model: 'mistralai/Mistral-7B-Instruct-v0.2',
//         messages: [
//           {
//             role: 'system',
//             content:
//               'You are an AI model trained to categorize products into provided categories and brands.',
//           },
//           {
//             role: 'user',
//             content: prompt,
//           },
//         ],
//         temperature: 0.7,
//         max_tokens: 512, // Increased token limit to handle more complex responses
//       });

//       const aiResponse = chatCompletion.choices[0].message.content.trim();
//       console.log(
//         '🚀 ~ AiService ~ categorizeProducts ~ aiResponse:',
//         aiResponse,
//       );

//       // Parse the AI response into a JavaScript object
//       const formattedResponse = JSON.parse(
//         aiResponse.replace(/(\r\n|\n|\r)/gm, ''),
//       );

//       console.log('Categorized Products:', formattedResponse);
//       return formattedResponse;
//     } catch (error) {
//       console.error('Error communicating with AIML API', error);
//       if (error.response) {
//         console.error('Response data:', error.response.data);
//         console.error('Response status:', error.response.status);
//         console.error('Response headers:', error.response.headers);
//       } else if (error.request) {
//         console.error('Request data:', error.request);
//       } else {
//         console.error('Error message:', error.message);
//       }
//       throw new Error('Failed to categorize products');
//     }
//   }
// }

// ***************** //
// ***************** //
// ***************** //
// ***************** //
// ***************** //
// ***************** //
// ***************** //
// ***************** //

// Working Model
// // ai.service.ts
// import { Injectable } from '@nestjs/common';
// // import axios from 'axios';
// import { ConfigService } from '@nestjs/config';
// import { OpenAI } from 'openai';

// @Injectable()
// export class AiService {
//   constructor(private configService: ConfigService) {}

//   async categorizeWords(categories: string[], words: string[]): Promise<any> {
//     //   async categorizeWords(): Promise<any> {
//     try {
//       const openai = new OpenAI({
//         apiKey: this.configService.get('AI_API_KEY'),
//         baseURL: this.configService.get('AI_URL'),
//       });
//       // Initial structure for categorization result
//       const categorizedWords = categories.reduce((acc, category) => {
//         acc[category] = [];
//         return acc;
//       }, {});

//       categorizedWords['uncategorized'] = []; // For words that don't fit any given category

//       // Loop through each word and ask the AI to categorize it
//       for (const word of words) {
//         const chatCompletion = await openai.chat.completions.create({
//           model: 'mistralai/Mistral-7B-Instruct-v0.2',
//           messages: [
//             {
//               role: 'system',
//               content: `You are an AI model trained to categorize items into the following categories: ${categories.join(
//                 ', ',
//               )}. If an item does not fit any category, suggest a new one.`,
//             },
//             {
//               role: 'user',
//               content: `Which category does the word "${word}" fit into?`,
//             },
//           ],
//           temperature: 0.7,
//           max_tokens: 128,
//         });

//         const aiResponse = chatCompletion.choices[0].message.content
//           .trim()
//           .toLowerCase();
//         let categorized = false;

//         // Check if the AI's response matches one of the provided categories
//         for (const category of categories) {
//           if (aiResponse.includes(category.toLowerCase())) {
//             categorizedWords[category].push(word);
//             categorized = true;
//             break;
//           }
//         }

//         // If the word doesn't match any provided categories, put it in 'uncategorized'
//         if (!categorized) {
//           categorizedWords['uncategorized'].push({
//             word,
//             suggestedCategory: aiResponse,
//           });
//         }
//       }

//       console.log('Categorized Words:', categorizedWords);
//     } catch (error) {
//       console.error('Error communicating with AIML API', error);
//       throw new Error('Failed to categorize words');
//     }
//   }
// }

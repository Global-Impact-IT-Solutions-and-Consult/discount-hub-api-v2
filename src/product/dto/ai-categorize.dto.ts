// categorize.dto.ts
// export class AiCategorizeDto {
//   categories: string[];
//   words: string[];
// }

export class AiCategorizeDto {
  categories: string[];
  brands: string[];
  products: {
    name: string;
    brand: string;
    color: string;
  }[];
}

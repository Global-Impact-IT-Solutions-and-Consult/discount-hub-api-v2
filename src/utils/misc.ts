export function parsePrice(price: string): number {
  return parseFloat(price.replace(/[^\d.-]/g, ''));
}

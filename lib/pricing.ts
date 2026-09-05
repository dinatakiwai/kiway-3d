export const BASE_PRICE = 49000;
export const PRICE_PER_KEYCAP = 5000;

export function getClickerPrice(characterCount: number) {
  const count = Math.min(Math.max(characterCount, 1), 10);

  return BASE_PRICE + count * PRICE_PER_KEYCAP;
}
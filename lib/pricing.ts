export const DEFAULT_CLICKER_STARTING_PRICE = 54000;
export const DEFAULT_PRICE_PER_EXTRA_KEYCAP = 5000;

export function getClickerPrice(
  characterCount: number,
  startingPrice = DEFAULT_CLICKER_STARTING_PRICE,
  pricePerExtraKeycap = DEFAULT_PRICE_PER_EXTRA_KEYCAP,
) {
  const count = Math.min(Math.max(characterCount, 1), 10);

  return startingPrice + (count - 1) * pricePerExtraKeycap;
}

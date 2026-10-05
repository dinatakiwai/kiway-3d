export type ShippingPackageMeta = {
  shippingWeightGram?: number;
  shippingLengthCm?: number;
  shippingWidthCm?: number;
  shippingHeightCm?: number;
};

export type KeychainSelection = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
};

export type ClickerCartItem = ShippingPackageMeta & {
  id: string;
  product: "clicker";
  name: string;
  letters: string[];
  baseColor: string;
  capColors: Record<number, string>;
  fontColors: Record<number, string>;
  keychain?: KeychainSelection | null;
  price: number;
  quantity: number;
};

export type CatalogCartItem = ShippingPackageMeta & {
  id: string;
  product: "catalog";
  productId: string;
  name: string;
  letters: string[];
  baseColor: string;
  capColors: Record<number, string>;
  fontColors: Record<number, string>;
  price: number;
  quantity: number;
  imageUrl?: string | null;
};

export type CartItem = ClickerCartItem | CatalogCartItem;

const CART_KEY = "kiway-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      capColors: item.capColors ?? item.letterColors ?? {},
      fontColors: item.fontColors ?? {},
    }));
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("kiway-cart-updated"));
}

export function addToCart(
  item: Omit<ClickerCartItem, "id"> | Omit<CatalogCartItem, "id">
) {
  const cart = getCart();

  const id =
    item.product === "catalog"
      ? `catalog__${item.productId}`
      : [
          item.product,
          item.name,
          item.baseColor,
          ...Object.entries(item.capColors)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([index, color]) => `cap-${index}:${color}`),
          ...Object.entries(item.fontColors)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([index, color]) => `font-${index}:${color}`),
          item.keychain?.productId ?? "no-keychain",
        ].join("__");

  const existing = cart.find((cartItem) => cartItem.id === id);

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push({ ...item, id } as CartItem);
  }

  saveCart(cart);
  return cart;
}

export function removeFromCart(id: string) {
  saveCart(getCart().filter((item) => item.id !== id));
}

export function updateCartQuantity(id: string, quantity: number) {
  const safeQuantity = Math.max(1, Math.floor(quantity));

  saveCart(
    getCart().map((item) =>
      item.id === id ? { ...item, quantity: safeQuantity } : item
    )
  );
}

export function clearCart() {
  saveCart([]);
}

export function getCartCount() {
  return getCart().reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal() {
  return getCart().reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

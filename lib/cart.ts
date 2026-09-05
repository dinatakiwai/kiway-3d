export type ClickerCartItem = {
  id: string;
  product: "clicker";
  name: string;
  letters: string[];
  baseColor: string;
  letterColors: Record<number, string>;
  price: number;
  quantity: number;
};

const CART_KEY = "kiway-cart";

export function getCart(): ClickerCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: ClickerCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("kiway-cart-updated"));
}

export function addToCart(item: Omit<ClickerCartItem, "id">) {
  const cart = getCart();

  const id = [
    item.product,
    item.name,
    item.baseColor,
    Object.entries(item.letterColors)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([index, color]) => `${index}:${color}`)
      .join("|"),
  ].join("__");

  const existing = cart.find((cartItem) => cartItem.id === id);

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push({ ...item, id });
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

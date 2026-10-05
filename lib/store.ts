export type ClickerColor = { name: string; value: string };

export const DEFAULT_CLICKER_COLORS: ClickerColor[] = [
  { name: "Putih", value: "#ffffff" },
  { name: "Hitam", value: "#18181b" },
  { name: "Merah", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Kuning", value: "#facc15" },
  { name: "Hijau", value: "#22c55e" },
  { name: "Biru", value: "#3b82f6" },
  { name: "Ungu", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
];

export const DEFAULT_BASE_COLORS = DEFAULT_CLICKER_COLORS;
export const DEFAULT_CAP_COLORS = DEFAULT_CLICKER_COLORS;
export const DEFAULT_FONT_COLORS = DEFAULT_CLICKER_COLORS;

export const STORE = {
  name: "KEILAB.ID",
  whatsapp: "6287725932392",
  whatsappGreeting: "Halo KEILAB 👋 Saya ingin bertanya tentang produk dan custom 3D.",
  baseColors: DEFAULT_BASE_COLORS,
  capColors: DEFAULT_CAP_COLORS,
  fontColors: DEFAULT_FONT_COLORS,
  currency: "IDR",
};
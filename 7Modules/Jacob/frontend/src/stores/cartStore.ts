import { CartItem } from "../types/inventory";

const CART_KEY = "module5_cart";

export const loadCart = (): CartItem[] => {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
};

export const saveCart = (items: CartItem[]) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
};

export const addToCart = (item: CartItem) => {
  const items = loadCart();
  const existing = items.find((i) => i.catalog_id === item.catalog_id);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.push(item);
  }
  saveCart(items);
};

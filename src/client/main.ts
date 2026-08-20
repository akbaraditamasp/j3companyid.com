import "iconify-icon";
import Alpine from "alpinejs";

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  href: string;
}

interface CartItem extends CatalogItem {
  qty: number;
}

const CART_KEY = "j3.cart";
const WISHLIST_KEY = "j3.wishlist";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

interface CartStore {
  items: CartItem[];
  save(): void;
  readonly count: number;
  readonly subtotal: number;
  has(id: string): boolean;
  add(product: CatalogItem, qty?: number): void;
  setQty(id: string, qty: number): void;
  remove(id: string): void;
  clear(): void;
}

const cartStore: CartStore = {
  items: loadJSON<CartItem[]>(CART_KEY, []),

  save() {
    saveJSON(CART_KEY, this.items);
  },

  get count(): number {
    return this.items.reduce((sum: number, item: CartItem) => sum + item.qty, 0);
  },

  get subtotal(): number {
    return this.items.reduce((sum: number, item: CartItem) => sum + item.qty * item.price, 0);
  },

  has(id: string): boolean {
    return this.items.some((item: CartItem) => item.id === id);
  },

  add(product: CatalogItem, qty = 1) {
    const existing = this.items.find((item: CartItem) => item.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({ ...product, qty });
    }
    this.save();
  },

  setQty(id: string, qty: number) {
    const item = this.items.find((item: CartItem) => item.id === id);
    if (!item) return;
    if (qty < 1) {
      this.remove(id);
      return;
    }
    item.qty = qty;
    this.save();
  },

  remove(id: string) {
    this.items = this.items.filter((item: CartItem) => item.id !== id);
    this.save();
  },

  clear() {
    this.items = [];
    this.save();
  },
};

interface WishlistStore {
  items: CatalogItem[];
  save(): void;
  readonly count: number;
  has(id: string): boolean;
  toggle(product: CatalogItem): void;
  remove(id: string): void;
  clear(): void;
}

const wishlistStore: WishlistStore = {
  items: loadJSON<CatalogItem[]>(WISHLIST_KEY, []),

  save() {
    saveJSON(WISHLIST_KEY, this.items);
  },

  get count(): number {
    return this.items.length;
  },

  has(id: string): boolean {
    return this.items.some((item: CatalogItem) => item.id === id);
  },

  toggle(product: CatalogItem) {
    if (this.has(product.id)) {
      this.remove(product.id);
    } else {
      this.items.push(product);
      this.save();
    }
  },

  remove(id: string) {
    this.items = this.items.filter((item: CatalogItem) => item.id !== id);
    this.save();
  },

  clear() {
    this.items = [];
    this.save();
  },
};

Alpine.store("cart", cartStore);
Alpine.store("wishlist", wishlistStore);

window.Alpine = Alpine;
Alpine.start();

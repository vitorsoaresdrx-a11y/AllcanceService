import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  shipping: { descricao: string, valor: number } | null;
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  addItem: (product: any, price: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  setShipping: (s: { descricao: string, valor: number } | null) => void;
  setCartOpen: (open: boolean) => void;
  setCheckoutOpen: (open: boolean) => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      shipping: null,
      isCartOpen: false,
      isCheckoutOpen: false,
      addItem: (product, price) => {
        const items = get().items;
        const existing = items.find(i => i.id === product.id);
        if (existing) {
          set({ items: items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) });
        } else {
          set({ items: [...items, {
            id: product.id,
            sku: product.sku,
            name: product.name,
            price: price,
            image: product.images?.[0],
            quantity: 1
          }] });
        }
        set({ isCartOpen: true });
      },
      removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),
      updateQuantity: (id, delta) => set({
        items: get().items.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
      }),
      clearCart: () => set({ items: [], shipping: null, isCheckoutOpen: false }),
      setShipping: (s) => set({ shipping: s }),
      setCartOpen: (open) => set({ isCartOpen: open }),
      setCheckoutOpen: (open) => set({ isCheckoutOpen: open }),
    }),
    { 
      name: "ALLCANCE-cart",
      partialize: (state) => ({ items: state.items, shipping: state.shipping }) // Only persist items/shipping
    }
  )
);

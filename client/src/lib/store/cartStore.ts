import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique cart item id
  productId: string;
  productTitle: string;
  productImage: string;
  packageId: string;
  packageName: string;
  price: number;
  userId: string;
  zoneId?: string;
  email?: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          // Check if identical item already exists (same product, package, and account info)
          const existingItemIndex = state.items.findIndex(
            (i) => i.productId === item.productId && 
                   i.packageId === item.packageId && 
                   i.userId === item.userId && 
                   i.zoneId === item.zoneId
          );

          if (existingItemIndex > -1) {
            // Update quantity of existing item
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += item.quantity;
            return { items: newItems };
          }

          // Add new item with generated ID
          return { 
            items: [...state.items, { ...item, id: Math.random().toString(36).substring(2, 9) }] 
          };
        });
      },
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
      })),
      clearCart: () => set({ items: [] }),
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      }
    }),
    {
      name: 'nexcoin-cart',
    }
  )
);

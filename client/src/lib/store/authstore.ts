import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useCartStore } from "./cartStore";

export type UserRole = "super_admin" | "admin" | "staff" | "user";

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  role: UserRole;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  setUser: (user: AuthUser, token?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: () => {
        const role = get().user?.role;
        return role === "super_admin" || role === "admin";
      },
      isStaff: () => {
        const role = get().user?.role;
        return role === "super_admin" || role === "admin" || role === "staff";
      },
      setUser: (user, token) =>
        set({ user, token: token ?? null, isAuthenticated: true }),
      logout: () => {
        // Clear cart when logging out
        const cartStore = useCartStore.getState();
        cartStore.clearCart();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "nexcoin-auth",
    }
  )
);
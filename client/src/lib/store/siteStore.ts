import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SiteStatus = "active" | "maintenance";

interface SiteState {
  status: SiteStatus;
  setStatus: (status: SiteStatus) => void;
}

export const useSiteStore = create<SiteState>()(
  persist(
    (set) => ({
      status: "active",
      setStatus: (status) => set({ status }),
    }),
    { name: "nexcoin-site" }
  )
);

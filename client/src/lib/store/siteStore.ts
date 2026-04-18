import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SiteStatus = "active" | "maintenance";

interface SiteState {
  status: SiteStatus;
  setStatus: (status: SiteStatus) => void;
  cachedSiteLogo: string;
  cachedSiteName: string;
  cachedSiteFavicon: string;
  setCachedSiteSettings: (logo: string, name: string, favicon: string) => void;
}

export const useSiteStore = create<SiteState>()(
  persist(
    (set) => ({
      status: "active",
      setStatus: (status) => set({ status }),
      cachedSiteLogo: "",
      cachedSiteName: "",
      cachedSiteFavicon: "",
      setCachedSiteSettings: (logo, name, favicon) =>
        set({ cachedSiteLogo: logo, cachedSiteName: name, cachedSiteFavicon: favicon }),
    }),
    { name: "nexcoin-site" }
  )
);

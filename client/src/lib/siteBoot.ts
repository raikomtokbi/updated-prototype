// Reads the server-injected boot payload from <script>window.__SITE_BOOT__</script>
// in client/index.html. Used to render the user's logo / site name on the very
// first paint (no flash of default branding while /api/site-settings loads).

export interface SiteBoot {
  site_logo: string;
  site_name: string;
  site_favicon: string;
  pwa_icon: string;
}

const EMPTY: SiteBoot = {
  site_logo: "",
  site_name: "",
  site_favicon: "",
  pwa_icon: "",
};

export function getSiteBoot(): SiteBoot {
  if (typeof window === "undefined") return EMPTY;
  const raw = (window as any).__SITE_BOOT__;
  if (!raw || typeof raw !== "object") return EMPTY;
  return {
    site_logo: typeof raw.site_logo === "string" ? raw.site_logo : "",
    site_name: typeof raw.site_name === "string" ? raw.site_name : "",
    site_favicon: typeof raw.site_favicon === "string" ? raw.site_favicon : "",
    pwa_icon: typeof raw.pwa_icon === "string" ? raw.pwa_icon : "",
  };
}

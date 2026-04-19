import { Switch, Route, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wrench, Loader2 } from "lucide-react";
import { applyThemeVars } from "@/lib/theme";
import { usePageTracking } from "@/hooks/usePageTracking";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import Navbar from "./components/Navbar";
import CookieBanner from "./components/CookieBanner";
import Home, { Footer } from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import Account from "./pages/Account";
import ProductDetails from "./pages/ProductDetails";
import Support from "./pages/Support";
import About from "./pages/About";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import DeliveryCancellation from "./pages/DeliveryCancellation";
import Offers from "./pages/Offers";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetOtp from "./pages/VerifyResetOtp";
import ResetPassword from "./pages/ResetPassword";
import PaymentReturn from "./pages/PaymentReturn";
import UpiPayment from "./pages/UpiPayment";

// Admin routes are lazy-loaded — they're only fetched when an admin visits /admin/*
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const TopupOrders = lazy(() => import("./pages/admin/TopupOrders"));
const VoucherOrders = lazy(() => import("./pages/admin/VoucherOrders"));
const Payments = lazy(() => import("./pages/admin/Payments"));
const Refunds = lazy(() => import("./pages/admin/Refunds"));
const SupportTickets = lazy(() => import("./pages/admin/SupportTickets"));
const ContactSubmissions = lazy(() => import("./pages/admin/ContactSubmissions"));
const Games = lazy(() => import("./pages/admin/Games"));
const AdminVouchers = lazy(() => import("./pages/admin/Vouchers"));
const GiftCards = lazy(() => import("./pages/admin/GiftCards"));
const Subscriptions = lazy(() => import("./pages/admin/Subscriptions"));
const Users = lazy(() => import("./pages/admin/Users"));
const Campaigns = lazy(() => import("./pages/admin/Campaigns"));
const Coupons = lazy(() => import("./pages/admin/Coupons"));
const ControlPanel = lazy(() => import("./pages/admin/ControlPanel"));
const PaymentMethod = lazy(() => import("./pages/admin/PaymentMethod"));
const ApiIntegration = lazy(() => import("./pages/admin/ApiIntegration"));
const EmailTemplates = lazy(() => import("./pages/admin/EmailTemplates"));
const ChooseTheme = lazy(() => import("./pages/admin/ChooseTheme"));
const EditContent = lazy(() => import("./pages/admin/EditContent"));
const RolesPermissions = lazy(() => import("./pages/admin/RolesPermissions"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));

function AdminLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Loader2 className="animate-spin" size={28} style={{ color: "hsl(var(--primary))" }} />
    </div>
  );
}

function AdminRoutes() {
  return (
    <Suspense fallback={<AdminLoader />}>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/topup-orders" component={TopupOrders} />
        <Route path="/admin/voucher-orders" component={VoucherOrders} />
        <Route path="/admin/payments" component={Payments} />
        <Route path="/admin/refunds" component={Refunds} />
        <Route path="/admin/support-tickets" component={SupportTickets} />
        <Route path="/admin/contact-submissions" component={ContactSubmissions} />
        <Route path="/admin/games" component={Games} />
        <Route path="/admin/gift-cards" component={GiftCards} />
        <Route path="/admin/vouchers" component={AdminVouchers} />
        <Route path="/admin/subscriptions" component={Subscriptions} />
        <Route path="/admin/users" component={Users} />
        <Route path="/admin/campaigns" component={Campaigns} />
        <Route path="/admin/coupons" component={Coupons} />
        <Route path="/admin/control-panel" component={ControlPanel} />
        <Route path="/admin/payment-method" component={PaymentMethod} />
        <Route path="/admin/api-integration" component={ApiIntegration} />
        <Route path="/admin/email-templates" component={EmailTemplates} />
        <Route path="/admin/choose-theme" component={ChooseTheme} />
        <Route path="/admin/edit-content" component={EditContent} />
        <Route path="/admin/roles-permissions" component={RolesPermissions} />
        <Route path="/admin/profile" component={AdminProfile} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

// Routes where the global footer should NOT render (transactional / auth flows)
const FOOTER_EXCLUDED_PREFIXES = [
  "/cart",
  "/checkout",
  "/payment-return",
  "/payment/upi",
  "/login",
  "/register",
  "/auth",
  "/account",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/delivery-cancellation",
];

function PublicRoutes() {
  const [location] = useLocation();
  const isProductDetails =
    location.startsWith("/products/") && location !== "/products";
  const showFooter =
    !isProductDetails &&
    !FOOTER_EXCLUDED_PREFIXES.some(
      (p) => location === p || location.startsWith(`${p}/`)
    );

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="skip-to-content"
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main-content" className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/products" component={Products} />
          <Route path="/products/:slug" component={ProductDetails} />
          <Route path="/offers" component={Offers} />
          <Route path="/cart" component={Cart} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/payment-return" component={PaymentReturn} />
          <Route path="/payment/upi/:orderId" component={UpiPayment} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/auth/callback" component={AuthCallback} />
          <Route path="/auth/forgot-password" component={ForgotPassword} />
          <Route path="/auth/verify-reset-otp" component={VerifyResetOtp} />
          <Route path="/auth/reset-password" component={ResetPassword} />
          <Route path="/account" component={Account} />
          <Route path="/support" component={Support} />
          <Route path="/about" component={About} />
          <Route path="/faq" component={Faq} />
          <Route path="/contact" component={Contact} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/delivery-cancellation" component={DeliveryCancellation} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

function SiteHead({ siteName, seoTitle, seoDescription, seoKeywords, favicon, ogImage }: {
  siteName?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  favicon?: string;
  ogImage?: string;
}) {
  useEffect(() => {
    const title = seoTitle || siteName;
    if (title) document.title = title;
  }, [siteName, seoTitle]);

  useEffect(() => {
    if (favicon) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = favicon;
    }
  }, [favicon]);

  useEffect(() => {
    const setMeta = (name: string, content: string | undefined) => {
      if (!content) return;
      let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };
    const setOgMeta = (property: string, content: string | undefined) => {
      if (!content) return;
      let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };
    setMeta("description", seoDescription);
    setMeta("keywords", seoKeywords);
    setOgMeta("og:image", ogImage);
    setOgMeta("og:title", seoTitle || siteName);
    setOgMeta("og:description", seoDescription);
  }, [seoDescription, seoKeywords, ogImage, seoTitle, siteName]);

  return null;
}

function MaintenancePage({ siteName }: { siteName?: string }) {
  const name = siteName || "Nexcoin";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "hsl(var(--background))",
        flexDirection: "column",
        gap: "20px",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <Wrench size={52} style={{ opacity: 0.35, color: "hsl(var(--primary))" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 700, color: "hsl(210, 40%, 95%)", margin: 0, lineHeight: 1.2 }}>
          {name} is under maintenance
        </h1>
        <p style={{ fontSize: "14px", color: "hsl(220, 10%, 48%)", maxWidth: "380px", margin: 0, lineHeight: 1.6 }}>
          We are performing scheduled maintenance and will be back shortly. Thank you for your patience.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [location] = useLocation();
  const isAdmin = location === "/admin" || location.startsWith("/admin/");
  usePageTracking();
  usePushSubscription();

  const { data: siteSettings, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const maintenanceMode = siteSettings?.maintenance_mode === "true";

  // ── Google Analytics 4: storefront only ──────────────────────────────────
  useEffect(() => {
    const measurementId = siteSettings?.ga_measurement_id?.trim();
    if (!measurementId) return;
    const win = window as any;

    if (location.startsWith("/admin")) {
      // Remove GA4 scripts and wipe globals so no data is sent from admin pages
      document.getElementById("ga-script")?.remove();
      document.getElementById("ga-inline")?.remove();
      delete win.gtag;
      delete win.dataLayer;
      return;
    }

    // Inject GA4 script if not already present
    if (!document.getElementById("ga-script")) {
      const s = document.createElement("script");
      s.id = "ga-script";
      s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      s.async = true;
      document.head.appendChild(s);
      const inline = document.createElement("script");
      inline.id = "ga-inline";
      inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false});`;
      document.head.appendChild(inline);
    }

    if (typeof win.gtag === "function") {
      win.gtag("event", "page_view", {
        page_path: location,
        send_to: measurementId,
      });
    }
  }, [location, siteSettings?.ga_measurement_id]);

  useEffect(() => {
    if (siteSettings) {
      applyThemeVars(
        siteSettings.active_theme,
        siteSettings.theme_custom_primary,
        siteSettings.theme_custom_accent,
        siteSettings.theme_custom_background,
        siteSettings.theme_custom_surface,
      );
    }
  }, [
    siteSettings?.active_theme,
    siteSettings?.theme_custom_primary,
    siteSettings?.theme_custom_accent,
    siteSettings?.theme_custom_background,
    siteSettings?.theme_custom_surface,
  ]);

  if (isAdmin) {
    return <AdminRoutes />;
  }

  if (maintenanceMode) {
    return <MaintenancePage siteName={siteSettings?.site_name} />;
  }

  return (
    <>
      <SiteHead
        siteName={siteSettings?.site_name}
        seoTitle={siteSettings?.seo_title}
        seoDescription={siteSettings?.seo_description}
        seoKeywords={siteSettings?.seo_keywords}
        favicon={siteSettings?.site_favicon}
        ogImage={siteSettings?.og_image}
      />
      <PublicRoutes />
      <CookieBanner enabled={siteSettings?.cookie_consent_enabled !== "false"} />
    </>
  );
}

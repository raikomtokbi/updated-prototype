import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { applyThemeVars } from "@/lib/theme";
import Navbar from "./components/Navbar";
import CookieBanner from "./components/CookieBanner";
import Home from "./pages/Home";
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

import AdminDashboard from "./pages/admin/Dashboard";
import TopupOrders from "./pages/admin/TopupOrders";
import VoucherOrders from "./pages/admin/VoucherOrders";
import Payments from "./pages/admin/Payments";
import Refunds from "./pages/admin/Refunds";
import SupportTickets from "./pages/admin/SupportTickets";
import ContactSubmissions from "./pages/admin/ContactSubmissions";
import Games from "./pages/admin/Games";
import AdminVouchers from "./pages/admin/Vouchers";
import GiftCards from "./pages/admin/GiftCards";
import Subscriptions from "./pages/admin/Subscriptions";
import Users from "./pages/admin/Users";
import Subscribers from "./pages/admin/Subscribers";
import Campaigns from "./pages/admin/Campaigns";
import Coupons from "./pages/admin/Coupons";
import ControlPanel from "./pages/admin/ControlPanel";
import PaymentMethod from "./pages/admin/PaymentMethod";
import ApiIntegration from "./pages/admin/ApiIntegration";
import Plugins from "./pages/admin/Plugins";
import EmailTemplates from "./pages/admin/EmailTemplates";
import ChooseTheme from "./pages/admin/ChooseTheme";
import EditContent from "./pages/admin/EditContent";

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/admin" component={AdminDashboard} />
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
      <Route path="/admin/subscribers" component={Subscribers} />
      <Route path="/admin/campaigns" component={Campaigns} />
      <Route path="/admin/coupons" component={Coupons} />
      <Route path="/admin/control-panel" component={ControlPanel} />
      <Route path="/admin/payment-method" component={PaymentMethod} />
      <Route path="/admin/api-integration" component={ApiIntegration} />
      <Route path="/admin/plugins" component={Plugins} />
      <Route path="/admin/email-templates" component={EmailTemplates} />
      <Route path="/admin/choose-theme" component={ChooseTheme} />
      <Route path="/admin/edit-content" component={EditContent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
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
        background: "hsl(220, 20%, 6%)",
        flexDirection: "column",
        gap: "20px",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <Wrench size={52} style={{ opacity: 0.35, color: "hsl(258, 90%, 70%)" }} />
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

  const { data: siteSettings, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const maintenanceMode = siteSettings?.maintenance_mode === "true";

  useEffect(() => {
    if (siteSettings) {
      applyThemeVars(
        siteSettings.active_theme,
        siteSettings.theme_custom_primary,
        siteSettings.theme_custom_accent,
      );
    }
  }, [siteSettings?.active_theme, siteSettings?.theme_custom_primary, siteSettings?.theme_custom_accent]);

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

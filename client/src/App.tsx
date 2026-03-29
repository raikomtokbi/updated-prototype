import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import ProductDetails from "./pages/ProductDetails";
import Orders from "./pages/Orders";
import Support from "./pages/Support";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Offers from "./pages/Offers";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/Dashboard";
import TopupOrders from "./pages/admin/TopupOrders";
import VoucherOrders from "./pages/admin/VoucherOrders";
import Payments from "./pages/admin/Payments";
import Refunds from "./pages/admin/Refunds";
import SupportTickets from "./pages/admin/SupportTickets";
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
          <Route path="/orders" component={Orders} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/account" component={Account} />
          <Route path="/support" component={Support} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function SiteHead() {
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 60_000,
  });

  useEffect(() => {
    const favicon = siteSettings?.site_favicon;
    if (favicon) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = favicon;
    }
  }, [siteSettings?.site_favicon]);

  return null;
}

export default function App() {
  const [location] = useLocation();
  const isAdmin = location === "/admin" || location.startsWith("/admin/");
  return (
    <>
      <SiteHead />
      {isAdmin ? <AdminRoutes /> : <PublicRoutes />}
    </>
  );
}

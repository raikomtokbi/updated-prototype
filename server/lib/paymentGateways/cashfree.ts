import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

export const cashfreeGateway: PaymentGatewayHandler = {
  type: "cashfree",
  label: "Cashfree",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const appId = method.publicKey;
    const secretKey = method.secretKey;

    if (!appId || !secretKey) throw new Error("Cashfree credentials not configured (App ID and Secret Key required)");

    const isLive = method.mode === "live";
    const apiUrl = isLive
      ? "https://api.cashfree.com/pg/orders"
      : "https://sandbox.cashfree.com/pg/orders";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": appId,
        "x-client-secret": secretKey,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify({
        order_id: params.orderId,
        order_amount: params.amount,
        order_currency: params.currency || "INR",
        customer_details: {
          customer_id: params.email.replace(/[^a-zA-Z0-9]/g, "_"),
          customer_email: params.email,
          customer_name: params.name,
          customer_phone: params.phone || "9999999999",
        },
        order_meta: {
          return_url: params.returnUrl + "?order_id={order_id}&cf_order_token={order_token}&gateway=cashfree",
          notify_url: params.callbackUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create Cashfree order");
    }

    const order = await response.json();

    const paymentUrl = isLive
      ? `https://payments.cashfree.com/order/#${order.payment_session_id || order.order_token}`
      : `https://payments-test.cashfree.com/order/#${order.payment_session_id || order.order_token}`;

    return { type: "redirect_url", url: paymentUrl };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const { order_id, cf_order_token } = params;
    const appId = method.publicKey;
    const secretKey = method.secretKey;

    if (!appId || !secretKey) return { success: false, error: "Credentials not configured" };
    if (!order_id) return { success: false, error: "Order ID missing" };

    const isLive = method.mode === "live";
    const apiUrl = isLive
      ? `https://api.cashfree.com/pg/orders/${order_id}`
      : `https://sandbox.cashfree.com/pg/orders/${order_id}`;

    const response = await fetch(apiUrl, {
      headers: {
        "x-client-id": appId,
        "x-client-secret": secretKey,
        "x-api-version": "2023-08-01",
      },
    });

    if (!response.ok) return { success: false, error: "Failed to verify order" };

    const order = await response.json();
    if (order.order_status === "PAID") {
      return { success: true, transactionId: order.cf_order_id || order_id };
    }
    return { success: false, error: `Order status: ${order.order_status}` };
  },
};

import { createHash } from "crypto";
import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

export const bharatpeGateway: PaymentGatewayHandler = {
  type: "bharatpe",
  label: "BharatPe",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const merchantId = method.publicKey;
    const token = method.secretKey;

    if (!merchantId || !token) throw new Error("BharatPe credentials not configured (Merchant ID and Token required)");

    const isLive = method.mode === "live";
    const apiUrl = isLive
      ? "https://payments.bharatpe.com/api/v1/pg/create-order"
      : "https://payments-staging.bharatpe.com/api/v1/pg/create-order";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": token,
      },
      body: JSON.stringify({
        merchantId,
        orderId: params.orderId,
        amount: params.amount.toFixed(2),
        currencyCode: params.currency || "INR",
        orderType: "PAYMENT",
        redirectUrl: params.returnUrl + "?gateway=bharatpe",
        callbackUrl: params.callbackUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create BharatPe order");
    }

    const data = await response.json();
    if (!data.data?.paymentUrl) throw new Error("No payment URL from BharatPe");

    return { type: "redirect_url", url: data.data.paymentUrl };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const { orderId, txnId } = params;
    const merchantId = method.publicKey;
    const token = method.secretKey;

    if (!merchantId || !token) return { success: false, error: "Credentials not configured" };

    const isLive = method.mode === "live";
    const apiUrl = isLive
      ? `https://payments.bharatpe.com/api/v1/pg/status/${orderId}`
      : `https://payments-staging.bharatpe.com/api/v1/pg/status/${orderId}`;

    const response = await fetch(apiUrl, {
      headers: { "token": token },
    });

    if (!response.ok) return { success: false, error: "Failed to verify payment" };

    const data = await response.json();
    if (data.data?.status === "SUCCESS") {
      return { success: true, transactionId: txnId || orderId };
    }
    return { success: false, error: data.message || "Payment not confirmed" };
  },
};

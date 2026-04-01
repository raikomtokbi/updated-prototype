import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

export const instamojoGateway: PaymentGatewayHandler = {
  type: "instamojo",
  label: "Instamojo",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const apiKey = method.publicKey;
    const authToken = method.secretKey;

    if (!apiKey || !authToken) throw new Error("Instamojo credentials not configured (API Key and Auth Token required)");

    const isLive = method.mode === "live";
    const apiUrl = isLive
      ? "https://www.instamojo.com/api/1.1/payment-requests/"
      : "https://test.instamojo.com/api/1.1/payment-requests/";

    const formData = new URLSearchParams({
      purpose: params.productInfo || "Order",
      amount: params.amount.toFixed(2),
      buyer_name: params.name,
      email: params.email,
      phone: params.phone || "",
      redirect_url: params.returnUrl + "?gateway=instamojo",
      webhook: params.callbackUrl,
      allow_repeated_payments: "False",
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "X-Auth-Token": authToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create Instamojo payment request");
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Instamojo payment request failed");

    return { type: "redirect_url", url: data.payment_request.longurl };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const { payment_id, payment_request_id } = params;
    const apiKey = method.publicKey;
    const authToken = method.secretKey;

    if (!apiKey || !authToken) return { success: false, error: "Credentials not configured" };
    if (!payment_id || !payment_request_id) return { success: false, error: "Payment details missing" };

    const isLive = method.mode === "live";
    const apiUrl = isLive
      ? `https://www.instamojo.com/api/1.1/payment-requests/${payment_request_id}/${payment_id}/`
      : `https://test.instamojo.com/api/1.1/payment-requests/${payment_request_id}/${payment_id}/`;

    const response = await fetch(apiUrl, {
      headers: { "X-Api-Key": apiKey, "X-Auth-Token": authToken },
    });

    if (!response.ok) return { success: false, error: "Failed to verify payment" };

    const data = await response.json();
    if (data.success && data.payment?.status === "Credit") {
      return { success: true, transactionId: payment_id };
    }
    return { success: false, error: "Payment not confirmed" };
  },
};

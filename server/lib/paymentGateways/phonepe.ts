import { createHash } from "crypto";
import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

function sha256hex(str: string): string {
  return createHash("sha256").update(str).digest("hex");
}

export const phonepeGateway: PaymentGatewayHandler = {
  type: "phonepe",
  label: "PhonePe",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const merchantId = method.publicKey;
    const saltKey = method.secretKey;
    let saltIndex = "1";

    try {
      if (method.config) {
        const cfg = JSON.parse(method.config);
        saltIndex = cfg.saltIndex || "1";
      }
    } catch {}

    if (!merchantId || !saltKey) throw new Error("PhonePe credentials not configured (Merchant ID and Salt Key required)");

    const isLive = method.mode === "live";
    const apiUrl = isLive
      ? "https://api.phonepe.com/apis/hermes/pg/v1/pay"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

    const payload = {
      merchantId,
      merchantTransactionId: params.orderId,
      merchantUserId: params.email.replace(/[^a-zA-Z0-9]/g, "_"),
      amount: Math.round(params.amount * 100),
      redirectUrl: params.returnUrl + "?gateway=phonepe",
      redirectMode: "REDIRECT",
      callbackUrl: params.callbackUrl,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const hashInput = encodedPayload + "/pg/v1/pay" + saltKey;
    const xVerify = sha256hex(hashInput) + "###" + saltIndex;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
      },
      body: JSON.stringify({ request: encodedPayload }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to initiate PhonePe payment");
    }

    const data = await response.json();
    const redirectUrl = data.data?.instrumentResponse?.redirectInfo?.url;

    if (!redirectUrl) throw new Error("No redirect URL from PhonePe");

    return { type: "redirect_url", url: redirectUrl };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const { merchantTransactionId } = params;
    const merchantId = method.publicKey;
    const saltKey = method.secretKey;
    let saltIndex = "1";

    try {
      if (method.config) {
        const cfg = JSON.parse(method.config);
        saltIndex = cfg.saltIndex || "1";
      }
    } catch {}

    if (!merchantId || !saltKey) return { success: false, error: "Credentials not configured" };
    if (!merchantTransactionId) return { success: false, error: "Transaction ID missing" };

    const isLive = method.mode === "live";
    const endpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const apiUrl = isLive
      ? `https://api.phonepe.com/apis/hermes${endpoint}`
      : `https://api-preprod.phonepe.com/apis/pg-sandbox${endpoint}`;

    const xVerify = sha256hex(endpoint + saltKey) + "###" + saltIndex;

    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": merchantId,
      },
    });

    if (!response.ok) return { success: false, error: "Failed to verify payment" };

    const data = await response.json();
    if (data.success && data.code === "PAYMENT_SUCCESS") {
      return { success: true, transactionId: merchantTransactionId };
    }
    return { success: false, error: data.message || "Payment not confirmed" };
  },
};

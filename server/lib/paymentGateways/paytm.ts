import { createHmac, randomBytes } from "crypto";
import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

function generateChecksum(params: Record<string, string>, merchantKey: string): string {
  const sortedKeys = Object.keys(params).sort();
  const values = sortedKeys
    .filter(k => k !== "CHECKSUMHASH")
    .map(k => (params[k] === null || params[k] === undefined ? "" : params[k]));
  const salt = randomBytes(4).toString("hex");
  const paramStr = values.join("|") + "|" + salt;
  const hash = createHmac("sha256", merchantKey).update(paramStr).digest("hex");
  return hash + salt;
}

export const paytmGateway: PaymentGatewayHandler = {
  type: "paytm",
  label: "Paytm",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const merchantId = method.publicKey;
    const merchantKey = method.secretKey;
    let website = "DEFAULT";
    let industryType = "Retail";
    let channelId = "WEB";

    try {
      if (method.config) {
        const cfg = JSON.parse(method.config);
        website = cfg.website || "DEFAULT";
        industryType = cfg.industryType || "Retail";
        channelId = cfg.channelId || "WEB";
      }
    } catch {}

    if (!merchantId || !merchantKey) throw new Error("Paytm credentials not configured (Merchant ID and Merchant Key required)");

    const isLive = method.mode === "live";
    const gatewayUrl = isLive
      ? "https://securegw.paytm.in/order/process"
      : "https://securegw-stage.paytm.in/order/process";

    const txnParams: Record<string, string> = {
      MID: merchantId,
      ORDER_ID: params.orderId,
      CUST_ID: params.email,
      TXN_AMOUNT: params.amount.toFixed(2),
      CHANNEL_ID: channelId,
      WEBSITE: website,
      INDUSTRY_TYPE_ID: industryType,
      CALLBACK_URL: params.returnUrl + "?gateway=paytm",
      EMAIL: params.email,
      MOBILE_NO: params.phone || "",
    };

    const checksum = generateChecksum(txnParams, merchantKey);

    return {
      type: "redirect",
      formUrl: gatewayUrl,
      method: "POST",
      fields: {
        ...txnParams,
        CHECKSUMHASH: checksum,
      },
    };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const { STATUS, TXNID, RESPMSG } = params;

    if (STATUS === "TXN_SUCCESS") {
      return { success: true, transactionId: TXNID };
    }
    return { success: false, error: RESPMSG || "Payment failed" };
  },
};

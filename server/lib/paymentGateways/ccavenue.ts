import { createCipheriv, createDecipheriv, createHash } from "crypto";
import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

function md5hex(str: string): string {
  return createHash("md5").update(str).digest("hex");
}

function encryptAES128(data: string, workingKey: string): string {
  const keyHex = md5hex(workingKey);
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(keyHex.substring(0, 16));
  const cipher = createCipheriv("aes-128-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decryptAES128(encryptedData: string, workingKey: string): string {
  const keyHex = md5hex(workingKey);
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(keyHex.substring(0, 16));
  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export const ccavenueGateway: PaymentGatewayHandler = {
  type: "ccavenue",
  label: "CCAvenue",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const accessCode = method.publicKey;
    const workingKey = method.secretKey;
    let merchantId = "";

    try {
      if (method.config) {
        const cfg = JSON.parse(method.config);
        merchantId = cfg.merchantId || "";
      }
    } catch {}

    if (!accessCode || !workingKey || !merchantId) {
      throw new Error("CCAvenue credentials not configured (Access Code, Working Key, and Merchant ID required)");
    }

    const isLive = method.mode === "live";
    const gatewayUrl = isLive
      ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
      : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

    const merchantData = [
      `merchant_id=${merchantId}`,
      `order_id=${params.orderId}`,
      `currency=${params.currency || "INR"}`,
      `amount=${params.amount.toFixed(2)}`,
      `billing_name=${params.name}`,
      `billing_email=${params.email}`,
      `billing_tel=${params.phone || ""}`,
      `redirect_url=${params.returnUrl}?gateway=ccavenue`,
      `cancel_url=${params.returnUrl}?status=cancelled&gateway=ccavenue`,
      `language=EN`,
    ].join("&");

    const encryptedData = encryptAES128(merchantData, workingKey);

    return {
      type: "redirect",
      formUrl: gatewayUrl,
      method: "POST",
      fields: {
        encRequest: encryptedData,
        access_code: accessCode,
      },
    };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const { encResp } = params;
    const workingKey = method.secretKey;

    if (!workingKey) return { success: false, error: "Credentials not configured" };
    if (!encResp) return { success: false, error: "No response data" };

    try {
      const decrypted = decryptAES128(encResp, workingKey);
      const responseParams = new URLSearchParams(decrypted);
      const orderStatus = responseParams.get("order_status");

      if (orderStatus === "Success") {
        return { success: true, transactionId: responseParams.get("tracking_id") || responseParams.get("order_id") || "" };
      }
      return { success: false, error: `Payment status: ${orderStatus}` };
    } catch {
      return { success: false, error: "Failed to decrypt response" };
    }
  },
};

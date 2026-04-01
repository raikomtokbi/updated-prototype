import { createHash } from "crypto";
import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

function sha512(str: string): string {
  return createHash("sha512").update(str).digest("hex");
}

export const easybuzzGateway: PaymentGatewayHandler = {
  type: "easybuzz",
  label: "EasyBuzz",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const key = method.publicKey;
    const salt = method.secretKey;

    if (!key || !salt) throw new Error("EasyBuzz credentials not configured (Key and Salt required)");

    const txnId = params.orderId;
    const amount = params.amount.toFixed(2);
    const productInfo = params.productInfo || "Order";
    const firstName = params.name.split(" ")[0] || params.name;
    const email = params.email;
    const phone = params.phone || "";
    const udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "";

    const hashInput = `${key}|${txnId}|${amount}|${productInfo}|${firstName}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    const hash = sha512(hashInput);

    const isLive = method.mode === "live";
    const apiUrl = isLive
      ? "https://pay.easebuzz.in/payment/initiateLink"
      : "https://testpay.easebuzz.in/payment/initiateLink";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key, txnid: txnId, amount, productinfo: productInfo,
        firstname: firstName, email, phone,
        udf1, udf2, udf3, udf4, udf5, hash,
        surl: params.returnUrl + "?status=success&gateway=easybuzz",
        furl: params.returnUrl + "?status=failed&gateway=easybuzz",
      }).toString(),
    });

    const data = await response.json();
    if (data.status !== 1) throw new Error(data.error_desc || "Failed to initiate EasyBuzz payment");

    const paymentUrl = isLive
      ? `https://pay.easebuzz.in/pay/${data.data}`
      : `https://testpay.easebuzz.in/pay/${data.data}`;

    return { type: "redirect_url", url: paymentUrl };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const {
      txnid, status, hash, key, amount, productinfo, firstname, email,
      udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "",
    } = params;
    const salt = method.secretKey;

    if (!salt) return { success: false, error: "Credentials not configured" };

    const hashStr = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    const expectedHash = sha512(hashStr);

    if (expectedHash === hash && status === "success") {
      return { success: true, transactionId: txnid };
    }
    return { success: false, error: status === "success" ? "Hash mismatch" : `Payment ${status}` };
  },
};

import { createHash } from "crypto";
import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

function sha512(str: string): string {
  return createHash("sha512").update(str).digest("hex");
}

export const payuGateway: PaymentGatewayHandler = {
  type: "payu",
  label: "PayU",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const key = method.publicKey;
    const salt = method.secretKey;

    if (!key || !salt) throw new Error("PayU credentials not configured (key and salt required)");

    const txnId = params.orderId;
    const amount = params.amount.toFixed(2);
    const productInfo = params.productInfo || "Order";
    const firstName = params.name.split(" ")[0] || params.name;
    const email = params.email;
    const phone = params.phone || "";

    const hashString = `${key}|${txnId}|${amount}|${productInfo}|${firstName}|${email}|||||||||||${salt}`;
    const hash = sha512(hashString);

    const gatewayUrl = method.mode === "live"
      ? "https://secure.payu.in/_payment"
      : "https://test.payu.in/_payment";

    return {
      type: "redirect",
      formUrl: gatewayUrl,
      method: "POST",
      fields: {
        key,
        txnid: txnId,
        amount,
        productinfo: productInfo,
        firstname: firstName,
        email,
        phone,
        surl: params.returnUrl + "?status=success&gateway=payu",
        furl: params.returnUrl + "?status=failed&gateway=payu",
        hash,
        service_provider: "payu_paisa",
      },
    };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const {
      key, txnid, amount, productinfo, firstname, email,
      udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "",
      status, hash,
    } = params;
    const salt = method.secretKey;

    if (!salt) return { success: false, error: "Credentials not configured" };

    const hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    const expectedHash = sha512(hashString);

    if (expectedHash === hash && status === "success") {
      return { success: true, transactionId: txnid };
    }
    return { success: false, error: status === "success" ? "Hash mismatch" : `Payment ${status}` };
  },
};

import Razorpay from "razorpay";
import { createHmac } from "crypto";
import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

export const razorpayGateway: PaymentGatewayHandler = {
  type: "razorpay",
  label: "Razorpay",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const keyId = method.publicKey || process.env.RAZORPAY_KEY_ID;
    const keySecret = method.secretKey || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency,
      receipt: params.orderId,
    });

    return {
      type: "modal",
      gatewayType: "razorpay",
      orderId: order.id as string,
      amount: order.amount as number,
      currency: order.currency as string,
      keyId,
      name: "Nexcoin",
      description: params.productInfo || "Order Payment",
    };
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
    const keySecret = method.secretKey || process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) return { success: false, error: "Credentials not configured" };

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", keySecret).update(body).digest("hex");

    if (expectedSignature === razorpay_signature) {
      return { success: true, transactionId: razorpay_payment_id };
    }
    return { success: false, error: "Signature verification failed" };
  },
};

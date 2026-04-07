import type { PaymentMethod } from "@shared/schema";

export interface InitiateParams {
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  email: string;
  phone?: string;
  productInfo?: string;
  callbackUrl: string;
  returnUrl: string;
}

export type GatewayInitiateResult =
  | { type: "modal"; gatewayType: "razorpay"; orderId: string; amount: number; currency: string; keyId: string; name: string; description: string }
  | { type: "redirect"; formUrl: string; method: "POST" | "GET"; fields: Record<string, string> }
  | { type: "redirect_url"; url: string };

export interface VerifyResult {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  error?: string;
}

export interface PaymentGatewayHandler {
  type: string;
  label: string;
  initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult>;
  verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult>;
}

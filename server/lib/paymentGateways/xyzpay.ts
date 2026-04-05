import type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";
import type { PaymentMethod } from "@shared/schema";

interface XYZPayCreateOrderResponse {
  status: boolean;
  message: string;
  result?: {
    orderId: string;
    payment_url: string;
  };
}

interface XYZPayCheckStatusResponse {
  status: string;
  message: string;
  result?: {
    txnStatus: string;
    orderId: string;
    amount: string;
    date: string;
    utr: string;
  };
}

export const xyzpayGateway: PaymentGatewayHandler = {
  type: "xyzpay",
  label: "XYZPay",

  async initiatePayment(params: InitiateParams, method: PaymentMethod): Promise<GatewayInitiateResult> {
    const apiToken = method.secretKey || process.env.XYZPAY_API_TOKEN;
    if (!apiToken) throw new Error("XYZPay API token not configured");

    const baseUrl = process.env.REPLIT_DEV_DOMAIN || process.env.APP_URL || "https://yourdomain.com";
    const webhookUrl = `${baseUrl}/api/xyzpay/webhook`;

    const formData = new URLSearchParams();
    formData.append("customer_mobile", params.phone || "");
    formData.append("user_token", apiToken);
    formData.append("amount", params.amount.toString());
    formData.append("order_id", params.orderId);
    formData.append("redirect_url", webhookUrl);
    formData.append("remark1", "nexcoin");
    formData.append("remark2", params.productInfo || "payment");

    try {
      const response = await fetch("https://www.xyzpay.site/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data: XYZPayCreateOrderResponse = await response.json();

      if (!data.status || !data.result) {
        throw new Error(data.message || "Failed to create XYZPay order");
      }

      return {
        type: "redirect_url",
        url: data.result.payment_url,
      };
    } catch (error) {
      throw new Error(`XYZPay order creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },

  async verifyPayment(params: Record<string, any>, method: PaymentMethod): Promise<VerifyResult> {
    const apiToken = method.secretKey || process.env.XYZPAY_API_TOKEN;
    if (!apiToken) return { success: false, error: "Credentials not configured" };

    const orderId = params.order_id || params.orderId;
    if (!orderId) return { success: false, error: "Order ID missing" };

    const formData = new URLSearchParams();
    formData.append("user_token", apiToken);
    formData.append("order_id", orderId);

    try {
      const response = await fetch("https://www.xyzpay.site/api/check-order-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data: XYZPayCheckStatusResponse = await response.json();

      if (data.result?.txnStatus === "COMPLETED") {
        return {
          success: true,
          transactionId: data.result.utr || orderId,
        };
      }

      return {
        success: false,
        error: data.result?.txnStatus || data.message || "Payment not completed",
      };
    } catch (error) {
      return {
        success: false,
        error: `Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};

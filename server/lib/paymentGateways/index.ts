import type { PaymentGatewayHandler } from "./types";
import { razorpayGateway } from "./razorpay";
import { payuGateway } from "./payu";
import { cashfreeGateway } from "./cashfree";
import { instamojoGateway } from "./instamojo";
import { ccavenueGateway } from "./ccavenue";
import { phonepeGateway } from "./phonepe";
import { paytmGateway } from "./paytm";
import { easybuzzGateway } from "./easybuzz";
import { bharatpeGateway } from "./bharatpe";

export const GATEWAY_HANDLERS: Record<string, PaymentGatewayHandler> = {
  razorpay: razorpayGateway,
  payu: payuGateway,
  cashfree: cashfreeGateway,
  instamojo: instamojoGateway,
  ccavenue: ccavenueGateway,
  phonepe: phonepeGateway,
  paytm: paytmGateway,
  easybuzz: easybuzzGateway,
  bharatpe: bharatpeGateway,
};

export function getGatewayHandler(type: string): PaymentGatewayHandler | null {
  return GATEWAY_HANDLERS[type?.toLowerCase()] || null;
}

export const SUPPORTED_GATEWAYS = Object.values(GATEWAY_HANDLERS).map(g => ({
  type: g.type,
  label: g.label,
}));

export type { InitiateParams, GatewayInitiateResult, VerifyResult, PaymentGatewayHandler } from "./types";

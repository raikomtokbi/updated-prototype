import nodemailer from "nodemailer";
import type { EmailTemplate } from "@shared/schema";

// ─── Variable substitution ─────────────────────────────────────────────────────

export function processTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── HTML Builder ──────────────────────────────────────────────────────────────

export function buildEmailHtml(
  template: EmailTemplate,
  vars: Record<string, string>,
  siteName = "WebCMS"
): string {
  const title = processTemplate(template.title, vars);
  const body = processTemplate(template.body, vars);
  const footer = processTemplate(template.footerText ?? `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`, vars);
  const buttonText = template.buttonText ? processTemplate(template.buttonText, vars) : null;
  const buttonLink = template.buttonLink ? processTemplate(template.buttonLink, vars) : null;

  const button = buttonText && buttonLink
    ? `<div style="text-align:center;margin:28px 0 12px">
         <a href="${buttonLink}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;border-radius:7px;font-weight:600;font-size:14px;letter-spacing:0.02em">${buttonText}</a>
       </div>`
    : "";

  // Convert line breaks in body to <br> and wrap paragraphs
  const htmlBody = body
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 14px;color:#c8cfe0;font-size:14px;line-height:1.7">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${processTemplate(template.subject, vars)}</title>
</head>
<body style="margin:0;padding:0;background:#0d0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f14;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em">${siteName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#141720;padding:32px;border-radius:0 0 12px 12px;border:1px solid #1e2535;border-top:none">
              <h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#e8eeff;letter-spacing:-0.01em">${title}</h2>
              <div>${htmlBody}</div>
              ${button}
              <!-- Footer -->
              <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1e2535;text-align:center;font-size:11px;color:#4a5568">
                ${footer}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── SMTP Transporter factory ──────────────────────────────────────────────────

interface SmtpConfig {
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM?: string;
}

function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: parseInt(config.SMTP_PORT, 10) || 587,
    secure: parseInt(config.SMTP_PORT, 10) === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

// ─── Main send function ────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  vars: Record<string, string>;
  siteName?: string;
  smtpConfig: SmtpConfig;
}

export async function sendTemplatedEmail(opts: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const { to, template, vars, siteName = "WebCMS", smtpConfig } = opts;

  if (!template.isEnabled) {
    return { ok: false, error: "Email template is disabled" };
  }

  if (!smtpConfig.SMTP_HOST || !smtpConfig.SMTP_USER || !smtpConfig.SMTP_PASS) {
    return { ok: false, error: "SMTP not configured" };
  }

  try {
    const transporter = createTransporter(smtpConfig);
    const subject = processTemplate(template.subject, vars);
    const html = buildEmailHtml(template, vars, siteName);
    const from = smtpConfig.SMTP_FROM || smtpConfig.SMTP_USER;

    await transporter.sendMail({ from: `${siteName} <${from}>`, to, subject, html });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EmailService] Send failed to ${to}:`, message);
    return { ok: false, error: message };
  }
}

// ─── Default templates ─────────────────────────────────────────────────────────

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    type: "welcome",
    name: "Welcome Email",
    subject: "Welcome to {{site_name}}, {{user_name}}!",
    title: "Welcome aboard, {{user_name}}! 🎮",
    body: `Hi {{user_name}},

Thank you for joining {{site_name}}! We're excited to have you as part of our gaming community.

Your account has been created successfully. You can now browse our catalog of game top-ups, vouchers, and subscriptions.

If you have any questions, our support team is always here to help.

Happy gaming!`,
    footerText: "You received this email because you registered at {{site_name}}.",
    buttonText: "Start Shopping",
    buttonLink: "{{site_url}}",
    isEnabled: true,
  },
  {
    type: "otp",
    name: "OTP / Verification Email",
    subject: "Your verification code — {{site_name}}",
    title: "Your One-Time Password",
    body: `Hi {{user_name}},

You requested a verification code. Use the code below to complete your action:

{{otp_code}}

This code expires in 10 minutes. Do not share this code with anyone.

If you did not request this, please ignore this email or contact support.`,
    footerText: "This is an automated security email from {{site_name}}.",
    buttonText: null,
    buttonLink: null,
    isEnabled: true,
  },
  {
    type: "promotional",
    name: "Promotional Email",
    subject: "🎉 Special Offer from {{site_name}}",
    title: "Exclusive Deal Just for You",
    body: `Hi {{user_name}},

We have an exciting offer waiting for you at {{site_name}}!

Don't miss out on our latest promotions, discounts, and special deals on your favorite game top-ups and vouchers.

Check out what's new today and save big on your next purchase.`,
    footerText: "You received this email because you subscribed to {{site_name}} promotions. Unsubscribe at any time.",
    buttonText: "View Offers",
    buttonLink: "{{site_url}}/offers",
    isEnabled: true,
  },
  {
    type: "order_confirmation",
    name: "Order Confirmation Email",
    subject: "Order Confirmed — #{{order_id}}",
    title: "Your Order is Confirmed! ✅",
    body: `Hi {{user_name}},

Great news! Your order has been confirmed and is being processed.

Order ID: {{order_id}}
Amount: {{order_currency}}{{order_amount}}
Date: {{order_date}}

Your items will be delivered to your account shortly. You can track your order status from your account page.

Thank you for shopping with {{site_name}}!`,
    footerText: "© {{site_name}}. For support, contact us at {{support_email}}.",
    buttonText: "View Order",
    buttonLink: "{{site_url}}/orders",
    isEnabled: true,
  },
  {
    type: "support_ticket_reply",
    name: "Support Ticket Reply Email",
    subject: "Reply to your support ticket — {{site_name}}",
    title: "New Reply on Your Support Ticket",
    body: `Hi {{user_name}},

Our support team has replied to your ticket.

Ticket ID: {{ticket_id}}
Subject: {{ticket_subject}}

Reply:
{{reply_message}}

You can view the full conversation and respond by visiting your support page.

Best regards,
{{site_name}} Support Team`,
    footerText: "This email was sent in response to a support ticket submitted at {{site_name}}.",
    buttonText: "View Ticket",
    buttonLink: "{{site_url}}/support",
    isEnabled: true,
  },
];

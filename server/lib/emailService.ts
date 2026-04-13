import nodemailer from "nodemailer";
import type { EmailTemplate } from "@shared/schema";

// ─── Variable substitution ─────────────────────────────────────────────────────

export function processTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── Email Styles ──────────────────────────────────────────────────────────────

export interface EmailStyles {
  fontFamily: string;
  fontSize: string;
  textColor: string;
  backgroundColor: string;
  containerWidth: string;
  padding: string;
  spacing: string;
  headingSize: string;
  headingColor: string;
  buttonBg: string;
  buttonColor: string;
  buttonBorderRadius: string;
  buttonAlignment: string;
  cardBg: string;
  cardBorderRadius: string;
  cardShadow: string;
  headerBg: string;
  headerColor: string;
  headerText: string;
  headerImageUrl: string;
  footerColor: string;
  logoUrl: string;
}

export const DEFAULT_EMAIL_STYLES: EmailStyles = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  fontSize: "14px",
  textColor: "#c8cfe0",
  backgroundColor: "#0d0f14",
  containerWidth: "600px",
  padding: "32px",
  spacing: "20px",
  headingSize: "18px",
  headingColor: "#e8eeff",
  buttonBg: "linear-gradient(135deg,#7c3aed,#6d28d9)",
  buttonColor: "#ffffff",
  buttonBorderRadius: "7px",
  buttonAlignment: "center",
  cardBg: "#141720",
  cardBorderRadius: "12px",
  cardShadow: "none",
  headerBg: "linear-gradient(135deg,#7c3aed,#6d28d9)",
  headerColor: "#ffffff",
  headerText: "",
  headerImageUrl: "",
  footerColor: "#4a5568",
  logoUrl: "",
};

export function parseStyles(stylesJson: string | null | undefined): EmailStyles {
  if (!stylesJson) return DEFAULT_EMAIL_STYLES;
  try {
    return { ...DEFAULT_EMAIL_STYLES, ...JSON.parse(stylesJson) };
  } catch {
    return DEFAULT_EMAIL_STYLES;
  }
}

// ─── HTML Builder ──────────────────────────────────────────────────────────────

export function buildEmailHtml(
  template: EmailTemplate & { styles?: string | null },
  vars: Record<string, string>,
  siteName = "WebCMS"
): string {
  const styles = parseStyles(template.styles);

  const title = processTemplate(template.title, vars);
  const body = processTemplate(template.body, vars);
  const footer = processTemplate(template.footerText ?? `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`, vars);
  const buttonText = template.buttonText ? processTemplate(template.buttonText, vars) : null;
  const buttonLink = template.buttonLink ? processTemplate(template.buttonLink, vars) : null;

  const button = buttonText && buttonLink
    ? `<div style="text-align:${styles.buttonAlignment};margin:${styles.spacing} 0 12px">
         <a href="${buttonLink}" style="display:inline-block;padding:12px 28px;background:${styles.buttonBg};color:${styles.buttonColor};text-decoration:none;border-radius:${styles.buttonBorderRadius};font-weight:600;font-size:${styles.fontSize};letter-spacing:0.02em">${buttonText}</a>
       </div>`
    : "";

  const htmlBody = body
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 14px;color:${styles.textColor};font-size:${styles.fontSize};line-height:1.7;font-family:${styles.fontFamily}">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const cardShadowStyle = styles.cardShadow !== "none" && styles.cardShadow
    ? `;box-shadow:${styles.cardShadow}`
    : "";

  const logoHtml = styles.logoUrl
    ? `<img src="${styles.logoUrl}" alt="${siteName}" style="max-height:48px;max-width:160px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${processTemplate(template.subject, vars)}</title>
</head>
<body style="margin:0;padding:0;background:${styles.backgroundColor};font-family:${styles.fontFamily}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${styles.backgroundColor};padding:40px 20px">
    <tr>
      <td align="center">
        <table width="${styles.containerWidth}" cellpadding="0" cellspacing="0" style="max-width:${styles.containerWidth};width:100%">
          <tr>
            <td style="background:${styles.headerBg};${styles.headerImageUrl ? `background-image:url('${styles.headerImageUrl}');background-size:cover;background-position:center;` : ""}padding:24px ${styles.padding};border-radius:${styles.cardBorderRadius} ${styles.cardBorderRadius} 0 0;text-align:center">
              ${logoHtml}
              <h1 style="margin:0;font-size:22px;font-weight:700;color:${styles.headerColor};letter-spacing:-0.02em;font-family:${styles.fontFamily}">${styles.headerText || siteName}</h1>
            </td>
          </tr>
          <tr>
            <td style="background:${styles.cardBg};padding:${styles.padding};border-radius:0 0 ${styles.cardBorderRadius} ${styles.cardBorderRadius};border:1px solid #1e2535;border-top:none${cardShadowStyle}">
              <h2 style="margin:0 0 ${styles.spacing};font-size:${styles.headingSize};font-weight:700;color:${styles.headingColor};letter-spacing:-0.01em;font-family:${styles.fontFamily}">${title}</h2>
              <div>${htmlBody}</div>
              ${button}
              <div style="margin-top:${styles.spacing};padding-top:${styles.spacing};border-top:1px solid #1e2535;text-align:center;font-size:11px;color:${styles.footerColor};font-family:${styles.fontFamily}">
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
  SMTP_FROM_EMAIL?: string;
  SMTP_FROM_NAME?: string;
  SMTP_COMPOSE_FROM_EMAIL?: string;
  SMTP_DEFAULT_TO?: string;
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
  cc?: string; // Optional CC email address
}

export async function sendTemplatedEmail(opts: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const { to, template, vars, siteName = "WebCMS", smtpConfig, cc } = opts;

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
    const fromEmail = smtpConfig.SMTP_FROM_EMAIL || smtpConfig.SMTP_USER;
    const fromName = smtpConfig.SMTP_FROM_NAME || siteName;

    const mailOptions: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    };

    // Add CC if provided and valid
    if (cc && cc.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cc)) {
      mailOptions.cc = cc;
    }

    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EmailService] Send failed to ${to}:`, message);
    return { ok: false, error: message };
  }
}

// ─── Raw email send (admin compose) ───────────────────────────────────────────

export interface SendRawEmailOptions {
  to: string;
  fromName?: string;
  replyTo?: string;
  cc?: string;
  subject: string;
  body: string;
  smtpConfig: SmtpConfig;
}

export async function sendRawEmail(opts: SendRawEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const { to, fromName, replyTo, cc, subject, body, smtpConfig } = opts;

  if (!smtpConfig.SMTP_HOST || !smtpConfig.SMTP_USER || !smtpConfig.SMTP_PASS) {
    return { ok: false, error: "SMTP not configured" };
  }

  try {
    const transporter = createTransporter(smtpConfig);
    const fromEmail = smtpConfig.SMTP_COMPOSE_FROM_EMAIL || smtpConfig.SMTP_FROM_EMAIL || smtpConfig.SMTP_USER;
    const fromNameFinal = fromName || "Admin";
    const htmlBody = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

    const mailOptions: Record<string, unknown> = {
      from: `${fromNameFinal} <${fromEmail}>`,
      to,
      replyTo: replyTo || fromEmail,
      subject,
      html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#333;">${htmlBody}</div>`,
      text: body,
    };
    if (cc && cc.trim()) mailOptions.cc = cc.trim();
    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EmailService] Raw send failed to ${to}:`, message);
    return { ok: false, error: message };
  }
}

// ─── Default templates ─────────────────────────────────────────────────────────

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    type: "welcome",
    name: "Welcome Email",
    subject: "Welcome to {{site_name}}, {{user_name}}!",
    title: "Welcome aboard, {{user_name}}!",
    body: `Hi {{user_name}},

Thank you for joining {{site_name}}! We're excited to have you as part of our gaming community.

Your account has been created successfully. You can now browse our catalog of game top-ups, vouchers, and subscriptions.

If you have any questions, our support team is always here to help.

Happy gaming!`,
    footerText: "You received this email because you registered at {{site_name}}.",
    buttonText: "Start Shopping",
    buttonLink: "{{site_url}}",
    isEnabled: true,
    styles: null,
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
    styles: null,
  },
  {
    type: "promotional",
    name: "Promotional Email",
    subject: "Special Offer from {{site_name}}",
    title: "Exclusive Deal Just for You",
    body: `Hi {{user_name}},

We have an exciting offer waiting for you at {{site_name}}!

Don't miss out on our latest promotions, discounts, and special deals on your favorite game top-ups and vouchers.

Check out what's new today and save big on your next purchase.`,
    footerText: "You received this email because you subscribed to {{site_name}} promotions. Unsubscribe at any time.",
    buttonText: "View Offers",
    buttonLink: "{{site_url}}/offers",
    isEnabled: true,
    styles: null,
  },
  {
    type: "order_confirmation",
    name: "Order Confirmation Email",
    subject: "Order Confirmed — #{{order_id}}",
    title: "Your Order is Confirmed!",
    body: `Hi {{user_name}},

Great news! Your order has been confirmed and is being processed.

Order ID: {{order_id}}
Amount: {{order_amount}}
Date: {{order_date}}
Payment: {{payment_method}}
Status: {{order_status}}

Your items will be delivered to your account shortly. You can track your order status from your account page.

Thank you for shopping with {{site_name}}!`,
    footerText: "© {{site_name}}. For support, contact us at {{support_email}}.",
    buttonText: "View Order",
    buttonLink: "{{site_url}}/orders",
    isEnabled: true,
    styles: null,
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
    styles: null,
  },
];

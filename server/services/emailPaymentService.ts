import imapSimple from "imap-simple";
import { storage } from "../storage";

interface ParsedPayment {
  amount: number;
  utr: string;
  senderName: string;
}

/** Parse order notes — handles legacy array format and new { payerName, items } format */
function parseOrderNotes(notes?: string | null): { payerName: string; items: any[] } {
  if (!notes) return { payerName: "", items: [] };
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return { payerName: "", items: parsed };
    return {
      payerName: typeof parsed.payerName === "string" ? parsed.payerName : "",
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { payerName: "", items: [] };
  }
}

/**
 * Score how well an email sender name matches the stored payer name.
 * Returns 0 (no match) → 1 (exact match).  Any score > 0 means at least one word matched.
 */
function nameScore(emailSender: string, payerName: string): number {
  if (!emailSender || !payerName) return 0;
  const a = emailSender.toLowerCase().trim();
  const b = payerName.toLowerCase().trim();
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aWords = a.split(/\s+/).filter(w => w.length > 1);
  const bWords = b.split(/\s+/).filter(w => w.length > 1);
  const matches = aWords.filter(aw => bWords.some(bw => aw === bw || aw.startsWith(bw) || bw.startsWith(aw)));
  if (matches.length > 0) return 0.5 + (matches.length / Math.max(aWords.length, bWords.length)) * 0.35;
  return 0;
}

/** Extract the human-readable name from a FROM header value like "Rahul Sharma <rahul@gmail.com>" */
function extractSenderName(fromHeader: string): string {
  // "Display Name <email@example.com>" → "Display Name"
  const angleMatch = fromHeader.match(/^([^<]+?)\s*</);
  if (angleMatch) return angleMatch[1].trim().replace(/^["']|["']$/g, "");
  // "email@example.com" fallback — grab local part
  const atMatch = fromHeader.match(/^([^@\s]+)@/);
  return atMatch ? atMatch[1] : fromHeader.trim();
}

function parsePaymentEmail(subject: string, body: string): ParsedPayment | null {
  const text = `${subject} ${body}`;

  // Extract amount — matches patterns like "Rs. 199.00", "INR 199", "₹199", "amount 199.00"
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /amount[:\s]+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:credited|debited|received)[^₹\d]*([\d,]+(?:\.\d{1,2})?)/i,
    /for\s+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  let amount = 0;
  for (const pat of amountPatterns) {
    const m = text.match(pat);
    if (m) {
      amount = parseFloat(m[1].replace(/,/g, ""));
      if (amount > 0) break;
    }
  }
  if (!amount) return null;

  // Extract UTR — 12-digit number or alphanumeric ref
  const utrPatterns = [
    /(?:utr|ref(?:erence)?|txn|transaction)[:\s#]*([A-Za-z0-9]{8,30})/i,
    /(?:upi\s*ref|rrn)[:\s]*([A-Za-z0-9]{8,20})/i,
    /\b([0-9]{12})\b/,
  ];

  let utr = "";
  for (const pat of utrPatterns) {
    const m = text.match(pat);
    if (m) { utr = m[1]; break; }
  }

  // Extract sender name from body (FROM header extraction is done at call site using extractSenderName)
  const nameMatch = text.match(/(?:from|by|sender)[:\s]+([A-Za-z ]{2,50})/i);
  const senderName = nameMatch ? nameMatch[1].trim() : "";

  return { amount, utr, senderName };
}

type OrderCompletedCallback = (orderId: string) => Promise<void>;

async function processEmails(onOrderCompleted?: OrderCompletedCallback): Promise<void> {
  let settings: Awaited<ReturnType<typeof storage.getUpiSettings>>;
  try {
    settings = await storage.getUpiSettings();
  } catch {
    return;
  }

  if (!settings?.isActive || !settings.emailAddress || !settings.emailPassword) return;

  const config = {
    imap: {
      user: settings.emailAddress,
      password: settings.emailPassword,
      host: settings.imapHost || "imap.gmail.com",
      port: settings.imapPort || 993,
      tls: true,
      authTimeout: 10000,
      connTimeout: 15000,
      tlsOptions: { rejectUnauthorized: false },
    },
  };

  let connection: imapSimple.ImapSimple | null = null;
  try {
    connection = await imapSimple.connect(config);

    // Determine which mailbox to open — try the configured label, fall back to INBOX
    const configuredLabel = settings.imapLabel?.trim() || "INBOX";
    let mailbox = configuredLabel;

    if (configuredLabel !== "INBOX") {
      try {
        await connection.openBox(configuredLabel);
        console.log(`[UPI] Opened mailbox: "${configuredLabel}"`);
      } catch (labelErr: any) {
        if (labelErr?.message?.includes("Unknown Mailbox") || labelErr?.message?.includes("NO")) {
          console.warn(
            `[UPI] Mailbox "${configuredLabel}" not found. Falling back to INBOX. ` +
            `Tip: In Gmail, IMAP folder names are case-sensitive (e.g. "Payments" not "PAYMENTS"). ` +
            `Update the IMAP Label setting in Admin → API Integration → Manual UPI.`
          );
          mailbox = "INBOX";
          await connection.openBox("INBOX");
        } else {
          throw labelErr;
        }
      }
    } else {
      await connection.openBox("INBOX");
    }

    // Search for unseen emails in last 2 hours
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const searchCriteria = ["UNSEEN", ["SINCE", since.toISOString()]];
    const fetchOptions = {
      bodies: ["HEADER.FIELDS (FROM SUBJECT)", "TEXT"],
      markSeen: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`[UPI] Found ${messages.length} new email(s) to process`);

    for (const msg of messages) {
      try {
        const subjectPart = msg.parts.find(p => p.which === "HEADER.FIELDS (FROM SUBJECT)");
        const bodyPart = msg.parts.find(p => p.which === "TEXT");

        const subject = String(subjectPart?.body?.subject?.[0] || "");
        const fromHeader = String(subjectPart?.body?.from?.[0] || "");
        const body = String(bodyPart?.body || "");

        // Only process payment-related emails
        const isPaymentEmail = /payment|credited|upi|transfer|received|debit|paytm|phonepe|gpay|bhim/i.test(subject + body);
        if (!isPaymentEmail) continue;

        const parsed = parsePaymentEmail(subject, body);
        if (!parsed || parsed.amount <= 0) continue;

        // Prefer the FROM header name over the body-parsed name — it's more reliable
        const emailSenderName = fromHeader ? extractSenderName(fromHeader) : parsed.senderName;
        console.log(`[UPI] Parsed payment: amount=${parsed.amount}, utr=${parsed.utr}, sender="${emailSenderName}"`);

        // Find all pending UPI orders for this exact amount
        const pendingOrders = await storage.getPendingUpiOrders(String(parsed.amount.toFixed(2)));

        if (pendingOrders.length > 0) {
          let matchedOrder = pendingOrders[0];

          if (pendingOrders.length > 1 && emailSenderName) {
            // Score each order by name similarity; fall back to newest if no name data
            const scored = pendingOrders.map(order => {
              const { payerName } = parseOrderNotes(order.notes);
              return { order, score: nameScore(emailSenderName, payerName) };
            });

            const bestScore = Math.max(...scored.map(s => s.score));
            if (bestScore > 0) {
              // Pick the highest-scored order (tie-break: newest first)
              matchedOrder = scored
                .filter(s => s.score === bestScore)
                .sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime())
                [0].order;
              console.log(`[UPI] Name match: sender="${emailSenderName}" matched order ${matchedOrder.id} (score=${bestScore.toFixed(2)})`);
            } else {
              // No name data / no match — fall back to newest order
              matchedOrder = pendingOrders.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
              console.log(`[UPI] No name match for sender="${emailSenderName}"; falling back to newest order ${matchedOrder.id}`);
            }
          }

          await storage.updateOrderPaymentVerified(matchedOrder.id, parsed.utr || `AUTO_${Date.now()}`);
          console.log(`[UPI] Order ${matchedOrder.id} (${matchedOrder.orderNumber}) matched and verified`);

          // Trigger fulfillment + confirmation email via callback
          if (onOrderCompleted) {
            onOrderCompleted(matchedOrder.id).catch((err) =>
              console.error(`[UPI] onOrderCompleted error for order ${matchedOrder.id}:`, err)
            );
          }
        } else {
          // Store as unmatched payment
          await storage.createUnmatchedPayment({
            amount: String(parsed.amount.toFixed(2)),
            utr: parsed.utr || undefined,
            senderName: emailSenderName || undefined,
            emailSubject: subject.slice(0, 500) || undefined,
            rawBody: body.slice(0, 2000) || undefined,
          });
          console.log(`[UPI] No matching order found for amount=${parsed.amount}. Stored as unmatched.`);
        }
      } catch (msgErr) {
        console.error("[UPI] Error processing email message:", msgErr);
      }
    }
  } catch (err: any) {
    // Don't throw — just log. IMAP errors should not crash the server.
    if (err?.message?.includes("Invalid credentials") || err?.message?.includes("authentication")) {
      console.error("[UPI] IMAP authentication failed. Check email/password in UPI settings.");
    } else {
      console.error("[UPI] IMAP error:", err?.message || err);
    }
  } finally {
    if (connection) {
      try { connection.end(); } catch {}
    }
  }
}

let pollingInterval: NodeJS.Timeout | null = null;
let _onOrderCompleted: OrderCompletedCallback | undefined;

export function startEmailPaymentPoller(onOrderCompleted?: OrderCompletedCallback): void {
  if (pollingInterval) return;
  _onOrderCompleted = onOrderCompleted;
  console.log("[UPI] Starting email payment poller (15s interval)");
  // Run immediately on start, then every 15 seconds
  processEmails(_onOrderCompleted).catch(console.error);
  pollingInterval = setInterval(() => {
    processEmails(_onOrderCompleted).catch(console.error);
  }, 15_000);
}

export function stopEmailPaymentPoller(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

export { processEmails };

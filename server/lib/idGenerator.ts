/**
 * Generate user-friendly IDs for orders, transactions, and tickets
 * Examples: Ord00001, Tnx00001, Tkt00001
 */

let orderCounter = Math.floor(Math.random() * 100000);
let transactionCounter = Math.floor(Math.random() * 100000);
let ticketCounter = Math.floor(Math.random() * 100000);

export function generateOrderNumber(): string {
  orderCounter++;
  return `Ord${String(orderCounter).padStart(5, "0")}`;
}

export function generateTransactionNumber(): string {
  transactionCounter++;
  return `Tnx${String(transactionCounter).padStart(5, "0")}`;
}

export function generateTicketNumber(): string {
  ticketCounter++;
  return `Tkt${String(ticketCounter).padStart(5, "0")}`;
}

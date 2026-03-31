export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    INR: "₹",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    HKD: "HK$",
    IDR: "Rp",
    MYR: "RM",
    THB: "฿",
    VND: "₫",
    PHP: "₱",
    BDT: "৳",
    PKR: "₨",
    LKR: "Rs",
    AED: "د.إ",
    SAR: "﷼",
  };

  return symbols[currencyCode?.toUpperCase()] || currencyCode || "$";
}

import { type ParsedTransaction, ParsedTransactionSchema } from "./schemas";

const incomeKeywords = [
  "salary",
  "income",
  "earned",
  "received",
  "credit",
  "bonus",
  "invoice",
  "payment",
];
const refundKeywords = ["refund", "reversal", "cashback"];
const expenseKeywords = [
  "spent",
  "paid",
  "pay",
  "bought",
  "purchase",
  "rent",
  "grocery",
  "food",
  "bill",
  "uber",
  "taxi",
  "petrol",
  "fuel",
];

const paymentModeMap: Array<[RegExp, ParsedTransaction["payment_mode"]]> = [
  [/\bupi\b/i, "upi"],
  [/\bcard\b|\bcredit\b|\bdebit\b/i, "card"],
  [/\bcash\b/i, "cash"],
  [/\bbank\b|\btransfer\b|\bneft\b|\bimps\b/i, "bank"],
  [/\bwallet\b|\bpaytm\b|\bphonepe\b/i, "wallet"],
];

const categoryMap: Array<[RegExp, string]> = [
  [/\brent\b/i, "Rent"],
  [/\bfood\b|\bgrocery\b|\bcafe\b|\brestaurant\b/i, "Food"],
  [/\buber\b|\btaxi\b|\btransport\b|\bmetro\b|\bbus\b|\bfuel\b|\bpetrol\b/i, "Transport"],
  [/\bbill\b|\butilities\b|\belectric\b|\bwater\b|\binternet\b/i, "Bills"],
  [/\bshopping\b|\bstore\b|\bamazon\b|\bflipkart\b/i, "Shopping"],
  [/\btravel\b|\bflight\b|\bhotel\b/i, "Travel"],
  [/\bdoctor\b|\bpharmacy\b|\bhealth\b|\bmedical\b/i, "Health"],
  [/\bsalary\b|\bpayroll\b/i, "Salary"],
  [/\bclient\b|\bproject\b|\bconsulting\b/i, "Business"],
];

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(text: string, now: Date) {
  const lower = text.toLowerCase();
  if (lower.includes("today")) {
    return toDateString(now);
  }
  if (lower.includes("yesterday")) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return toDateString(yesterday);
  }

  const match = text.match(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = match[3]
      ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
      : now.getFullYear();
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return toDateString(parsed);
    }
  }

  return toDateString(now);
}

function parseAmount(text: string) {
  const match = text.replace(/,/g, "").match(/(?:rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

function parseType(text: string) {
  const lower = text.toLowerCase();
  if (refundKeywords.some((word) => lower.includes(word))) {
    return "refund" as const;
  }
  if (incomeKeywords.some((word) => lower.includes(word))) {
    return "income" as const;
  }
  if (expenseKeywords.some((word) => lower.includes(word))) {
    return "expense" as const;
  }
  return null;
}

function parsePaymentMode(text: string) {
  for (const [pattern, mode] of paymentModeMap) {
    if (pattern.test(text)) {
      return mode;
    }
  }
  return null;
}

function parseCategory(text: string) {
  for (const [pattern, category] of categoryMap) {
    if (pattern.test(text)) {
      return category;
    }
  }
  return null;
}

export function parseTransactionLocally(text: string, now = new Date()): ParsedTransaction {
  const amount = parseAmount(text);
  const type = parseType(text);
  const category = parseCategory(text);
  const payment_mode = parsePaymentMode(text);
  const date = parseDate(text, now);

  let confidence = 0.4;
  if (amount !== null) {
    confidence += 0.25;
  }
  if (type) {
    confidence += 0.25;
  }
  if (category) {
    confidence += 0.1;
  }
  if (payment_mode) {
    confidence += 0.05;
  }

  const parsed: ParsedTransaction = {
    type,
    amount,
    currency: "INR",
    category,
    subcategory: null,
    payment_mode,
    date,
    confidence: Math.min(1, confidence),
    needs_confirmation: true,
  };

  return ParsedTransactionSchema.parse(parsed);
}

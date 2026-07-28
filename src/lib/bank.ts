/**
 * Bank details for invoice payment.
 *
 * Read from environment rather than committed, so account numbers never enter
 * git history. They are rendered only on a token-gated invoice page, never on
 * a public route, and that page is noindex.
 *
 * Fill these in .env.local — and note they must NOT carry the NEXT_PUBLIC_
 * prefix, which would inline them into the browser bundle on every page.
 */
export interface BankDetails {
  accountName: string;
  bankName: string;
  iban?: string;
  accountNumber?: string;
  swift?: string;
  country?: string;
}

export function getBankDetails(): BankDetails | null {
  const accountName = process.env.BANK_ACCOUNT_NAME;
  const bankName = process.env.BANK_NAME;

  // Without at least a name and bank there is nothing payable to show.
  if (!accountName || !bankName) return null;

  return {
    accountName,
    bankName,
    iban: process.env.BANK_IBAN,
    accountNumber: process.env.BANK_ACCOUNT_NUMBER,
    swift: process.env.BANK_SWIFT,
    country: process.env.BANK_COUNTRY,
  };
}

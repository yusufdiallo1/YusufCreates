/**
 * Bank details for invoice payment.
 *
 * Read from environment rather than committed, so account numbers never enter
 * git history. They are rendered only on a token-gated invoice page, never on
 * a public route, and that page is noindex.
 *
 * Fill these in .env.local — and note they must NOT carry the NEXT_PUBLIC_
 * prefix, which would inline them into the browser bundle on every page.
 *
 * Two rails, because they are not interchangeable. A US domestic payer needs
 * an account and routing number; an international payer needs SWIFT and IBAN
 * and will be rejected by a domestic-only rail. Showing a payer the wrong set
 * is how a transfer bounces a week later.
 */

export interface BankRail {
  label: string;
  note?: string;
  rows: { label: string; value: string }[];
}

export interface BankDetails {
  accountName: string;
  bankName: string;
  bankAddress?: string;
  rails: BankRail[];
}

function clean(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

export function getBankDetails(): BankDetails | null {
  const accountName = clean(process.env.BANK_ACCOUNT_NAME);
  const bankName = clean(process.env.BANK_NAME);

  // Without at least a name and bank there is nothing payable to show.
  if (!accountName || !bankName) return null;

  const accountNumber = clean(process.env.BANK_ACCOUNT_NUMBER);
  const achRouting = clean(process.env.BANK_ACH_ROUTING);
  const wireRouting = clean(process.env.BANK_WIRE_ROUTING);
  const iban = clean(process.env.BANK_IBAN);
  const swift = clean(process.env.BANK_SWIFT);

  const rails: BankRail[] = [];

  if (accountNumber && (achRouting || wireRouting)) {
    const rows = [{ label: "Account number", value: accountNumber }];
    if (achRouting) rows.push({ label: "ACH routing number", value: achRouting });
    // Listed separately even when identical: a payer told only "routing
    // number" on a wire form has to guess, and guessing costs a fee.
    if (wireRouting) {
      rows.push({ label: "Wire routing number", value: wireRouting });
    }
    rails.push({
      label: "Domestic (US)",
      note: "For transfers from a US bank account.",
      rows,
    });
  }

  if (swift || iban) {
    const rows = [];
    if (iban) rows.push({ label: "IBAN", value: iban });
    if (accountNumber && !iban) {
      rows.push({ label: "Account number", value: accountNumber });
    }
    if (swift) rows.push({ label: "SWIFT / BIC", value: swift });
    rails.push({
      label: "International",
      note: "For transfers from outside the US. Your bank may charge a fee.",
      rows,
    });
  }

  if (rails.length === 0) return null;

  return {
    accountName,
    bankName,
    bankAddress: clean(process.env.BANK_ADDRESS),
    rails,
  };
}

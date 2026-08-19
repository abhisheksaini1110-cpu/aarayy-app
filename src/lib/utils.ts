export const CENTS_PER_DOLLAR = 100;

export function toCents(dollars: number | string | null | undefined): number {
  if (dollars === null || dollars === undefined || dollars === '') return 0;
  const n = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(n)) return 0;
  return Math.round(n * CENTS_PER_DOLLAR);
}

export function fromCents(cents: number | null | undefined): number {
  if (!cents) return 0;
  return cents / CENTS_PER_DOLLAR;
}

export function formatMoney(cents: number | null | undefined, currency = 'CAD'): string {
  const dollars = fromCents(cents ?? 0);
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(dollars);
  } catch {
    return `$${dollars.toFixed(2)}`;
  }
}

export function formatMoneyValue(dollars: number, currency = 'CAD'): string {
  return formatMoney(toCents(dollars), currency);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === 'paid' || status === 'void' || status === 'draft') return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export interface CalcTotals {
  subtotalCents: number;
  taxableSubtotalCents: number;
  nonTaxableSubtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  remainingCents: number;
  paidCents: number;
}

export interface LineItemInput {
  quantity: number;
  rate_cents: number;
  taxable: boolean;
}

export function calcLineTotal(quantity: number, rateCents: number): number {
  const q = Math.max(0, quantity || 0);
  const r = Math.max(0, rateCents || 0);
  return Math.round(q * r);
}

export function calcTotals(
  items: LineItemInput[],
  discountType: 'fixed' | 'percent',
  discountValue: number,
  taxRate: number,
  paidCents = 0,
): CalcTotals {
  let subtotal = 0;
  let taxableSub = 0;
  let nonTaxableSub = 0;

  for (const item of items) {
    const lineTotal = calcLineTotal(item.quantity, item.rate_cents);
    subtotal += lineTotal;
    if (item.taxable) taxableSub += lineTotal;
    else nonTaxableSub += lineTotal;
  }

  let discount = 0;
  if (discountType === 'percent') {
    const pct = Math.max(0, Math.min(100, discountValue || 0));
    discount = Math.round((subtotal * pct) / 100);
  } else {
    discount = Math.max(0, Math.min(subtotal, toCents(discountValue || 0)));
  }

  const taxableAfterDiscount = Math.max(0, taxableSub - discount);
  const tax = Math.round((taxableAfterDiscount * Math.max(0, taxRate || 0)) / 100);
  const total = Math.max(0, subtotal - discount + tax);
  const remaining = Math.max(0, total - paidCents);

  return {
    subtotalCents: subtotal,
    taxableSubtotalCents: taxableSub,
    nonTaxableSubtotalCents: nonTaxableSub,
    discountCents: discount,
    taxCents: tax,
    totalCents: total,
    remainingCents: remaining,
    paidCents,
  };
}

export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    resolve();
  });
}

export function initials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

import { supabase } from './supabase';
import type {
  BusinessSettings,
  Client,
  CatalogueItem,
  DocumentRow,
  DocumentItem,
  Payment,
  DocType,
  DocumentWithItems,
  ProjectType,
} from './types';
import { calcLineTotal, calcTotals, toCents } from './utils';
import { COMMON_CONSTRUCTION_SERVICES } from './commonServices';

// ===== Settings =====
export async function fetchSettings(): Promise<BusinessSettings | null> {
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as BusinessSettings | null;
}

export async function upsertSettings(
  s: Partial<BusinessSettings>,
): Promise<BusinessSettings> {
  const { data: existing } = await supabase
    .from('business_settings')
    .select('id')
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('business_settings')
      .update(s)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as BusinessSettings;
  }
  const { data, error } = await supabase
    .from('business_settings')
    .insert(s)
    .select()
    .single();
  if (error) throw error;
  return data as BusinessSettings;
}

// ===== Clients =====
export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function fetchClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Client | null;
}

export async function upsertClient(c: Partial<Client> & { id?: string }): Promise<Client> {
  if (c.id) {
    const { id, ...rest } = c;
    const { data, error } = await supabase
      .from('clients')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Client;
  }
  const { data, error } = await supabase
    .from('clients')
    .insert(c)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function checkDuplicateClient(c: Partial<Client>): Promise<Client | null> {
  const orParts: string[] = [];
  if (c.email) orParts.push(`email.eq.${c.email}`);
  if (c.phone) orParts.push(`phone.eq.${c.phone}`);
  if (!orParts.length) return null;
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .or(orParts.join(','))
    .neq('id', c.id ?? '')
    .maybeSingle();
  if (error) return null;
  return (data as Client) ?? null;
}

// ===== Catalogue =====
export async function fetchCatalogue(): Promise<CatalogueItem[]> {
  const { data, error } = await supabase
    .from('catalogue_items')
    .select('*')
    .order('description', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CatalogueItem[];
}

export async function upsertCatalogueItem(
  c: Partial<CatalogueItem> & { id?: string },
): Promise<CatalogueItem> {
  if (c.id) {
    const { id, ...rest } = c;
    const { data, error } = await supabase
      .from('catalogue_items')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CatalogueItem;
  }
  const { data, error } = await supabase
    .from('catalogue_items')
    .insert(c)
    .select()
    .single();
  if (error) throw error;
  return data as CatalogueItem;
}

export async function deleteCatalogueItem(id: string): Promise<void> {
  const { error } = await supabase.from('catalogue_items').delete().eq('id', id);
  if (error) throw error;
}

export async function loadCommonServices(): Promise<number> {
  const existing = await fetchCatalogue();
  const descriptions = new Set(
    existing.map((item) => item.description.trim().toLocaleLowerCase()),
  );
  const missing = COMMON_CONSTRUCTION_SERVICES.filter(
    (item) => !descriptions.has(item.description.trim().toLocaleLowerCase()),
  );

  if (missing.length === 0) return 0;

  const { error } = await supabase.from('catalogue_items').insert(missing);
  if (error) throw error;
  return missing.length;
}

// ===== Documents =====
export async function fetchDocuments(docType: DocType): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('doc_type', docType)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentRow[];
}

export async function fetchDocument(id: string): Promise<DocumentWithItems | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [itemsRes, paymentsRes] = await Promise.all([
    supabase
      .from('document_items')
      .select('*')
      .eq('document_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .order('payment_date', { ascending: false }),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  return {
    ...(data as DocumentRow),
    items: (itemsRes.data ?? []) as DocumentItem[],
    payments: (paymentsRes.data ?? []) as Payment[],
  };
}

export async function generateDocNumber(
  docType: DocType,
  prefix: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('next_document_number', {
    p_type: docType,
    p_prefix: prefix,
  });
  if (error) throw error;
  return data as string;
}

export interface SaveDocumentInput {
  id?: string;
  doc_type: DocType;
  number: string;
  client_id: string | null;
  client_name: string;
  client_contact: string;
  client_phone: string;
  client_email: string;
  project_name: string;
  project_type: ProjectType | null;
  billing_address: string;
  job_site_address: string;
  issue_date: string;
  valid_until: string | null;
  due_date: string | null;
  status: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  tax_rate: number;
  notes: string;
  exclusions: string;
  terms: string;
  internal_notes: string;
  quote_id: string | null;
  items: Array<{
    id?: string;
    description: string;
    category: string;
    unit: string;
    quantity: number;
    rate_cents: number;
    taxable: boolean;
  }>;
  deposit_cents?: number;
}

export async function saveDocument(input: SaveDocumentInput): Promise<DocumentRow> {
  const items = input.items.map((it, i) => ({
    ...it,
    line_total_cents: calcLineTotal(it.quantity, it.rate_cents),
    sort_order: i,
  }));

  const totals = calcTotals(
    items,
    input.discount_type,
    input.discount_value,
    input.tax_rate,
  );

  const docRow: Omit<DocumentRow, 'created_by' | 'created_at' | 'updated_at'> = {
    id: input.id ?? crypto.randomUUID(),
    doc_type: input.doc_type,
    number: input.number,
    client_id: input.client_id,
    client_name: input.client_name,
    client_contact: input.client_contact,
    client_phone: input.client_phone,
    client_email: input.client_email,
    project_name: input.project_name,
    project_type: input.project_type,
    billing_address: input.billing_address,
    job_site_address: input.job_site_address,
    issue_date: input.issue_date,
    valid_until: input.valid_until,
    due_date: input.due_date,
    status: input.status,
    subtotal_cents: totals.subtotalCents,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    discount_cents: totals.discountCents,
    tax_rate: input.tax_rate,
    tax_cents: totals.taxCents,
    total_cents: totals.totalCents,
    deposit_cents: input.deposit_cents ?? 0,
    notes: input.notes,
    exclusions: input.exclusions,
    terms: input.terms,
    internal_notes: input.internal_notes,
    quote_id: input.quote_id,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('documents')
      .update(docRow)
      .eq('id', input.id)
      .select()
      .single();
    if (error) throw error;
    await syncItems(input.id, items);
    return data as DocumentRow;
  }
  const { data, error } = await supabase
    .from('documents')
    .insert(docRow)
    .select()
    .single();
  if (error) throw error;
  const saved = data as DocumentRow;
  await syncItems(saved.id, items);
  return saved;
}

async function syncItems(
  documentId: string,
  items: Array<{
    id?: string;
    description: string;
    category: string;
    unit: string;
    quantity: number;
    rate_cents: number;
    taxable: boolean;
    line_total_cents: number;
    sort_order: number;
  }>,
) {
  const { data: existing } = await supabase
    .from('document_items')
    .select('id')
    .eq('document_id', documentId);
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  const keptIds = new Set(items.filter((i) => i.id).map((i) => i.id!));

  for (const id of existingIds) {
    if (!keptIds.has(id)) {
      await supabase.from('document_items').delete().eq('id', id);
    }
  }

  for (const item of items) {
    const row = {
      document_id: documentId,
      description: item.description,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      rate_cents: item.rate_cents,
      taxable: item.taxable,
      line_total_cents: item.line_total_cents,
      sort_order: item.sort_order,
    };
    if (item.id && existingIds.has(item.id)) {
      await supabase.from('document_items').update(row).eq('id', item.id);
    } else {
      await supabase.from('document_items').insert(row);
    }
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

export async function updateDocumentStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('documents').update({ status }).eq('id', id);
  if (error) throw error;
}

// ===== Payments =====
export async function addPayment(p: Omit<Payment, 'id' | 'created_by' | 'created_at'>): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert(p)
    .select()
    .single();
  if (error) throw error;
  await recalcInvoicePaymentStatus(p.invoice_id);
  return data as Payment;
}

export async function deletePayment(id: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
  await recalcInvoicePaymentStatus(invoiceId);
}

export async function recalcInvoicePaymentStatus(invoiceId: string): Promise<void> {
  const { data: inv } = await supabase
    .from('documents')
    .select('total_cents, status, doc_type')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!inv) return;
  const { data: pays } = await supabase
    .from('payments')
    .select('amount_cents')
    .eq('invoice_id', invoiceId);
  const paid = (pays ?? []).reduce((s: number, p: { amount_cents: number }) => s + p.amount_cents, 0);
  let status = inv.status;
  if (inv.doc_type === 'invoice') {
    if (paid <= 0) {
      // keep current (draft/sent/overdue/void)
    } else if (paid >= inv.total_cents) {
      status = 'paid';
    } else {
      status = 'partially_paid';
    }
  }
  await supabase
    .from('documents')
    .update({ status })
    .eq('id', invoiceId);
}

// ===== Convert quote -> invoice =====
export async function convertQuoteToInvoice(quoteId: string): Promise<DocumentRow> {
  const quote = await fetchDocument(quoteId);
  if (!quote) throw new Error('Quote not found');

  const settings = await fetchSettings();
  const prefix = settings?.invoice_prefix ?? 'INV';
  const number = await generateDocNumber('invoice', prefix);
  const dueDays = settings?.default_invoice_due_days ?? 14;
  const issueDate = new Date().toISOString().slice(0, 10);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const invRow = {
    doc_type: 'invoice' as DocType,
    number,
    client_id: quote.client_id,
    client_name: quote.client_name,
    client_contact: quote.client_contact,
    client_phone: quote.client_phone,
    client_email: quote.client_email,
    project_name: quote.project_name,
    project_type: quote.project_type,
    billing_address: quote.billing_address,
    job_site_address: quote.job_site_address,
    issue_date: issueDate,
    valid_until: null,
    due_date: dueDate.toISOString().slice(0, 10),
    status: 'draft',
    subtotal_cents: quote.subtotal_cents,
    discount_type: quote.discount_type,
    discount_value: quote.discount_value,
    discount_cents: quote.discount_cents,
    tax_rate: quote.tax_rate,
    tax_cents: quote.tax_cents,
    total_cents: quote.total_cents,
    deposit_cents: 0,
    notes: quote.notes,
    exclusions: quote.exclusions,
    terms: quote.terms,
    internal_notes: '',
    quote_id: quoteId,
  };

  const { data, error } = await supabase
    .from('documents')
    .insert(invRow)
    .select()
    .single();
  if (error) throw error;
  const invoice = data as DocumentRow;

  const itemRows = quote.items.map((it, i) => ({
    document_id: invoice.id,
    description: it.description,
    category: it.category,
    unit: it.unit,
    quantity: it.quantity,
    rate_cents: it.rate_cents,
    taxable: it.taxable,
    line_total_cents: it.line_total_cents,
    sort_order: i,
  }));
  if (itemRows.length) {
    const { error: ie } = await supabase.from('document_items').insert(itemRows);
    if (ie) throw ie;
  }

  return invoice;
}

// ===== Dashboard queries =====
export async function fetchDashboardData() {
  const { data: invoices, error: ie } = await supabase
    .from('documents')
    .select('*')
    .eq('doc_type', 'invoice');
  if (ie) throw ie;
  const { data: quotes, error: qe } = await supabase
    .from('documents')
    .select('*')
    .eq('doc_type', 'quote');
  if (qe) throw qe;
  const { data: payments, error: pe } = await supabase
    .from('payments')
    .select('amount_cents, payment_date, invoice_id');
  if (pe) throw pe;

  const inv = (invoices ?? []) as DocumentRow[];
  const qu = (quotes ?? []) as DocumentRow[];
  const pays = (payments ?? []) as { amount_cents: number; payment_date: string; invoice_id: string }[];

  const totalPaid = pays.reduce((s, p) => s + p.amount_cents, 0);
  const outstanding = inv.reduce((s, i) => {
    const invPaid = pays
      .filter((p) => p.invoice_id === i.id)
      .reduce((a, p) => a + p.amount_cents, 0);
    return s + Math.max(0, i.total_cents - invPaid);
  }, 0);
  const openQuoteValue = qu
    .filter((q) => q.status === 'sent' || q.status === 'draft')
    .reduce((s, q) => s + q.total_cents, 0);
  const acceptedQuoteValue = qu
    .filter((q) => q.status === 'accepted')
    .reduce((s, q) => s + q.total_cents, 0);

  const now = new Date();
  const overdueInvoices = inv.flatMap((i) => {
    if (i.status === 'paid' || i.status === 'void' || i.status === 'draft') return [];
    if (!i.due_date) return [];
    const invPaid = pays
      .filter((p) => p.invoice_id === i.id)
      .reduce((a, p) => a + p.amount_cents, 0);
    const balanceDue = Math.max(0, i.total_cents - invPaid);
    if (balanceDue === 0 || new Date(i.due_date) >= now) return [];
    return [{ ...i, balance_due_cents: balanceDue }];
  });

  // monthly summary: last 6 months
  const months: { label: string; invoiced: number; paid: number }[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const ym = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-CA', { month: 'short' });
    const invoiced = inv
      .filter((i) => i.issue_date?.slice(0, 7) === ym && i.status !== 'void')
      .reduce((s, i) => s + i.total_cents, 0);
    const paid = pays
      .filter((p) => p.payment_date?.slice(0, 7) === ym)
      .reduce((s, p) => s + p.amount_cents, 0);
    months.push({ label, invoiced, paid });
  }

  return {
    invoices: inv,
    quotes: qu,
    totalPaid,
    outstanding,
    openQuoteValue,
    acceptedQuoteValue,
    overdueCount: overdueInvoices.length,
    overdueInvoices,
    months,
  };
}

export async function fetchClientStats(clientId: string) {
  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  const { data: pays } = await supabase
    .from('payments')
    .select('amount_cents, invoice_id')
    .in(
      'invoice_id',
      (docs ?? []).map((d) => d.id),
    );

  const allDocs = (docs ?? []) as DocumentRow[];
  const invoices = allDocs.filter((d) => d.doc_type === 'invoice');
  const quotes = allDocs.filter((d) => d.doc_type === 'quote');
  const paymentsList = (pays ?? []) as { amount_cents: number; invoice_id: string }[];

  const totalInvoiced = invoices
    .filter((i) => i.status !== 'void')
    .reduce((s, i) => s + i.total_cents, 0);
  const totalPaid = paymentsList.reduce((s, p) => s + p.amount_cents, 0);
  const outstanding = Math.max(0, totalInvoiced - totalPaid);

  return { allDocs, invoices, quotes, totalInvoiced, totalPaid, outstanding };
}

export { toCents };

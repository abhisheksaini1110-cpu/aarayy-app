export type DocType = 'quote' | 'invoice';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'void';

export type ProjectType = 'Residential' | 'Commercial';

export type ItemCategory =
  | 'General Renovation'
  | 'Demolition'
  | 'Flooring'
  | 'Tiling'
  | 'Painting'
  | 'Drywall'
  | 'Framing & Carpentry'
  | 'Kitchen Renovation'
  | 'Bathroom Renovation'
  | 'Basement Renovation'
  | 'Electrical'
  | 'Plumbing'
  | 'HVAC'
  | 'Roofing & Exterior'
  | 'Concrete & Masonry'
  | 'Equipment'
  | 'Subcontractor'
  | 'Cleanup & Disposal'
  | 'Permits'
  | 'Materials'
  | 'Labour'
  | 'Other';

export type PaymentMethod =
  | 'Cash'
  | 'Cheque'
  | 'E-transfer'
  | 'Credit Card'
  | 'Bank Transfer'
  | 'Other';

export interface BusinessSettings {
  id: string;
  business_name: string;
  owner_name: string;
  logo_url: string | null;
  phone: string;
  email: string;
  website: string;
  address: string;
  tax_reg_number: string;
  currency: string;
  tax_label: string;
  default_tax_rate: number;
  default_quote_validity_days: number;
  default_invoice_due_days: number;
  quote_prefix: string;
  invoice_prefix: string;
  default_terms: string;
  default_exclusions: string;
  payment_instructions: string;
  footer_message: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  billing_address: string;
  job_site_address: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogueItem {
  id: string;
  description: string;
  category: ItemCategory;
  unit: string;
  rate: number;
  taxable: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  document_id: string;
  description: string;
  category: ItemCategory;
  unit: string;
  quantity: number;
  rate_cents: number;
  taxable: boolean;
  line_total_cents: number;
  sort_order: number;
}

export interface DocumentRow {
  id: string;
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
  subtotal_cents: number;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  discount_cents: number;
  tax_rate: number;
  tax_cents: number;
  total_cents: number;
  /** Calculated for dashboard/list views when payments have been loaded. */
  balance_due_cents?: number;
  deposit_cents: number;
  notes: string;
  exclusions: string;
  terms: string;
  internal_notes: string;
  quote_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount_cents: number;
  method: PaymentMethod;
  reference_number: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface DocumentWithItems extends DocumentRow {
  items: DocumentItem[];
  payments: Payment[];
  client?: Client | null;
}

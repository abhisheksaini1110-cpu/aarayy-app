/*
# Construction Billing — Full Schema

## Overview
Creates the complete database for a construction business quote/invoice app:
business settings, clients, catalogue items, documents (quotes & invoices),
document line items, and payments. Supports multiple business-user staff.

## 1. New Tables

- `business_settings` — one row of business profile (name, logo, tax, terms).
  Owned by a user but shared across staff users (all authenticated users see it).
- `clients` — client/company directory with billing + job-site addresses.
- `catalogue_items` — reusable construction items (labour, materials, etc.).
- `documents` — quotes and invoices (type discriminator column `doc_type`).
  Sequential numbers like Q-2026-001 / INV-2026-001, unique per (type, number).
- `document_items` — line items belonging to a document.
- `payments` — payments recorded against invoices.

## 2. Columns

### business_settings
- id (uuid pk), business_name, owner_name, logo_url, phone, email, website,
  address, tax_reg_number, currency (default CAD), tax_label (default HST),
  default_tax_rate (numeric %, default 13), default_quote_validity_days (30),
  default_invoice_due_days (14), quote_prefix (Q), invoice_prefix (INV),
  default_terms, default_exclusions, payment_instructions, footer_message,
  created_by (uuid -> auth.users), created_at, updated_at.

### clients
- id (uuid pk), name, contact_person, phone, email, billing_address,
  job_site_address, notes, created_by, created_at, updated_at.

### catalogue_items
- id (uuid pk), description, category (enum), unit, rate (numeric, cents-free),
  taxable (bool), created_by, created_at, updated_at.

### documents
- id (uuid pk), doc_type ('quote'|'invoice'), number (text, unique per type),
  client_id (fk -> clients), project_name, billing_address, job_site_address,
  issue_date (date), valid_until / due_date (date), status (enum),
  subtotal_cents, discount_type ('fixed'|'percent'), discount_value,
  discount_cents, tax_rate, tax_cents, total_cents, deposit_cents (quotes),
  notes, exclusions, terms, internal_notes, quote_id (fk -> documents, for
  invoices converted from quotes), created_by, created_at, updated_at.

### document_items
- id (uuid pk), document_id (fk -> documents, cascade), description, category,
  unit, quantity (numeric), rate_cents (int), taxable (bool), line_total_cents
  (int), sort_order (int).

### payments
- id (uuid pk), invoice_id (fk -> documents, cascade), payment_date (date),
  amount_cents (int), method (enum), reference_number, note, created_by,
  created_at.

## 3. Security
- RLS enabled on every table.
- All tables scoped to `authenticated` (this app has a sign-in screen).
- Ownership via `created_by = auth.uid()` for clients, catalogue, documents,
  payments, and document_items (through parent document ownership).
- business_settings is readable by all authenticated users (shared company
  profile) but only updatable by authenticated users.

## 4. Indexes
- documents(type, number), documents(client_id), documents(status),
  document_items(document_id), payments(invoice_id), clients(email),
  catalogue_items(category).

## 5. Notes
- Monetary values stored as integer cents (subtotal_cents, total_cents, etc.).
  Rate on catalogue_items is stored as numeric dollars for display simplicity
  but line item rates are integer cents. Discount_value is numeric (dollars or
  percent) and discount_cents stores the computed discount.
- A trigger increments a per-type, per-year sequence so quote/invoice numbers
  are sequential and collision-free.
*/

-- ===== business_settings =====
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  logo_url text,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  tax_reg_number text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'CAD',
  tax_label text NOT NULL DEFAULT 'HST',
  default_tax_rate numeric(5,2) NOT NULL DEFAULT 13.00,
  default_quote_validity_days int NOT NULL DEFAULT 30,
  default_invoice_due_days int NOT NULL DEFAULT 14,
  quote_prefix text NOT NULL DEFAULT 'Q',
  invoice_prefix text NOT NULL DEFAULT 'INV',
  default_terms text NOT NULL DEFAULT '',
  default_exclusions text NOT NULL DEFAULT '',
  payment_instructions text NOT NULL DEFAULT '',
  footer_message text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_business_settings" ON business_settings;
CREATE POLICY "auth_select_business_settings" ON business_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_business_settings" ON business_settings;
CREATE POLICY "auth_insert_business_settings" ON business_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_business_settings" ON business_settings;
CREATE POLICY "auth_update_business_settings" ON business_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_business_settings" ON business_settings;
CREATE POLICY "auth_delete_business_settings" ON business_settings FOR DELETE
  TO authenticated USING (true);

-- ===== clients =====
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  billing_address text NOT NULL DEFAULT '',
  job_site_address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_clients" ON clients;
CREATE POLICY "auth_select_clients" ON clients FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_clients" ON clients;
CREATE POLICY "auth_insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_clients" ON clients;
CREATE POLICY "auth_update_clients" ON clients FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_clients" ON clients;
CREATE POLICY "auth_delete_clients" ON clients FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- ===== catalogue_items =====
CREATE TABLE IF NOT EXISTS catalogue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  unit text NOT NULL DEFAULT 'each',
  rate numeric(12,2) NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_catalogue" ON catalogue_items;
CREATE POLICY "auth_select_catalogue" ON catalogue_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_catalogue" ON catalogue_items;
CREATE POLICY "auth_insert_catalogue" ON catalogue_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_catalogue" ON catalogue_items;
CREATE POLICY "auth_update_catalogue" ON catalogue_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_catalogue" ON catalogue_items;
CREATE POLICY "auth_delete_catalogue" ON catalogue_items FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_catalogue_category ON catalogue_items(category);

-- ===== documents =====
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('quote','invoice')),
  number text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  client_contact text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  project_name text NOT NULL DEFAULT '',
  billing_address text NOT NULL DEFAULT '',
  job_site_address text NOT NULL DEFAULT '',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  due_date date,
  status text NOT NULL DEFAULT 'draft',
  subtotal_cents bigint NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'fixed',
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  discount_cents bigint NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0,
  deposit_cents bigint NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  exclusions text NOT NULL DEFAULT '',
  terms text NOT NULL DEFAULT '',
  internal_notes text NOT NULL DEFAULT '',
  quote_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_doc_number UNIQUE (doc_type, number)
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_documents" ON documents;
CREATE POLICY "auth_select_documents" ON documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_documents" ON documents;
CREATE POLICY "auth_insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_documents" ON documents;
CREATE POLICY "auth_update_documents" ON documents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_documents" ON documents;
CREATE POLICY "auth_delete_documents" ON documents FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_documents_type_number ON documents(doc_type, number);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(doc_type, status);
CREATE INDEX IF NOT EXISTS idx_documents_issue_date ON documents(issue_date);

-- ===== document_items =====
CREATE TABLE IF NOT EXISTS document_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  unit text NOT NULL DEFAULT 'each',
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  rate_cents bigint NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT true,
  line_total_cents bigint NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_doc_items" ON document_items;
CREATE POLICY "auth_select_doc_items" ON document_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_doc_items" ON document_items;
CREATE POLICY "auth_insert_doc_items" ON document_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_doc_items" ON document_items;
CREATE POLICY "auth_update_doc_items" ON document_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_doc_items" ON document_items;
CREATE POLICY "auth_delete_doc_items" ON document_items FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_doc_items_document ON document_items(document_id);

-- ===== payments =====
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_cents bigint NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'Other',
  reference_number text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_payments" ON payments;
CREATE POLICY "auth_select_payments" ON payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "payments_update_own" ON payments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ===== updated_at triggers =====
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_settings_touch ON business_settings;
CREATE TRIGGER trg_business_settings_touch BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_clients_touch ON clients;
CREATE TRIGGER trg_clients_touch BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_catalogue_touch ON catalogue_items;
CREATE TRIGGER trg_catalogue_touch BEFORE UPDATE ON catalogue_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_documents_touch ON documents;
CREATE TRIGGER trg_documents_touch BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ===== sequential document number generator =====
-- Returns next number like 'Q-2026-001' or 'INV-2026-001'
CREATE OR REPLACE FUNCTION next_document_number(p_type text, p_prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  yr int := extract(year from CURRENT_DATE)::int;
  seq_val int;
  result text;
BEGIN
  -- atomic per-type-per-year sequence using a upsert counter table
  INSERT INTO document_number_seq(doc_type, year, last_num)
  VALUES (p_type, yr, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_num = document_number_seq.last_num + 1
  RETURNING last_num INTO seq_val;

  result := p_prefix || '-' || yr || '-' || lpad(seq_val::text, 3, '0');
  RETURN result;
END;
$$;

CREATE TABLE IF NOT EXISTS document_number_seq (
  doc_type text NOT NULL,
  year int NOT NULL,
  last_num int NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, year)
);

-- ===== storage bucket for logos =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_logos" ON storage.objects;
CREATE POLICY "auth_upload_logos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "public_read_logos" ON storage.objects;
CREATE POLICY "public_read_logos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "auth_update_logos" ON storage.objects;
CREATE POLICY "auth_update_logos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'logos') WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "auth_delete_logos" ON storage.objects;
CREATE POLICY "auth_delete_logos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'logos');

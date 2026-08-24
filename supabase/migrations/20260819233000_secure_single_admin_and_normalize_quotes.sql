/*
  Restrict business data to the authenticated user who created it and normalize
  the earlier human-readable Quote- prefix to the configured Q- format.
*/

UPDATE business_settings
SET quote_prefix = 'Q'
WHERE quote_prefix IS NULL OR lower(quote_prefix) = 'quote';

UPDATE documents d
SET number = 'Q-' || substring(d.number from 7)
WHERE d.doc_type = 'quote'
  AND d.number LIKE 'Quote-%'
  AND NOT EXISTS (
    SELECT 1
    FROM documents existing
    WHERE existing.doc_type = 'quote'
      AND existing.number = 'Q-' || substring(d.number from 7)
  );

CREATE INDEX IF NOT EXISTS idx_business_settings_created_by ON business_settings (created_by);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients (created_by);
CREATE INDEX IF NOT EXISTS idx_catalogue_items_created_by ON catalogue_items (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents (created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments (created_by);

DROP POLICY IF EXISTS "auth_select_business_settings" ON business_settings;
DROP POLICY IF EXISTS "auth_insert_business_settings" ON business_settings;
DROP POLICY IF EXISTS "auth_update_business_settings" ON business_settings;
DROP POLICY IF EXISTS "auth_delete_business_settings" ON business_settings;
CREATE POLICY "owner_select_business_settings" ON business_settings FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "owner_insert_business_settings" ON business_settings FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_update_business_settings" ON business_settings FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_delete_business_settings" ON business_settings FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "auth_select_clients" ON clients;
DROP POLICY IF EXISTS "auth_insert_clients" ON clients;
DROP POLICY IF EXISTS "auth_update_clients" ON clients;
DROP POLICY IF EXISTS "auth_delete_clients" ON clients;
CREATE POLICY "owner_select_clients" ON clients FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "owner_insert_clients" ON clients FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_update_clients" ON clients FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_delete_clients" ON clients FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "auth_select_catalogue" ON catalogue_items;
DROP POLICY IF EXISTS "auth_insert_catalogue" ON catalogue_items;
DROP POLICY IF EXISTS "auth_update_catalogue" ON catalogue_items;
DROP POLICY IF EXISTS "auth_delete_catalogue" ON catalogue_items;
CREATE POLICY "owner_select_catalogue" ON catalogue_items FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "owner_insert_catalogue" ON catalogue_items FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_update_catalogue" ON catalogue_items FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_delete_catalogue" ON catalogue_items FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "auth_select_documents" ON documents;
DROP POLICY IF EXISTS "auth_insert_documents" ON documents;
DROP POLICY IF EXISTS "auth_update_documents" ON documents;
DROP POLICY IF EXISTS "auth_delete_documents" ON documents;
CREATE POLICY "owner_select_documents" ON documents FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "owner_insert_documents" ON documents FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_update_documents" ON documents FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_delete_documents" ON documents FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "auth_select_doc_items" ON document_items;
DROP POLICY IF EXISTS "auth_insert_doc_items" ON document_items;
DROP POLICY IF EXISTS "auth_update_doc_items" ON document_items;
DROP POLICY IF EXISTS "auth_delete_doc_items" ON document_items;
CREATE POLICY "owner_select_doc_items" ON document_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.created_by = (select auth.uid())));
CREATE POLICY "owner_insert_doc_items" ON document_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.created_by = (select auth.uid())));
CREATE POLICY "owner_update_doc_items" ON document_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.created_by = (select auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.created_by = (select auth.uid())));
CREATE POLICY "owner_delete_doc_items" ON document_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.created_by = (select auth.uid())));

DROP POLICY IF EXISTS "auth_select_payments" ON payments;
DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
DROP POLICY IF EXISTS "payments_update_own" ON payments;
DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "owner_select_payments" ON payments FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "owner_insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_update_payments" ON payments FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "owner_delete_payments" ON payments FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

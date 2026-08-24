import { supabase } from './supabase';
import { fetchSettings, upsertSettings, generateDocNumber } from './db';
import { calcLineTotal, todayISO, addDaysISO, toCents } from './utils';
import type { DocType } from './types';

export async function loadDemoData(): Promise<void> {
  let settings = await fetchSettings();
  if (!settings) {
    settings = await upsertSettings({
      business_name: 'AARAYY Flooring Inc.',
      owner_name: 'Demo Owner',
      phone: '(000) 000-0000',
      email: 'demo@example.com',
      website: 'example.com',
      address: 'Demo Business Address, Ontario, Canada',
      tax_reg_number: 'DEMO-TAX-ID',
      currency: 'CAD',
      tax_label: 'HST',
      default_tax_rate: 13,
      default_quote_validity_days: 30,
      default_invoice_due_days: 14,
      quote_prefix: 'Q',
      invoice_prefix: 'INV',
      default_terms:
        'This quotation is valid for 30 days unless otherwise stated. Work will be scheduled after written acceptance and receipt of any required deposit. The quoted price includes only the labour, materials and services specifically described. Changes to the scope must be approved and may affect price and schedule. The Owner shall provide safe access to the work area and, at no charge to AARAYY Flooring Inc., working electricity and suitable outlets required for tools and equipment. Hidden damage, moisture, mould, asbestos, structural issues, unsafe wiring, plumbing issues or other unforeseen conditions may require additional work and charges. Deposits, progress payments and final payments are due according to the quotation or invoice. Final payment is due upon completion unless otherwise agreed in writing.',
      default_exclusions:
        'Excludes permits, hazardous material abatement, asbestos removal, and work outside the agreed scope. Additional work will be quoted separately.',
      payment_instructions:
        'E-transfer to demo@example.com. Cheques payable to AARAYY Flooring Inc.',
      footer_message:
        'AARAYY Flooring Inc. — Residential & Commercial Renovations. Thank you for your business.',
    });
  }

  // Create demo client
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('email', 'client@example.com')
    .maybeSingle();

  let clientId: string;
  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        name: 'Demo Client Inc.',
        contact_person: 'Demo Contact',
        phone: '(000) 000-0000',
        email: 'client@example.com',
        billing_address: 'Demo Billing Address, Ontario, Canada',
        job_site_address: 'Demo Job-Site Address, Ontario, Canada',
        notes: 'Prefers email communication. Residential renovation projects.',
      })
      .select()
      .single();
    if (error) throw error;
    clientId = client.id;
  }

  // Create catalogue items — mixed renovation trades
  const catalogueItems = [
    { description: 'Skilled carpentry / framing labour', category: 'Framing & Carpentry', unit: 'hour', rate: 75, taxable: true },
    { description: 'General renovation labourer', category: 'Labour', unit: 'hour', rate: 45, taxable: true },
    { description: 'Demolition & removal — interior walls', category: 'Demolition', unit: 'lump sum', rate: 1800, taxable: true },
    { description: 'Drywall installation (1/2")', category: 'Drywall', unit: 'square foot', rate: 2.5, taxable: true },
    { description: 'Drywall taping & mudding', category: 'Drywall', unit: 'square foot', rate: 1.75, taxable: true },
    { description: 'Interior painting — walls', category: 'Painting', unit: 'square foot', rate: 1.5, taxable: true },
    { description: 'Interior painting — trim & doors', category: 'Painting', unit: 'linear foot', rate: 3.0, taxable: true },
    { description: 'Hardwood flooring installation', category: 'Flooring', unit: 'square foot', rate: 6.5, taxable: true },
    { description: 'Porcelain tile installation', category: 'Tiling', unit: 'square foot', rate: 8.0, taxable: true },
    { description: 'Electrical — rough-in & fixtures', category: 'Electrical', unit: 'lump sum', rate: 4500, taxable: true },
    { description: 'Plumbing — rough-in & fixtures', category: 'Plumbing', unit: 'lump sum', rate: 3200, taxable: true },
    { description: 'Kitchen cabinet installation', category: 'Kitchen Renovation', unit: 'lump sum', rate: 5500, taxable: true },
    { description: 'Bathroom vanity & fixture install', category: 'Bathroom Renovation', unit: 'lump sum', rate: 2800, taxable: true },
    { description: 'Basement waterproofing & framing', category: 'Basement Renovation', unit: 'lump sum', rate: 6500, taxable: true },
    { description: 'Site cleanup & dumpster rental', category: 'Cleanup & Disposal', unit: 'lump sum', rate: 850, taxable: false },
    { description: 'Building permit application', category: 'Permits', unit: 'lump sum', rate: 350, taxable: false },
    { description: '2x6 pressure-treated lumber', category: 'Materials', unit: 'linear foot', rate: 6.5, taxable: true },
    { description: '3/4" T&G plywood subfloor', category: 'Materials', unit: 'each', rate: 62, taxable: true },
    { description: 'Mini excavator rental', category: 'Equipment', unit: 'day', rate: 350, taxable: false },
    { description: 'HVAC ductwork modification', category: 'HVAC', unit: 'lump sum', rate: 2200, taxable: true },
  ];

  for (const item of catalogueItems) {
    const { data: existing } = await supabase
      .from('catalogue_items')
      .select('id')
      .eq('description', item.description)
      .maybeSingle();
    if (!existing) {
      await supabase.from('catalogue_items').insert(item);
    }
  }

  // Create demo quote — mixed renovation work
  const { data: existingQuote } = await supabase
    .from('documents')
    .select('id')
    .eq('doc_type', 'quote')
    .eq('client_id', clientId)
    .maybeSingle();

  let quoteId: string | null = null;
  if (!existingQuote) {
    const quoteNumber = await generateDocNumber('quote', settings.quote_prefix || 'Q');
    const issueDate = todayISO();
    const validUntil = addDaysISO(issueDate, settings.default_quote_validity_days || 30);

    const quoteItems = [
      { description: 'Demolition — remove existing walls, flooring & fixtures', category: 'Demolition', unit: 'lump sum', quantity: 1, rate_cents: toCents(3200), taxable: true },
      { description: 'Site cleanup & dumpster rental', category: 'Cleanup & Disposal', unit: 'lump sum', quantity: 1, rate_cents: toCents(850), taxable: false },
      { description: 'Framing & carpentry — new partition walls', category: 'Framing & Carpentry', unit: 'hour', quantity: 64, rate_cents: toCents(75), taxable: true },
      { description: '2x6 pressure-treated lumber', category: 'Materials', unit: 'linear foot', quantity: 320, rate_cents: toCents(6.5), taxable: true },
      { description: 'Drywall installation (1/2")', category: 'Drywall', unit: 'square foot', quantity: 1200, rate_cents: toCents(2.5), taxable: true },
      { description: 'Drywall taping & mudding', category: 'Drywall', unit: 'square foot', quantity: 1200, rate_cents: toCents(1.75), taxable: true },
      { description: 'Interior painting — walls', category: 'Painting', unit: 'square foot', quantity: 1400, rate_cents: toCents(1.5), taxable: true },
      { description: 'Interior painting — trim & doors', category: 'Painting', unit: 'linear foot', quantity: 240, rate_cents: toCents(3.0), taxable: true },
      { description: 'Hardwood flooring installation', category: 'Flooring', unit: 'square foot', quantity: 850, rate_cents: toCents(6.5), taxable: true },
      { description: 'Electrical — rough-in & fixtures', category: 'Electrical', unit: 'lump sum', quantity: 1, rate_cents: toCents(4500), taxable: true },
      { description: 'Plumbing — rough-in & fixtures', category: 'Plumbing', unit: 'lump sum', quantity: 1, rate_cents: toCents(3200), taxable: true },
      { description: 'Building permit application', category: 'Permits', unit: 'lump sum', quantity: 1, rate_cents: toCents(350), taxable: false },
    ];

    let subtotal = 0;
    let taxableSub = 0;
    const itemRows = quoteItems.map((it, i) => {
      const lineTotal = calcLineTotal(it.quantity, it.rate_cents);
      subtotal += lineTotal;
      if (it.taxable) taxableSub += lineTotal;
      return {
        description: it.description,
        category: it.category,
        unit: it.unit,
        quantity: it.quantity,
        rate_cents: it.rate_cents,
        taxable: it.taxable,
        line_total_cents: lineTotal,
        sort_order: i,
      };
    });

    const taxRate = settings.default_tax_rate || 13;
    const taxCents = Math.round((taxableSub * taxRate) / 100);
    const totalCents = subtotal + taxCents;

    const { data: quote, error: qe } = await supabase
      .from('documents')
      .insert({
        doc_type: 'quote' as DocType,
        number: quoteNumber,
        client_id: clientId,
        client_name: 'Demo Client Inc.',
        client_contact: 'Demo Contact',
        client_phone: '(000) 000-0000',
        client_email: 'client@example.com',
        project_name: 'Main Floor Full Renovation',
        project_type: 'Residential',
        billing_address: 'Demo Billing Address, Ontario, Canada',
        job_site_address: 'Demo Job-Site Address, Ontario, Canada',
        issue_date: issueDate,
        valid_until: validUntil,
        status: 'sent',
        subtotal_cents: subtotal,
        discount_type: 'fixed',
        discount_value: 0,
        discount_cents: 0,
        tax_rate: taxRate,
        tax_cents: taxCents,
        total_cents: totalCents,
        deposit_cents: toCents(8000),
        notes:
          'This quote covers the complete main floor renovation including demolition, framing, drywall, painting, hardwood flooring, electrical and plumbing work as discussed.',
        exclusions: settings.default_exclusions || '',
        terms: settings.default_terms || '',
        internal_notes:
          'Demo contact may add the kitchen renovation later — follow up after acceptance.',
      })
      .select()
      .single();
    if (qe) throw qe;
    quoteId = quote.id;

    await supabase.from('document_items').insert(
      itemRows.map((r) => ({ ...r, document_id: quoteId })),
    );
  }

  // Create demo invoice — mixed renovation, partially paid
  const { data: existingInvoice } = await supabase
    .from('documents')
    .select('id')
    .eq('doc_type', 'invoice')
    .eq('client_id', clientId)
    .maybeSingle();

  if (!existingInvoice) {
    const invNumber = await generateDocNumber('invoice', settings.invoice_prefix || 'INV');
    const issueDate = addDaysISO(todayISO(), -20);
    const dueDate = addDaysISO(issueDate, settings.default_invoice_due_days || 14);

    const invItems = [
      { description: 'Demolition — remove old bathroom & kitchen fixtures', category: 'Demolition', unit: 'lump sum', quantity: 1, rate_cents: toCents(2400), taxable: true },
      { description: 'Site cleanup & dumpster rental', category: 'Cleanup & Disposal', unit: 'lump sum', quantity: 1, rate_cents: toCents(850), taxable: false },
      { description: 'Framing & carpentry — new bathroom layout', category: 'Framing & Carpentry', unit: 'hour', quantity: 36, rate_cents: toCents(75), taxable: true },
      { description: 'Drywall installation & finishing', category: 'Drywall', unit: 'square foot', quantity: 480, rate_cents: toCents(4.25), taxable: true },
      { description: 'Interior painting — walls & ceiling', category: 'Painting', unit: 'square foot', quantity: 620, rate_cents: toCents(1.5), taxable: true },
      { description: 'Porcelain tile installation — bathroom floor', category: 'Tiling', unit: 'square foot', quantity: 120, rate_cents: toCents(8.0), taxable: true },
      { description: 'Hardwood flooring — living & dining room', category: 'Flooring', unit: 'square foot', quantity: 540, rate_cents: toCents(6.5), taxable: true },
      { description: 'Electrical — rough-in, outlets & lighting', category: 'Electrical', unit: 'lump sum', quantity: 1, rate_cents: toCents(3800), taxable: true },
      { description: 'Plumbing — bathroom & kitchen rough-in', category: 'Plumbing', unit: 'lump sum', quantity: 1, rate_cents: toCents(2900), taxable: true },
    ];

    let subtotal = 0;
    let taxableSub = 0;
    const itemRows = invItems.map((it, i) => {
      const lineTotal = calcLineTotal(it.quantity, it.rate_cents);
      subtotal += lineTotal;
      if (it.taxable) taxableSub += lineTotal;
      return {
        description: it.description,
        category: it.category,
        unit: it.unit,
        quantity: it.quantity,
        rate_cents: it.rate_cents,
        taxable: it.taxable,
        line_total_cents: lineTotal,
        sort_order: i,
      };
    });

    const taxRate = settings.default_tax_rate || 13;
    const taxCents = Math.round((taxableSub * taxRate) / 100);
    const totalCents = subtotal + taxCents;

    const { data: inv, error: ie } = await supabase
      .from('documents')
      .insert({
        doc_type: 'invoice' as DocType,
        number: invNumber,
        client_id: clientId,
        client_name: 'Demo Client Inc.',
        client_contact: 'Demo Contact',
        client_phone: '(000) 000-0000',
        client_email: 'client@example.com',
        project_name: 'Bathroom & Living Area Renovation — Phase 1',
        project_type: 'Residential',
        billing_address: 'Demo Billing Address, Ontario, Canada',
        job_site_address: 'Demo Job-Site Address, Ontario, Canada',
        issue_date: issueDate,
        valid_until: null,
        due_date: dueDate,
        status: 'partially_paid',
        subtotal_cents: subtotal,
        discount_type: 'fixed',
        discount_value: 0,
        discount_cents: 0,
        tax_rate: taxRate,
        tax_cents: taxCents,
        total_cents: totalCents,
        deposit_cents: 0,
        notes: 'Thank you for your business. Please remit payment by the due date.',
        exclusions: '',
        terms: settings.default_terms || '',
        internal_notes: '',
        quote_id: quoteId,
      })
      .select()
      .single();
    if (ie) throw ie;

    await supabase.from('document_items').insert(
      itemRows.map((r) => ({ ...r, document_id: inv.id })),
    );

    // Record a partial payment (~50%)
    const paymentAmount = Math.round(totalCents * 0.5);
    await supabase.from('payments').insert({
      invoice_id: inv.id,
      payment_date: addDaysISO(issueDate, 5),
      amount_cents: paymentAmount,
      method: 'E-transfer',
      reference_number: 'ET-20260801',
      note: 'Deposit payment as per agreement',
    });
  }
}

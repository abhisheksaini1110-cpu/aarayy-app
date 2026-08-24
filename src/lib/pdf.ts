import type { BusinessSettings, DocumentWithItems } from './types';
import { formatMoney, formatDate, fromCents } from './utils';

function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, '<br/>');
}

interface PDFOptions {
  settings: BusinessSettings;
  doc: DocumentWithItems;
  paymentsTotalCents: number;
}

export function buildDocumentHTML({ settings, doc, paymentsTotalCents }: PDFOptions): string {
  const isQuote = doc.doc_type === 'quote';
  const title = isQuote ? 'QUOTE' : 'INVOICE';
  const currency = settings.currency || 'CAD';
  const paidCents = paymentsTotalCents;
  const balanceCents = Math.max(0, doc.total_cents - paidCents);

  const logoHtml = settings.logo_url
    ? `<img src="${escapeHtml(settings.logo_url)}" style="max-height:72px;max-width:240px;object-fit:contain;" />`
    : '';

  const rowsHtml = doc.items
    .map(
      (it, i) => `
    <tr class="${i % 2 === 1 ? 'alt' : ''}">
      <td class="desc">${escapeHtml(it.description)}</td>
      <td class="center">${escapeHtml(it.category)}</td>
      <td class="num">${it.quantity}</td>
      <td class="center">${escapeHtml(it.unit)}</td>
      <td class="num">${formatMoney(it.rate_cents, currency)}</td>
      <td class="num">${it.taxable ? 'Yes' : 'No'}</td>
      <td class="num bold">${formatMoney(it.line_total_cents, currency)}</td>
    </tr>`,
    )
    .join('');

  const dateLabel = isQuote ? 'Valid Until' : 'Due Date';
  const dateValue = isQuote ? doc.valid_until : doc.due_date;

  const paymentsHtml =
    !isQuote && paidCents > 0
      ? `<tr><td class="label" colspan="2">Payments Received</td><td class="num">-${formatMoney(paidCents, currency)}</td></tr>`
      : '';
  const balanceHtml =
    !isQuote
      ? `<tr class="balance-row"><td class="label" colspan="2">Balance Due</td><td class="num">${formatMoney(balanceCents, currency)}</td></tr>`
      : isQuote && doc.deposit_cents > 0
        ? `<tr class="balance-row"><td class="label" colspan="2">Deposit Required</td><td class="num">${formatMoney(doc.deposit_cents, currency)}</td></tr>`
        : '';

  const notesHtml = doc.notes
    ? `<div class="section"><h3>Notes</h3><p>${nl2br(doc.notes)}</p></div>`
    : '';
  const exclusionsHtml = doc.exclusions
    ? `<div class="section"><h3>Exclusions</h3><p>${nl2br(doc.exclusions)}</p></div>`
    : '';
  const paymentHtml =
    !isQuote && doc.terms
      ? `<div class="section"><h3>Payment Instructions</h3><p>${nl2br(settings.payment_instructions || doc.terms)}</p></div>`
      : '';
  const termsHtml = doc.terms
    ? `<div class="section"><h3>Terms &amp; Conditions</h3><p>${nl2br(doc.terms)}</p></div>`
    : '';

  const taxRegHtml = settings.tax_reg_number
    ? `<div>Tax Reg #: ${escapeHtml(settings.tax_reg_number)}</div>`
    : '';

  const businessContact = [
    settings.phone,
    settings.email,
    settings.website,
    settings.address,
  ]
    .filter(Boolean)
    .map((s) => `<div>${escapeHtml(s)}</div>`)
    .join('');

  const clientBlock = `
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${escapeHtml(doc.client_name)}</div>
      ${doc.client_contact ? `<div>${escapeHtml(doc.client_contact)}</div>` : ''}
      ${doc.client_phone ? `<div>${escapeHtml(doc.client_phone)}</div>` : ''}
      ${doc.client_email ? `<div>${escapeHtml(doc.client_email)}</div>` : ''}
      ${doc.billing_address ? `<div>${nl2br(doc.billing_address)}</div>` : ''}
    </div>`;

  const jobSiteBlock = doc.job_site_address
    ? `
    <div class="party">
      <div class="party-label">Job Site</div>
      <div>${nl2br(doc.job_site_address)}</div>
    </div>`
    : '';

  const projectNameHtml = doc.project_name
    ? `<div class="project"><span class="project-label">Project:</span> ${escapeHtml(doc.project_name)}${doc.project_type ? ` <span class="project-type">(${escapeHtml(doc.project_type)})</span>` : ''}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)} ${escapeHtml(doc.number)}</title>
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937; margin: 0; padding: 0; font-size: 12px; line-height: 1.5;
  }
  .page { max-width: 8.5in; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
  .header-left .biz-name { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 2px; }
  .header-left .biz-tagline { font-size: 11px; font-weight: 600; color: #c2410c; margin-bottom: 4px; letter-spacing: 0.3px; }
  .header-left .biz-contact { font-size: 11px; color: #4b5563; }
  .header-right { text-align: right; }
  .doc-title { font-size: 32px; font-weight: 800; letter-spacing: 2px; color: #c2410c; }
  .doc-number { font-size: 14px; font-weight: 600; color: #374151; margin-top: 4px; }
  .meta-table { margin-top: 12px; font-size: 11px; }
  .meta-table td { padding: 2px 0; }
  .meta-table .lbl { color: #6b7280; padding-right: 8px; text-align: right; }
  .meta-table .val { font-weight: 600; }
  .parties { display: flex; gap: 24px; margin-bottom: 24px; }
  .party { flex: 1; }
  .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 4px; }
  .party-name { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
  .project { margin-bottom: 20px; padding: 10px 14px; background: #faf7f2; border-left: 3px solid #c2410c; font-size: 12px; }
  .project-label { font-weight: 700; color: #6b7280; }
  .project-type { font-weight: 600; color: #c2410c; font-size: 11px; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.items th {
    background: #1f2937; color: #fff; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.5px; padding: 8px 10px; text-align: left;
  }
  table.items th.center, table.items td.center { text-align: center; }
  table.items th.num, table.items td.num { text-align: right; }
  table.items td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  table.items td.bold { font-weight: 600; }
  table.items tr.alt td { background: #faf9f7; }
  .totals { width: 320px; margin-left: auto; margin-bottom: 24px; }
  .totals table { width: 100%; }
  .totals td { padding: 5px 0; font-size: 12px; }
  .totals .label { color: #4b5563; }
  .totals .num { text-align: right; font-weight: 500; }
  .totals .balance-row td { border-top: 2px solid #1f2937; padding-top: 10px; font-size: 14px; font-weight: 700; color: #c2410c; }
  .totals .balance-row .num { color: #c2410c; }
  .section { margin-bottom: 16px; }
  .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 0 0 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .section p { font-size: 11px; color: #374151; margin: 0; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div class="biz-name">${escapeHtml(settings.business_name || 'AARAYY Flooring Inc.')}</div>
      <div class="biz-tagline">Residential &amp; Commercial Renovations</div>
      <div class="biz-contact">
        ${settings.owner_name ? `<div>${escapeHtml(settings.owner_name)}</div>` : ''}
        ${businessContact}
        ${taxRegHtml}
      </div>
    </div>
    <div class="header-right">
      <div class="doc-title">${title}</div>
      <div class="doc-number">${escapeHtml(doc.number)}</div>
      <table class="meta-table">
        <tr><td class="lbl">Date:</td><td class="val">${formatDate(doc.issue_date)}</td></tr>
        ${dateValue ? `<tr><td class="lbl">${dateLabel}:</td><td class="val">${formatDate(dateValue)}</td></tr>` : ''}
        <tr><td class="lbl">Status:</td><td class="val">${escapeHtml(doc.status.replace('_', ' '))}</td></tr>
        ${doc.quote_id ? `<tr><td class="lbl">From Quote:</td><td class="val">—</td></tr>` : ''}
      </table>
    </div>
  </div>

  <div class="parties">
    ${clientBlock}
    ${jobSiteBlock}
  </div>

  ${projectNameHtml}

  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="center">Category</th>
        <th class="num">Qty</th>
        <th class="center">Unit</th>
        <th class="num">Rate</th>
        <th class="center">Tax</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" class="center">No line items</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td class="label">Subtotal</td><td class="num">${formatMoney(doc.subtotal_cents, currency)}</td></tr>
      ${doc.discount_cents > 0 ? `<tr><td class="label">Discount${doc.discount_type === 'percent' ? ` (${doc.discount_value}%)` : ''}</td><td class="num">-${formatMoney(doc.discount_cents, currency)}</td></tr>` : ''}
      <tr><td class="label">${escapeHtml(settings.tax_label || 'Tax')} (${doc.tax_rate}%)</td><td class="num">${formatMoney(doc.tax_cents, currency)}</td></tr>
      <tr><td class="label">Total</td><td class="num bold">${formatMoney(doc.total_cents, currency)}</td></tr>
      ${paymentsHtml}
      ${balanceHtml}
    </table>
  </div>

  ${notesHtml}
  ${exclusionsHtml}
  ${paymentHtml}
  ${termsHtml}

  <div class="footer">${escapeHtml(settings.footer_message || 'Thank you for your business.')}</div>
</div>
</body>
</html>`;
}

export function openPrintWindow(html: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert('Please allow popups to print or download documents.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  return w;
}

export function printDocument(doc: DocumentWithItems, settings: BusinessSettings, paymentsTotalCents: number) {
  const html = buildDocumentHTML({ settings, doc, paymentsTotalCents });
  const w = openPrintWindow(html);
  if (w) {
    setTimeout(() => {
      w.print();
    }, 500);
  }
}

export function downloadPDF(doc: DocumentWithItems, settings: BusinessSettings, paymentsTotalCents: number) {
  const html = buildDocumentHTML({ settings, doc, paymentsTotalCents });
  const w = openPrintWindow(html);
  if (w) {
    setTimeout(() => {
      w.print();
    }, 500);
  }
}

export function buildShareMessage(doc: DocumentWithItems, settings: BusinessSettings): string {
  const isQuote = doc.doc_type === 'quote';
  const title = isQuote ? 'quote' : 'invoice';
  const amount = formatMoney(doc.total_cents, settings.currency);
  const biz = settings.business_name || 'our company';

  if (isQuote) {
    return `Hello ${doc.client_name},\n\nHere is your quote from ${biz}.\n\nQuote #: ${doc.number}\nProject: ${doc.project_name}\nAmount: ${amount}\nValid until: ${formatDate(doc.valid_until)}\n\nPlease review and let us know if you have any questions. We look forward to working with you.\n\n${settings.business_name}\n${settings.phone}\n${settings.email}`;
  }
  return `Hello ${doc.client_name},\n\nHere is your invoice from ${biz}.\n\nInvoice #: ${doc.number}\nProject: ${doc.project_name}\nAmount: ${amount}\nDue date: ${formatDate(doc.due_date)}\n\nThank you for your business.\n\n${settings.business_name}\n${settings.phone}\n${settings.email}`;
}

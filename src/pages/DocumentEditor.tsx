import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Copy,
  Printer,
  Share2,
  Receipt,
  X,
  MessageSquare,
} from 'lucide-react';
import {
  fetchDocument,
  saveDocument,
  generateDocNumber,
  deleteDocument,
  convertQuoteToInvoice,
  addPayment,
  deletePayment,
  fetchClients,
  upsertClient,
  fetchCatalogue,
  fetchSettings,
} from '@/lib/db';
import type {
  DocumentRow,
  DocumentWithItems,
  Client,
  CatalogueItem,
  DocType,
  ItemCategory,
  ProjectType,
  PaymentMethod,
  Payment,
  BusinessSettings,
} from '@/lib/types';
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  Badge,
  statusColor,
  statusLabel,
  LoadingScreen,
} from '@/components/ui';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import {
  formatMoney,
  formatDate,
  calcTotals,
  calcLineTotal,
  toCents,
  fromCents,
  todayISO,
  addDaysISO,
  isOverdue,
  copyToClipboard,
} from '@/lib/utils';
import { printDocument, buildShareMessage } from '@/lib/pdf';

const CATEGORIES: ItemCategory[] = [
  'General Renovation',
  'Demolition',
  'Flooring',
  'Tiling',
  'Painting',
  'Drywall',
  'Framing & Carpentry',
  'Kitchen Renovation',
  'Bathroom Renovation',
  'Basement Renovation',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing & Exterior',
  'Concrete & Masonry',
  'Equipment',
  'Subcontractor',
  'Cleanup & Disposal',
  'Permits',
  'Materials',
  'Labour',
  'Other',
];
const UNITS = ['hour', 'day', 'each', 'square foot', 'linear foot', 'lump sum', 'custom'];
const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Cheque',
  'E-transfer',
  'Credit Card',
  'Bank Transfer',
  'Other',
];

interface EditorItem {
  id?: string;
  description: string;
  category: ItemCategory;
  unit: string;
  quantity: number;
  rate_cents: number;
  taxable: boolean;
}

interface Props {
  docId: string | null; // null = new
  docType: DocType;
  onBack: () => void;
  onOpenDoc: (doc: DocumentRow) => void;
}

export function DocumentEditor({ docId, docType, onBack, onOpenDoc }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<DocumentWithItems | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [number, setNumber] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [clientInfo, setClientInfo] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    billing_address: '',
    job_site_address: '',
  });
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType | ''>('');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState<EditorItem[]>([]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(13);
  const [notes, setNotes] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [terms, setTerms] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [depositCents, setDepositCents] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [convertConfirm, setConvertConfirm] = useState(false);
  const [voidConfirm, setVoidConfirm] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [shareText, setShareText] = useState('');
  const { toast } = useToast();
  const isInvoice = docType === 'invoice';
  const isQuote = docType === 'quote';

  // Load data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, c, cat] = await Promise.all([fetchSettings(), fetchClients(), fetchCatalogue()]);
        if (cancelled) return;
        setSettings(s);
        setClients(c);
        setCatalogue(cat);

        if (docId) {
          const d = await fetchDocument(docId);
          if (cancelled) return;
          if (!d) {
            toast('Document not found', 'error');
            onBack();
            return;
          }
          setDoc(d);
          setNumber(d.number);
          setClientId(d.client_id ?? '');
          setClientInfo({
            name: d.client_name,
            contact_person: d.client_contact,
            phone: d.client_phone,
            email: d.client_email,
            billing_address: d.billing_address,
            job_site_address: d.job_site_address,
          });
          setProjectName(d.project_name);
          setProjectType(d.project_type ?? '');
          setIssueDate(d.issue_date);
          setValidUntil(d.valid_until ?? '');
          setDueDate(d.due_date ?? '');
          setStatus(d.status);
          setItems(
            d.items.map((it) => ({
              id: it.id,
              description: it.description,
              category: it.category as ItemCategory,
              unit: it.unit,
              quantity: it.quantity,
              rate_cents: it.rate_cents,
              taxable: it.taxable,
            })),
          );
          setDiscountType(d.discount_type);
          setDiscountValue(d.discount_value);
          setTaxRate(d.tax_rate);
          setNotes(d.notes);
          setExclusions(d.exclusions);
          setTerms(d.terms);
          setInternalNotes(d.internal_notes);
          setDepositCents(d.deposit_cents);
          setPayments(d.payments ?? []);
        } else {
          // New doc — generate number and defaults
          const num = await generateDocNumber(docType, s?.[docType === 'quote' ? 'quote_prefix' : 'invoice_prefix'] ?? (docType === 'quote' ? 'Q' : 'INV'));
          if (cancelled) return;
          setNumber(num);
          setTaxRate(s?.default_tax_rate ?? 13);
          setTerms(s?.default_terms ?? '');
          setExclusions(s?.default_exclusions ?? '');
          if (isQuote) {
            setValidUntil(addDaysISO(todayISO(), s?.default_quote_validity_days ?? 30));
          } else {
            setDueDate(addDaysISO(todayISO(), s?.default_invoice_due_days ?? 14));
          }
        }
      } catch (e) {
        toast('Failed to load document', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [docId, docType]);

  // Track dirty
  const markDirty = () => setDirty(true);

  // Calculate totals
  const totals = useMemo(() => {
    return calcTotals(
      items,
      discountType,
      discountValue,
      taxRate,
      payments.reduce((s, p) => s + p.amount_cents, 0),
    );
  }, [items, discountType, discountValue, taxRate, payments]);

  const overdue = isInvoice && isOverdue(dueDate, status);

  // Client selection
  function handleClientChange(id: string) {
    setClientId(id);
    markDirty();
    if (!id) return;
    const c = clients.find((cl) => cl.id === id);
    if (c) {
      setClientInfo({
        name: c.name,
        contact_person: c.contact_person,
        phone: c.phone,
        email: c.email,
        billing_address: c.billing_address,
        job_site_address: c.job_site_address,
      });
    }
  }

  // Item management
  function addCatalogueItem(cat: CatalogueItem) {
    setItems([
      ...items,
      {
        description: cat.description,
        category: cat.category,
        unit: cat.unit,
        quantity: 1,
        rate_cents: toCents(cat.rate),
        taxable: cat.taxable,
      },
    ]);
    markDirty();
    setShowAddItem(false);
  }

  function addCustomItem() {
    setItems([
      ...items,
      { description: '', category: 'Materials', unit: 'each', quantity: 1, rate_cents: 0, taxable: true },
    ]);
    markDirty();
    setShowAddItem(false);
  }

  function updateItem(index: number, patch: Partial<EditorItem>) {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    setItems(next);
    markDirty();
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
    markDirty();
  }

  // Save
  async function handleSave(newStatus?: string) {
    if (!clientInfo.name.trim()) {
      toast('Client name is required', 'error');
      return;
    }
    if (items.length === 0) {
      toast('Add at least one line item', 'error');
      return;
    }
    if (taxRate < 0) {
      toast('Tax rate cannot be negative', 'error');
      return;
    }
    if (discountValue < 0) {
      toast('Discount cannot be negative', 'error');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveDocument({
        id: docId ?? undefined,
        doc_type: docType,
        number,
        client_id: clientId || null,
        client_name: clientInfo.name,
        client_contact: clientInfo.contact_person,
        client_phone: clientInfo.phone,
        client_email: clientInfo.email,
        project_name: projectName,
        project_type: projectType || null,
        billing_address: clientInfo.billing_address,
        job_site_address: clientInfo.job_site_address,
        issue_date: issueDate,
        valid_until: isQuote ? validUntil || null : null,
        due_date: isInvoice ? dueDate || null : null,
        status: newStatus ?? status,
        discount_type: discountType,
        discount_value: discountValue,
        tax_rate: taxRate,
        notes,
        exclusions,
        terms,
        internal_notes: internalNotes,
        quote_id: doc?.quote_id ?? null,
        items: items.map((it) => ({
          id: it.id,
          description: it.description,
          category: it.category,
          unit: it.unit,
          quantity: Math.max(0, it.quantity),
          rate_cents: Math.max(0, it.rate_cents),
          taxable: it.taxable,
        })),
        deposit_cents: isQuote ? depositCents : 0,
      });
      setDirty(false);
      toast(docId ? 'Document updated' : 'Document created');
      if (!docId) {
        onOpenDoc(saved);
      } else {
        // reload
        const d = await fetchDocument(saved.id);
        if (d) {
          setDoc(d);
          setPayments(d.payments ?? []);
        }
      }
    } catch (e) {
      toast('Failed to save document', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Status change
  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    markDirty();
    if (docId) {
      try {
        await saveDocument({
          id: docId,
          doc_type: docType,
          number,
          client_id: clientId || null,
          client_name: clientInfo.name,
          client_contact: clientInfo.contact_person,
          client_phone: clientInfo.phone,
          client_email: clientInfo.email,
          project_name: projectName,
          project_type: projectType || null,
          billing_address: clientInfo.billing_address,
          job_site_address: clientInfo.job_site_address,
          issue_date: issueDate,
          valid_until: isQuote ? validUntil || null : null,
          due_date: isInvoice ? dueDate || null : null,
          status: newStatus,
          discount_type: discountType,
          discount_value: discountValue,
          tax_rate: taxRate,
          notes,
          exclusions,
          terms,
          internal_notes: internalNotes,
          quote_id: doc?.quote_id ?? null,
          items: items.map((it) => ({
            id: it.id,
            description: it.description,
            category: it.category,
            unit: it.unit,
            quantity: Math.max(0, it.quantity),
            rate_cents: Math.max(0, it.rate_cents),
            taxable: it.taxable,
          })),
          deposit_cents: isQuote ? depositCents : 0,
        });
        toast(`Status changed to ${statusLabel(newStatus)}`);
      } catch {
        toast('Failed to change status', 'error');
        setStatus(status);
      }
    }
  }

  // Delete
  async function handleDelete() {
    if (!docId) return;
    try {
      await deleteDocument(docId);
      toast('Document deleted');
      onBack();
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  // Void
  async function handleVoid() {
    setVoidConfirm(false);
    await handleStatusChange('void');
  }

  // Duplicate
  async function handleDuplicate() {
    setDuplicateConfirm(false);
    try {
      const newNum = await generateDocNumber(docType, settings?.[docType === 'quote' ? 'quote_prefix' : 'invoice_prefix'] ?? (docType === 'quote' ? 'Q' : 'INV'));
      const saved = await saveDocument({
        doc_type: docType,
        number: newNum,
        client_id: clientId || null,
        client_name: clientInfo.name,
        client_contact: clientInfo.contact_person,
        client_phone: clientInfo.phone,
        client_email: clientInfo.email,
        project_name: projectName,
        project_type: projectType || null,
        billing_address: clientInfo.billing_address,
        job_site_address: clientInfo.job_site_address,
        issue_date: todayISO(),
        valid_until: isQuote ? addDaysISO(todayISO(), settings?.default_quote_validity_days ?? 30) : null,
        due_date: isInvoice ? addDaysISO(todayISO(), settings?.default_invoice_due_days ?? 14) : null,
        status: 'draft',
        discount_type: discountType,
        discount_value: discountValue,
        tax_rate: taxRate,
        notes,
        exclusions,
        terms,
        internal_notes: '',
        quote_id: null,
        items: items.map((it) => ({
          description: it.description,
          category: it.category,
          unit: it.unit,
          quantity: it.quantity,
          rate_cents: it.rate_cents,
          taxable: it.taxable,
        })),
        deposit_cents: isQuote ? depositCents : 0,
      });
      toast('Document duplicated');
      onOpenDoc(saved);
    } catch {
      toast('Failed to duplicate', 'error');
    }
  }

  // Convert quote to invoice
  async function handleConvert() {
    setConvertConfirm(false);
    try {
      const inv = await convertQuoteToInvoice(docId!);
      toast('Quote converted to invoice');
      onOpenDoc(inv);
    } catch {
      toast('Failed to convert quote', 'error');
    }
  }

  // Print / PDF
  function handlePrint() {
    if (!settings) return;
    const originalQuoteId = doc?.quote_id ?? null;
    const docForPrint: DocumentWithItems = {
      ...(doc ?? {
        id: docId ?? '',
        doc_type: docType,
        number,
        client_id: clientId || null,
        client_name: clientInfo.name,
        client_contact: clientInfo.contact_person,
        client_phone: clientInfo.phone,
        client_email: clientInfo.email,
        project_name: projectName,
        project_type: projectType || null,
        billing_address: clientInfo.billing_address,
        job_site_address: clientInfo.job_site_address,
        issue_date: issueDate,
        valid_until: validUntil || null,
        due_date: dueDate || null,
        status,
        subtotal_cents: totals.subtotalCents,
        discount_type: discountType,
        discount_value: discountValue,
        discount_cents: totals.discountCents,
        tax_rate: taxRate,
        tax_cents: totals.taxCents,
        total_cents: totals.totalCents,
        deposit_cents: isQuote ? depositCents : 0,
        notes,
        exclusions,
        terms,
        internal_notes: internalNotes,
        quote_id: originalQuoteId,
        created_by: null,
        created_at: '',
        updated_at: '',
      }),
      items: items.map((it, i) => ({
        id: it.id ?? '',
        document_id: docId ?? '',
        description: it.description,
        category: it.category,
        unit: it.unit,
        quantity: it.quantity,
        rate_cents: it.rate_cents,
        taxable: it.taxable,
        line_total_cents: calcLineTotal(it.quantity, it.rate_cents),
        sort_order: i,
      })),
      payments,
    };
    printDocument(docForPrint, settings, payments.reduce((s, p) => s + p.amount_cents, 0));
  }

  // Share
  function handleShare() {
    const docForShare: DocumentWithItems = {
      ...(doc ?? ({} as DocumentRow)),
      number,
      client_name: clientInfo.name,
      project_name: projectName,
      project_type: projectType || null,
      total_cents: totals.totalCents,
      valid_until: validUntil || null,
      due_date: dueDate || null,
    } as DocumentWithItems;
    const text = buildShareMessage(docForShare, settings ?? ({} as BusinessSettings));
    setShareText(text);
    setShowShare(true);
  }

  async function copyShare() {
    await copyToClipboard(shareText);
    toast('Sharing message copied to clipboard');
    setShowShare(false);
  }

  // Payment
  async function handleAddPayment(amount: number, method: PaymentMethod, refNum: string, payDate: string, note: string) {
    if (!docId) {
      toast('Save the invoice before recording payments', 'error');
      return;
    }
    if (amount <= 0) {
      toast('Payment amount must be positive', 'error');
      return;
    }
    const amountCents = toCents(amount);
    const remaining = totals.totalCents - payments.reduce((s, p) => s + p.amount_cents, 0);
    if (amountCents > remaining) {
      toast('Payment exceeds remaining balance', 'error');
      return;
    }
    try {
      const p = await addPayment({
        invoice_id: docId,
        payment_date: payDate,
        amount_cents: amountCents,
        method,
        reference_number: refNum,
        note,
      });
      setPayments([p, ...payments]);
      toast('Payment recorded');
      setShowPayment(false);
      // reload doc to get updated status
      const d = await fetchDocument(docId);
      if (d) {
        setDoc(d);
        setStatus(d.status);
        setPayments(d.payments ?? []);
      }
    } catch {
      toast('Failed to record payment', 'error');
    }
  }

  async function handleDeletePayment(p: Payment) {
    try {
      await deletePayment(p.id, p.invoice_id);
      setPayments(payments.filter((x) => x.id !== p.id));
      toast('Payment removed');
      const d = await fetchDocument(p.invoice_id);
      if (d) {
        setDoc(d);
        setStatus(d.status);
        setPayments(d.payments ?? []);
      }
    } catch {
      toast('Failed to remove payment', 'error');
    }
  }

  // Unsaved changes warning
  function handleBack() {
    if (dirty) {
      setLeaveConfirm(true);
    } else {
      onBack();
    }
  }

  if (loading) return <LoadingScreen message="Loading document..." />;

  const title = isQuote ? 'Quote' : 'Invoice';
  const statuses = isQuote
    ? ['draft', 'sent', 'accepted', 'declined', 'expired']
    : ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {docId ? `${title} ${number}` : `New ${title}`}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge color={overdue ? 'red' : statusColor(status)}>
                {overdue ? 'Overdue' : statusLabel(status)}
              </Badge>
              {doc?.quote_id && isInvoice && (
                <span className="text-xs text-gray-400">Converted from quote</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" /> Share
          </Button>
          {docId && (
            <Button variant="outline" size="sm" onClick={() => setDuplicateConfirm(true)}>
              <Copy className="w-4 h-4" /> Duplicate
            </Button>
          )}
          {isQuote && docId && status === 'accepted' && (
            <Button size="sm" onClick={() => setConvertConfirm(true)}>
              <Receipt className="w-4 h-4" /> Convert to Invoice
            </Button>
          )}
          <Button size="sm" onClick={() => handleSave()} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <Card className="p-3 mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500">Status:</span>
        <Select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-40"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        {isInvoice && status !== 'void' && status !== 'paid' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 ml-auto"
            onClick={() => setVoidConfirm(true)}
          >
            Void Invoice
          </Button>
        )}
        {docId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        )}
      </Card>

      {/* Client & project info */}
      <Card className="p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Client &amp; Project</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client</label>
            <div className="flex gap-2">
              <Select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="flex-1"
              >
                <option value="">— Select client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button variant="outline" size="sm" onClick={() => setShowNewClient(true)} type="button">
                <Plus className="w-4 h-4" /> New
              </Button>
            </div>
          </div>
          <div>
            <Input
              label="Project Name"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                markDirty();
              }}
              placeholder="e.g. Main Floor Renovation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Type</label>
            <select
              value={projectType}
              onChange={(e) => {
                setProjectType(e.target.value as ProjectType | '');
                markDirty();
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            >
              <option value="">— Select —</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <Input
            label="Client / Company Name"
            value={clientInfo.name}
            onChange={(e) => {
              setClientInfo({ ...clientInfo, name: e.target.value });
              markDirty();
            }}
            placeholder="Client name"
          />
          <Input
            label="Contact Person"
            value={clientInfo.contact_person}
            onChange={(e) => {
              setClientInfo({ ...clientInfo, contact_person: e.target.value });
              markDirty();
            }}
          />
          <Input
            label="Phone"
            value={clientInfo.phone}
            onChange={(e) => {
              setClientInfo({ ...clientInfo, phone: e.target.value });
              markDirty();
            }}
          />
          <Input
            label="Email"
            value={clientInfo.email}
            onChange={(e) => {
              setClientInfo({ ...clientInfo, email: e.target.value });
              markDirty();
            }}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <Textarea
            label="Billing Address"
            rows={2}
            value={clientInfo.billing_address}
            onChange={(e) => {
              setClientInfo({ ...clientInfo, billing_address: e.target.value });
              markDirty();
            }}
          />
          <Textarea
            label="Job-Site Address"
            rows={2}
            value={clientInfo.job_site_address}
            onChange={(e) => {
              setClientInfo({ ...clientInfo, job_site_address: e.target.value });
              markDirty();
            }}
          />
        </div>
      </Card>

      {/* Dates */}
      <Card className="p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Dates</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Issue Date"
            type="date"
            value={issueDate}
            onChange={(e) => {
              setIssueDate(e.target.value);
              markDirty();
            }}
          />
          {isQuote ? (
            <Input
              label="Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => {
                setValidUntil(e.target.value);
                markDirty();
              }}
            />
          ) : (
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                markDirty();
              }}
            />
          )}
          <Input
            label="Document Number"
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
              markDirty();
            }}
          />
        </div>
      </Card>

      {/* Line items */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddItem(true)}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            No items yet. Click "Add Item" to add from your catalogue or create a custom one.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-2 py-2">Description</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-2 py-2 w-32">Category</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-2 py-2 w-20">Qty</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-2 py-2 w-24">Unit</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-2 py-2 w-28">Rate</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-2 py-2 w-16">Tax</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-2 py-2 w-28">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-2 py-1.5">
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(i, { description: e.target.value })}
                          className="w-full rounded-md border border-transparent hover:border-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 px-2 py-1.5 text-sm"
                          placeholder="Item description"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(i, { category: e.target.value as ItemCategory })}
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.unit}
                          onChange={(e) => updateItem(i, { unit: e.target.value })}
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fromCents(item.rate_cents)}
                          onChange={(e) => updateItem(i, { rate_cents: toCents(parseFloat(e.target.value) || 0) })}
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.taxable}
                          onChange={(e) => updateItem(i, { taxable: e.target.checked })}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right text-sm font-semibold text-gray-900">
                        {formatMoney(calcLineTotal(item.quantity, item.rate_cents), settings?.currency)}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => removeItem(i)}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                          aria-label="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {items.map((item, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                      placeholder="Item description"
                    />
                    <button
                      onClick={() => removeItem(i)}
                      className="ml-2 p-1 rounded text-gray-400 hover:text-red-600"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(i, { category: e.target.value as ItemCategory })}
                      className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.unit}
                      onChange={(e) => updateItem(i, { unit: e.target.value })}
                      className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                      placeholder="unit"
                    />
                    <div>
                      <label className="text-xs text-gray-400">Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Rate ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fromCents(item.rate_cents)}
                        onChange={(e) => updateItem(i, { rate_cents: toCents(parseFloat(e.target.value) || 0) })}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={item.taxable}
                        onChange={(e) => updateItem(i, { taxable: e.target.checked })}
                        className="w-4 h-4 rounded text-orange-600"
                      />
                      Taxable
                    </label>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatMoney(calcLineTotal(item.quantity, item.rate_cents), settings?.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Totals */}
      <Card className="p-5 mb-4">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Discount Type"
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value as 'fixed' | 'percent');
                  markDirty();
                }}
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percent">Percentage</option>
              </Select>
              <Input
                label={discountType === 'percent' ? 'Discount (%)' : 'Discount ($)'}
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => {
                  setDiscountValue(parseFloat(e.target.value) || 0);
                  markDirty();
                }}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label={`Tax Rate (%) — ${settings?.tax_label ?? 'HST'}`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => {
                  setTaxRate(parseFloat(e.target.value) || 0);
                  markDirty();
                }}
              />
              {isQuote && (
                <Input
                  label="Deposit Required ($)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fromCents(depositCents)}
                  onChange={(e) => {
                    setDepositCents(toCents(parseFloat(e.target.value) || 0));
                    markDirty();
                  }}
                />
              )}
            </div>
          </div>
          <div className="md:w-72">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">{formatMoney(totals.subtotalCents, settings?.currency)}</span>
              </div>
              {totals.discountCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-medium text-red-600">-{formatMoney(totals.discountCents, settings?.currency)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{settings?.tax_label ?? 'HST'} ({taxRate}%)</span>
                <span className="font-medium text-gray-900">{formatMoney(totals.taxCents, settings?.currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatMoney(totals.totalCents, settings?.currency)}</span>
              </div>
              {isInvoice && payments.length > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payments</span>
                    <span className="font-medium text-green-600">-{formatMoney(totals.paidCents, settings?.currency)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Balance Due</span>
                    <span className={`font-bold ${totals.remainingCents > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatMoney(totals.remainingCents, settings?.currency)}
                    </span>
                  </div>
                </>
              )}
              {isQuote && depositCents > 0 && (
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Deposit Required</span>
                  <span className="font-bold text-orange-600">{formatMoney(depositCents, settings?.currency)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Payments (invoice only) */}
      {isInvoice && (
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Payments</h2>
            {status !== 'void' && status !== 'paid' && (
              <Button size="sm" variant="outline" onClick={() => setShowPayment(true)}>
                <Plus className="w-4 h-4" /> Record Payment
              </Button>
            )}
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No payments recorded yet</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatMoney(p.amount_cents, settings?.currency)}
                      <span className="text-gray-500 font-normal ml-2">via {p.method}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(p.payment_date)}
                      {p.reference_number && ` · Ref: ${p.reference_number}`}
                      {p.note && ` · ${p.note}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePayment(p)}
                    className="p-1 rounded text-gray-400 hover:text-red-600"
                    aria-label="Delete payment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Notes */}
      <Card className="p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Additional Information</h2>
        <div className="space-y-4">
          <Textarea
            label="Notes (visible to customer)"
            rows={2}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              markDirty();
            }}
          />
          <Textarea
            label="Exclusions"
            rows={2}
            value={exclusions}
            onChange={(e) => {
              setExclusions(e.target.value);
              markDirty();
            }}
          />
          <Textarea
            label="Terms & Conditions"
            rows={3}
            value={terms}
            onChange={(e) => {
              setTerms(e.target.value);
              markDirty();
            }}
          />
          <Textarea
            label="Internal Notes (not shown on PDF)"
            rows={2}
            value={internalNotes}
            onChange={(e) => {
              setInternalNotes(e.target.value);
              markDirty();
            }}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-2 pb-4">
        <Button variant="outline" onClick={handleBack}>
          Cancel
        </Button>
        <Button onClick={() => handleSave()} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Document'}
        </Button>
      </div>

      {/* Modals */}
      {showNewClient && (
        <NewClientModal
          onClose={() => setShowNewClient(false)}
          onCreated={(c) => {
            setClients([...clients, c]);
            setClientId(c.id);
            setClientInfo({
              name: c.name,
              contact_person: c.contact_person,
              phone: c.phone,
              email: c.email,
              billing_address: c.billing_address,
              job_site_address: c.job_site_address,
            });
            markDirty();
            setShowNewClient(false);
          }}
        />
      )}

      {showAddItem && (
        <AddItemModal
          catalogue={catalogue}
          onClose={() => setShowAddItem(false)}
          onAddCatalogue={addCatalogueItem}
          onAddCustom={addCustomItem}
        />
      )}

      {showPayment && (
        <PaymentModal
          maxAmount={fromCents(totals.totalCents - payments.reduce((s, p) => s + p.amount_cents, 0))}
          onClose={() => setShowPayment(false)}
          onSave={handleAddPayment}
        />
      )}

      {showShare && (
        <Modal open onClose={() => setShowShare(false)} title="Share Message" size="lg">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Copy this professional message to share with your client via email or text.
            </p>
            <textarea
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowShare(false)}>
                Close
              </Button>
              <Button onClick={copyShare}>
                <MessageSquare className="w-4 h-4" /> Copy to Clipboard
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Document"
        message={`Are you sure you want to delete ${title} ${number}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
      <ConfirmDialog
        open={convertConfirm}
        title="Convert to Invoice"
        message="This creates a new invoice with the same details. The original quote is preserved."
        confirmLabel="Convert"
        onConfirm={handleConvert}
        onCancel={() => setConvertConfirm(false)}
      />
      <ConfirmDialog
        open={voidConfirm}
        title="Void Invoice"
        message="Voiding this invoice marks it as cancelled. This cannot be reversed."
        confirmLabel="Void"
        danger
        onConfirm={handleVoid}
        onCancel={() => setVoidConfirm(false)}
      />
      <ConfirmDialog
        open={duplicateConfirm}
        title="Duplicate Document"
        message="Creates a copy as a new draft with a new document number."
        confirmLabel="Duplicate"
        onConfirm={handleDuplicate}
        onCancel={() => setDuplicateConfirm(false)}
      />
      <ConfirmDialog
        open={leaveConfirm}
        title="Unsaved Changes"
        message="You have unsaved changes. Leave without saving?"
        confirmLabel="Leave"
        danger
        onConfirm={onBack}
        onCancel={() => setLeaveConfirm(false)}
      />
    </div>
  );
}

// ===== New Client Modal =====
function NewClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Client) => void;
}) {
  const [form, setForm] = useState<Partial<Client>>({ name: '', contact_person: '', phone: '', email: '', billing_address: '', job_site_address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  async function handleCreate() {
    if (!form.name?.trim()) {
      setError('Client name is required');
      return;
    }
    setSaving(true);
    try {
      const c = await upsertClient({
        name: form.name!.trim(),
        contact_person: form.contact_person?.trim() || '',
        phone: form.phone?.trim() || '',
        email: form.email?.trim() || '',
        billing_address: form.billing_address?.trim() || '',
        job_site_address: form.job_site_address?.trim() || '',
      });
      toast('Client created');
      onCreated(c);
    } catch {
      setError('Failed to create client');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New Client" size="lg">
      <div className="space-y-4">
        <Input
          label="Client / Company Name *"
          value={form.name ?? ''}
          error={error}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Contact Person"
            value={form.contact_person ?? ''}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone ?? ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <Input
          label="Email"
          value={form.email ?? ''}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Textarea
          label="Billing Address"
          rows={2}
          value={form.billing_address ?? ''}
          onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
        />
        <Textarea
          label="Job-Site Address"
          rows={2}
          value={form.job_site_address ?? ''}
          onChange={(e) => setForm({ ...form, job_site_address: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ===== Add Item Modal =====
function AddItemModal({
  catalogue,
  onClose,
  onAddCatalogue,
  onAddCustom,
}: {
  catalogue: CatalogueItem[];
  onClose: () => void;
  onAddCatalogue: (item: CatalogueItem) => void;
  onAddCustom: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = catalogue.filter((c) =>
    c.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal open onClose={onClose} title="Add Line Item" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search catalogue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={onAddCustom}>
            <Plus className="w-4 h-4" /> Custom Item
          </Button>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {catalogue.length === 0
              ? 'No catalogue items yet. Add a custom item instead.'
              : 'No matching items.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => onAddCatalogue(item)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-left border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-500">
                    {item.category} · {item.unit} · {item.taxable ? 'Taxable' : 'Non-taxable'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatMoney(toCents(item.rate))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ===== Payment Modal =====
function PaymentModal({
  maxAmount,
  onClose,
  onSave,
}: {
  maxAmount: number;
  onClose: () => void;
  onSave: (amount: number, method: PaymentMethod, refNum: string, date: string, note: string) => void;
}) {
  const [amount, setAmount] = useState(maxAmount > 0 ? maxAmount.toFixed(2) : '');
  const [method, setMethod] = useState<PaymentMethod>('E-transfer');
  const [refNum, setRefNum] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [overpayConfirm, setOverpayConfirm] = useState(false);

  function handleSubmit() {
    const amt = parseFloat(amount) || 0;
    if (amt > maxAmount) {
      setOverpayConfirm(true);
      return;
    }
    onSave(amt, method, refNum, payDate, note);
  }

  return (
    <Modal open onClose={onClose} title="Record Payment" size="md">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Remaining Balance</span>
            <span className="font-semibold text-gray-900">{formatMoney(toCents(maxAmount))}</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Amount ($) *"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Payment Date"
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
        </div>
        <Select
          label="Payment Method"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Input
          label="Reference Number"
          value={refNum}
          onChange={(e) => setRefNum(e.target.value)}
          placeholder="e.g. e-transfer confirmation #"
        />
        <Textarea
          label="Note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Record Payment
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={overpayConfirm}
        title="Payment Exceeds Balance"
        message={`The payment amount is more than the remaining balance of ${formatMoney(toCents(maxAmount))}. Record anyway?`}
        confirmLabel="Record Anyway"
        onConfirm={() => {
          setOverpayConfirm(false);
          onSave(parseFloat(amount) || 0, method, refNum, payDate, note);
        }}
        onCancel={() => setOverpayConfirm(false)}
      />
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Receipt,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import {
  fetchClients,
  upsertClient,
  deleteClient,
  checkDuplicateClient,
  fetchClientStats,
} from '@/lib/db';
import type { Client, DocumentRow } from '@/lib/types';
import {
  Card,
  Button,
  Input,
  Textarea,
  LoadingScreen,
  EmptyState,
  Badge,
  statusColor,
  statusLabel,
} from '@/components/ui';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatMoney, formatDate } from '@/lib/utils';

export function ClientsPage({ onOpenDoc }: { onOpenDoc: (doc: DocumentRow) => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchClients();
      setClients(data);
    } catch {
      toast('Failed to load clients', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.contact_person.toLowerCase().includes(q)
    );
  });

  if (viewing) {
    return (
      <ClientDetail
        client={viewing}
        onBack={() => setViewing(null)}
        onOpenDoc={(d) => {
          setViewing(null);
          onOpenDoc(d);
        }}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} in your directory
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, or contact..."
          className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
        />
      </div>

      {loading ? (
        <LoadingScreen message="Loading clients..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title={search ? 'No matching clients' : 'No clients yet'}
          message={search ? 'Try a different search term.' : 'Add your first client to start creating quotes and invoices.'}
          action={
            !search ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4" /> Add Client
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filtered.map((client) => (
            <Card
              key={client.id}
              className="p-4"
              onClick={() => setViewing(client)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                    {client.contact_person && (
                      <p className="text-xs text-gray-500 truncate">{client.contact_person}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                {client.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {client.phone}
                  </div>
                )}
                {client.billing_address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{client.billing_address}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(client);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(client);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ClientEditor
          client={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Client"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Their quotes and invoices will remain but will no longer be linked to this client.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteClient(deleteTarget.id);
            toast('Client deleted');
            setDeleteTarget(null);
            load();
          } catch {
            toast('Failed to delete client', 'error');
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ClientEditor({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Client>>(
    client ?? { name: '', contact_person: '', phone: '', email: '', billing_address: '', job_site_address: '', notes: '' },
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const { toast } = useToast();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'Client name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setDupWarning(null);
    try {
      const dup = await checkDuplicateClient(form);
      if (dup && !client) {
        setDupWarning(`A client with this email or phone already exists: "${dup.name}"`);
        setSaving(false);
        return;
      }
      await upsertClient({
        ...(client ? { id: client.id } : {}),
        name: form.name!.trim(),
        contact_person: form.contact_person?.trim() || '',
        phone: form.phone?.trim() || '',
        email: form.email?.trim() || '',
        billing_address: form.billing_address?.trim() || '',
        job_site_address: form.job_site_address?.trim() || '',
        notes: form.notes?.trim() || '',
      });
      toast(client ? 'Client updated' : 'Client created');
      onSaved();
    } catch {
      toast('Failed to save client', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={client ? 'Edit Client' : 'New Client'}
      size="lg"
    >
      <div className="space-y-4">
        <Input
          label="Client / Company Name *"
          value={form.name ?? ''}
          error={errors.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Northgate Properties Ltd."
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Contact Person"
            value={form.contact_person ?? ''}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            placeholder="John Smith"
          />
          <Input
            label="Phone"
            value={form.phone ?? ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={form.email ?? ''}
          error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="john@acme.com"
        />
        <Textarea
          label="Billing Address"
          rows={2}
          value={form.billing_address ?? ''}
          onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
          placeholder="123 Main St, Toronto, ON M1M 1M1"
        />
        <Textarea
          label="Job-Site Address"
          rows={2}
          value={form.job_site_address ?? ''}
          onChange={(e) => setForm({ ...form, job_site_address: e.target.value })}
          placeholder="456 Site Rd, Toronto, ON"
        />
        <Textarea
          label="Notes"
          rows={3}
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Internal notes about this client..."
        />
        {dupWarning && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {dupWarning}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : client ? 'Save Changes' : 'Create Client'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ClientDetail({
  client,
  onBack,
  onOpenDoc,
}: {
  client: Client;
  onBack: () => void;
  onOpenDoc: (doc: DocumentRow) => void;
}) {
  const [stats, setStats] = useState<{
    allDocs: DocumentRow[];
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
  } | null>(null);

  useEffect(() => {
    fetchClientStats(client.id).then(setStats).catch(() => {});
  }, [client.id]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </button>

      <Card className="p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            {client.contact_person && (
              <p className="text-sm text-gray-500">{client.contact_person}</p>
            )}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
          {client.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" /> {client.email}
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" /> {client.phone}
            </div>
          )}
          {client.billing_address && (
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" /> {client.billing_address}
            </div>
          )}
          {client.job_site_address && (
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" /> {client.job_site_address}
            </div>
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </Card>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Invoiced</p>
            <p className="text-lg font-bold text-gray-900">{formatMoney(stats.totalInvoiced)}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Paid</p>
            <p className="text-lg font-bold text-green-600">{formatMoney(stats.totalPaid)}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Outstanding</p>
            <p className="text-lg font-bold text-orange-600">{formatMoney(stats.outstanding)}</p>
          </Card>
        </div>
      )}

      <Card className="p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Document History</h2>
        {stats && stats.allDocs.length > 0 ? (
          <div className="space-y-1">
            {stats.allDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onOpenDoc(doc)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      doc.doc_type === 'quote'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-orange-50 text-orange-600'
                    }`}
                  >
                    {doc.doc_type === 'quote' ? (
                      <FileText className="w-4.5 h-4.5" />
                    ) : (
                      <Receipt className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{doc.number}</p>
                    <p className="text-xs text-gray-500">
                      {doc.project_name || 'No project'} · {formatDate(doc.issue_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge color={statusColor(doc.status)}>{statusLabel(doc.status)}</Badge>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatMoney(doc.total_cents)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-6 text-center">No documents yet</p>
        )}
      </Card>
    </div>
  );
}

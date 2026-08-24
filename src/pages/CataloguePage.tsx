import { useEffect, useState } from 'react';
import { Package, Plus, Search, Pencil, Trash2, ListPlus, Loader2 } from 'lucide-react';
import {
  fetchCatalogue,
  upsertCatalogueItem,
  deleteCatalogueItem,
  loadCommonServices,
} from '@/lib/db';
import type { CatalogueItem, ItemCategory } from '@/lib/types';
import {
  Card,
  Button,
  Input,
  Select,
  Textarea,
  LoadingScreen,
  EmptyState,
  Badge,
} from '@/components/ui';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatMoneyValue } from '@/lib/utils';

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

const CATEGORY_COLORS: Record<ItemCategory, 'blue' | 'orange' | 'green' | 'purple' | 'gray' | 'yellow' | 'red'> = {
  'General Renovation': 'blue',
  Demolition: 'gray',
  Flooring: 'orange',
  Tiling: 'orange',
  Painting: 'green',
  Drywall: 'blue',
  'Framing & Carpentry': 'blue',
  'Kitchen Renovation': 'purple',
  'Bathroom Renovation': 'purple',
  'Basement Renovation': 'purple',
  Electrical: 'yellow',
  Plumbing: 'yellow',
  HVAC: 'yellow',
  'Roofing & Exterior': 'green',
  'Concrete & Masonry': 'gray',
  Equipment: 'green',
  Subcontractor: 'purple',
  'Cleanup & Disposal': 'gray',
  Permits: 'red',
  Materials: 'orange',
  Labour: 'blue',
  Other: 'gray',
};

export function CataloguePage() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [editing, setEditing] = useState<CatalogueItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogueItem | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchCatalogue();
      setItems(data);
    } catch {
      toast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLoadCommonServices() {
    setLoadingServices(true);
    try {
      const added = await loadCommonServices();
      toast(
        added > 0
          ? `${added} common construction services added`
          : 'All common services are already in your catalogue',
      );
      await load();
    } catch {
      toast('Failed to add common services', 'error');
    } finally {
      setLoadingServices(false);
    }
  }

  const filtered = items.filter((it) => {
    const q = search.toLowerCase();
    const matchSearch = !q || it.description.toLowerCase().includes(q);
    const matchCat = filterCat === 'all' || it.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items &amp; Services</h1>
          <p className="text-sm text-gray-500 mt-1">
            Reusable catalogue for your quotes and invoices
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleLoadCommonServices} disabled={loadingServices}>
            {loadingServices ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ListPlus className="w-4 h-4" />
            )}
            Add Common Services
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-500/40 focus:border-stone-500"
          />
        </div>
        <Select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="sm:w-48"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <LoadingScreen message="Loading items..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-7 h-7" />}
          title={search || filterCat !== 'all' ? 'No matching items' : 'No items yet'}
          message={
            search || filterCat !== 'all'
              ? 'Try a different search or filter.'
              : 'Add frequently used renovation items and services to speed up quoting.'
          }
          action={
            !search && filterCat === 'all' ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={handleLoadCommonServices} disabled={loadingServices}>
                  {loadingServices ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ListPlus className="w-4 h-4" />
                  )}
                  Add Common Services
                </Button>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <table className="hidden md:table w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Description</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Category</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Unit</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Rate</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Taxable</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-3">
                    <Badge color={CATEGORY_COLORS[item.category]}>{item.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    {formatMoneyValue(item.rate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm ${item.taxable ? 'text-green-600' : 'text-gray-400'}`}>
                      {item.taxable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 flex-1 pr-2">{item.description}</p>
                  <Badge color={CATEGORY_COLORS[item.category]}>{item.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {item.unit} · {item.taxable ? 'Taxable' : 'Non-taxable'}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatMoneyValue(item.rate)}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(creating || editing) && (
        <ItemEditor
          item={editing}
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
        title="Delete Item"
        message={`Delete "${deleteTarget?.description}"? This won't affect existing quotes or invoices.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteCatalogueItem(deleteTarget.id);
            toast('Item deleted');
            setDeleteTarget(null);
            load();
          } catch {
            toast('Failed to delete item', 'error');
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ItemEditor({
  item,
  onClose,
  onSaved,
}: {
  item: CatalogueItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<CatalogueItem>>(
    item ?? { description: '', category: 'General Renovation', unit: 'each', rate: 0, taxable: true },
  );
  const [customUnit, setCustomUnit] = useState(
    item && !UNITS.includes(item.unit) ? item.unit : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  async function handleSave() {
    if (!form.description?.trim()) {
      setError('Description is required');
      return;
    }
    if ((form.rate ?? 0) < 0) {
      setError('Rate cannot be negative');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const unit = form.unit === 'custom' ? customUnit : form.unit;
      await upsertCatalogueItem({
        ...(item ? { id: item.id } : {}),
        description: form.description!.trim(),
        category: (form.category as ItemCategory) ?? 'Other',
        unit: unit || 'each',
        rate: Math.max(0, form.rate ?? 0),
        taxable: form.taxable ?? true,
      });
      toast(item ? 'Item updated' : 'Item created');
      onSaved();
    } catch {
      toast('Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Edit Item' : 'New Item'} size="lg">
      <div className="space-y-4">
        <Textarea
          label="Description *"
          rows={2}
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g. Hardwood flooring install, drywall finishing, demolition & removal..."
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            value={form.category ?? 'Other'}
            onChange={(e) => setForm({ ...form, category: e.target.value as ItemCategory })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Unit"
            value={form.unit ?? 'each'}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u === 'custom' ? 'Custom...' : u}
              </option>
            ))}
          </Select>
        </div>
        {form.unit === 'custom' && (
          <Input
            label="Custom Unit"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            placeholder="e.g. cubic yard"
          />
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Default Rate ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.rate ?? 0}
            onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Taxable</label>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setForm({ ...form, taxable: true })}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  form.taxable
                    ? 'bg-stone-700 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, taxable: false })}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  !form.taxable
                    ? 'bg-stone-700 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                No
              </button>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : item ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

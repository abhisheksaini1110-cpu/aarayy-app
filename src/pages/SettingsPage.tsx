import { useEffect, useState, useRef } from 'react';
import { Settings, Upload, Trash2, Save, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { fetchSettings, upsertSettings } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { BusinessSettings } from '@/lib/types';
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  LoadingScreen,
} from '@/components/ui';
import { ConfirmDialog } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { loadDemoData } from '@/lib/demo';

export function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Partial<BusinessSettings>>({});
  const [demoConfirm, setDemoConfirm] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s);
        setForm(s ?? {});
      })
      .catch(() => toast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await upsertSettings(form);
      setSettings(saved);
      toast('Settings saved');
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      setForm({ ...form, logo_url: urlData.publicUrl });
      toast('Logo uploaded');
    } catch {
      toast('Failed to upload logo', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    setForm({ ...form, logo_url: null });
    toast('Logo removed');
  }

  async function handleLoadDemo() {
    setDemoLoading(true);
    try {
      await loadDemoData();
      toast('Demo data loaded');
      setDemoConfirm(false);
    } catch (e) {
      toast('Failed to load demo data', 'error');
    } finally {
      setDemoLoading(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading settings..." />;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            These details appear on all your quotes and invoices
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      {/* Logo */}
      <Card className="p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Business Logo</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Settings className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoUpload(f);
                e.target.value = '';
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Logo
            </Button>
            {form.logo_url && (
              <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleRemoveLogo}>
                <Trash2 className="w-4 h-4" /> Remove
              </Button>
            )}
            <p className="text-xs text-gray-400">PNG, JPG, or SVG. Max 2MB.</p>
          </div>
        </div>
      </Card>

      {/* Business info */}
      <Card className="p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Business Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Business Name *"
            value={form.business_name ?? ''}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            placeholder="AARAYY Flooring Inc."
          />
          <Input
            label="Owner / Contact Name"
            value={form.owner_name ?? ''}
            onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            placeholder="John Smith"
          />
          <Input
            label="Phone"
            value={form.phone ?? ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
          <Input
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="info@business.com"
          />
          <Input
            label="Website"
            value={form.website ?? ''}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="www.business.com"
          />
          <Input
            label="Tax Registration #"
            value={form.tax_reg_number ?? ''}
            onChange={(e) => setForm({ ...form, tax_reg_number: e.target.value })}
            placeholder="123456789 RT0001"
          />
        </div>
        <Textarea
          className="mt-4"
          label="Business Address"
          rows={2}
          value={form.address ?? ''}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="123 Industrial Way, Toronto, ON M1M 1M1"
        />
      </Card>

      {/* Tax & currency */}
      <Card className="p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Tax &amp; Currency</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Select
            label="Currency"
            value={form.currency ?? 'CAD'}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="CAD">CAD ($)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </Select>
          <Input
            label="Tax Label"
            value={form.tax_label ?? ''}
            onChange={(e) => setForm({ ...form, tax_label: e.target.value })}
            placeholder="HST"
          />
          <Input
            label="Default Tax Rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.default_tax_rate ?? 13}
            onChange={(e) => setForm({ ...form, default_tax_rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </Card>

      {/* Defaults */}
      <Card className="p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Document Defaults</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Quote Validity (days)"
            type="number"
            min="1"
            value={form.default_quote_validity_days ?? 30}
            onChange={(e) => setForm({ ...form, default_quote_validity_days: parseInt(e.target.value) || 30 })}
          />
          <Input
            label="Invoice Payment Period (days)"
            type="number"
            min="1"
            value={form.default_invoice_due_days ?? 14}
            onChange={(e) => setForm({ ...form, default_invoice_due_days: parseInt(e.target.value) || 14 })}
          />
          <Input
            label="Quote # Prefix"
            value={form.quote_prefix ?? 'Q'}
            onChange={(e) => setForm({ ...form, quote_prefix: e.target.value })}
            placeholder="Q"
          />
          <Input
            label="Invoice # Prefix"
            value={form.invoice_prefix ?? 'INV'}
            onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
            placeholder="INV"
          />
        </div>
        <Textarea
          label="Default Terms & Conditions"
          rows={3}
          value={form.default_terms ?? ''}
          onChange={(e) => setForm({ ...form, default_terms: e.target.value })}
          placeholder="Payment due within 14 days of invoice date..."
        />
        <Textarea
          className="mt-4"
          label="Default Exclusions"
          rows={2}
          value={form.default_exclusions ?? ''}
          onChange={(e) => setForm({ ...form, default_exclusions: e.target.value })}
          placeholder="Excludes permits, hazardous material removal..."
        />
        <Textarea
          className="mt-4"
          label="Payment Instructions"
          rows={2}
          value={form.payment_instructions ?? ''}
          onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
          placeholder="Please e-transfer to..."
        />
        <Textarea
          className="mt-4"
          label="Footer Message"
          rows={2}
          value={form.footer_message ?? ''}
          onChange={(e) => setForm({ ...form, footer_message: e.target.value })}
          placeholder="Thank you for your business."
        />
      </Card>

      {/* Demo data */}
      <Card className="p-5 border-orange-200 bg-orange-50/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Load Demo Data</h2>
            <p className="text-sm text-gray-600 mb-3">
              Adds a sample client, quote, partially paid invoice, and several renovation line items
              so you can explore the app. You can delete them anytime.
            </p>
            <Button variant="outline" onClick={() => setDemoConfirm(true)} disabled={demoLoading}>
              {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Load Demo Data
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Changes
        </Button>
      </div>

      <ConfirmDialog
        open={demoConfirm}
        title="Load Demo Data"
        message="This will add a sample client, quote, invoice with a partial payment, and catalogue items. Continue?"
        confirmLabel="Load Demo"
        onConfirm={handleLoadDemo}
        onCancel={() => setDemoConfirm(false)}
      />
    </div>
  );
}

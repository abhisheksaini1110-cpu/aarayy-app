import { useEffect, useState } from 'react';
import {
  DollarSign,
  FileText,
  Receipt,
  AlertTriangle,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { fetchDashboardData } from '@/lib/db';
import { formatMoney, formatDate, isOverdue } from '@/lib/utils';
import { Card, LoadingScreen, EmptyState, Button } from '@/components/ui';
import type { DocumentRow } from '@/lib/types';

interface DashboardData {
  invoices: DocumentRow[];
  quotes: DocumentRow[];
  totalPaid: number;
  outstanding: number;
  openQuoteValue: number;
  acceptedQuoteValue: number;
  overdueCount: number;
  overdueInvoices: DocumentRow[];
  months: { label: string; invoiced: number; paid: number }[];
}

export function DashboardPage({
  onNewQuote,
  onNewInvoice,
  onOpenDoc,
}: {
  onNewQuote: () => void;
  onNewInvoice: () => void;
  onOpenDoc: (doc: DocumentRow) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading dashboard..." />;
  if (!data) return <EmptyState icon={<FileText />} title="No data yet" message="Create your first renovation quote or invoice to see dashboard insights." />;

  const recentDocs = [...data.invoices, ...data.quotes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const maxMonth = Math.max(...data.months.map((m) => Math.max(m.invoiced, m.paid)), 1);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Renovation business overview at a glance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNewQuote}>
            <Plus className="w-4 h-4" /> New Quote
          </Button>
          <Button onClick={onNewInvoice}>
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          label="Outstanding Balance"
          value={formatMoney(data.outstanding)}
          icon={<DollarSign className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          label="Total Paid"
          value={formatMoney(data.totalPaid)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Open Quote Value"
          value={formatMoney(data.openQuoteValue)}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Overdue Invoices"
          value={String(data.overdueCount)}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent documents */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Documents</h2>
          {recentDocs.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No documents yet</p>
          ) : (
            <div className="space-y-1">
              {recentDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onOpenDoc(doc)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
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
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.number}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {doc.client_name || 'No client'} · {formatDate(doc.issue_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatMoney(doc.total_cents)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Monthly summary */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Invoiced vs Paid (6 months)
          </h2>
          <div className="flex items-end justify-between gap-2 h-40">
            {data.months.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-1/2 max-w-[20px] bg-orange-400 rounded-t transition-all"
                    style={{ height: `${(m.invoiced / maxMonth) * 100}%` }}
                    title={`Invoiced: ${formatMoney(m.invoiced)}`}
                  />
                  <div
                    className="w-1/2 max-w-[20px] bg-green-500 rounded-t transition-all"
                    style={{ height: `${(m.paid / maxMonth) * 100}%` }}
                    title={`Paid: ${formatMoney(m.paid)}`}
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-medium">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-400" />
              <span className="text-gray-600">Invoiced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-gray-600">Paid</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Overdue invoices */}
      {data.overdueInvoices.length > 0 && (
        <Card className="p-5 mt-4 md:mt-6 border-red-200">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900">Overdue Invoices</h2>
          </div>
          <div className="space-y-1">
            {data.overdueInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => onOpenDoc(inv)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                  <p className="text-xs text-gray-500">
                    {inv.client_name} · Due {formatDate(inv.due_date)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  {formatMoney(inv.total_cents)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'orange' | 'green' | 'blue' | 'red';
}) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
    </Card>
  );
}

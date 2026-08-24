import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Search,
  ArrowRight,
  FileText,
  Receipt,
  ArrowUpDown,
} from 'lucide-react';
import { fetchDocuments } from '@/lib/db';
import type { DocumentRow, DocType } from '@/lib/types';
import {
  Card,
  Button,
  Select,
  Input,
  LoadingScreen,
  EmptyState,
  Badge,
  statusColor,
  statusLabel,
} from '@/components/ui';
import { formatMoney, formatDate, isOverdue } from '@/lib/utils';

type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest';

export function DocumentList({
  docType,
  onNew,
  onOpen,
}: {
  docType: DocType;
  onNew: () => void;
  onOpen: (doc: DocumentRow) => void;
}) {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');

  useEffect(() => {
    fetchDocuments(docType)
      .then(setDocs)
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, [docType]);

  const filtered = useMemo(() => {
    let result = [...docs];
    const q = search.toLowerCase();
    if (q) {
      result = result.filter(
        (d) =>
          d.number.toLowerCase().includes(q) ||
          d.client_name.toLowerCase().includes(q) ||
          d.project_name.toLowerCase().includes(q) ||
          d.billing_address.toLowerCase().includes(q) ||
          d.job_site_address.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        result = result.filter((d) => isOverdue(d.due_date, d.status));
      } else {
        result = result.filter((d) => d.status === statusFilter);
      }
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      let start: Date;
      if (dateFilter === 'week') start = new Date(now.getTime() - 7 * 86400000);
      else if (dateFilter === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (dateFilter === 'year') start = new Date(now.getFullYear(), 0, 1);
      else start = new Date(0);
      result = result.filter((d) => new Date(d.issue_date) >= start);
    }
    switch (sort) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'highest':
        result.sort((a, b) => b.total_cents - a.total_cents);
        break;
      case 'lowest':
        result.sort((a, b) => a.total_cents - b.total_cents);
        break;
    }
    return result;
  }, [docs, search, statusFilter, dateFilter, sort]);

  const statuses =
    docType === 'quote'
      ? ['draft', 'sent', 'accepted', 'declined', 'expired']
      : ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'];

  const title = docType === 'quote' ? 'Quotes' : 'Invoices';
  const Icon = docType === 'quote' ? FileText : Receipt;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {docs.length} {docs.length === 1 ? 'document' : 'documents'} total
          </p>
        </div>
        <Button onClick={onNew}>
          <Plus className="w-4 h-4" /> New {docType === 'quote' ? 'Quote' : 'Invoice'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, client, project, address..."
            className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-40"
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
          {docType === 'invoice' && <option value="overdue">Overdue</option>}
        </Select>
        <Select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="sm:w-36"
        >
          <option value="all">All Dates</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </Select>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="sm:w-40"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Value</option>
          <option value="lowest">Lowest Value</option>
        </Select>
      </div>

      {loading ? (
        <LoadingScreen message={`Loading ${title.toLowerCase()}...`} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Icon className="w-7 h-7" />}
          title={search || statusFilter !== 'all' ? 'No matching documents' : `No ${title.toLowerCase()} yet`}
          message={
            search || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : docType === 'quote'
                ? 'Create your first quote to start tracking jobs.'
                : 'Create your first invoice to start tracking payments.'
          }
          action={
            !search && statusFilter === 'all' ? (
              <Button onClick={onNew}>
                <Plus className="w-4 h-4" /> New {docType === 'quote' ? 'Quote' : 'Invoice'}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="overflow-hidden hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Number</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Project</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const overdue = isOverdue(doc.due_date, doc.status);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => onOpen(doc)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{doc.client_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">
                        {doc.project_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(doc.issue_date)}</td>
                      <td className="px-4 py-3">
                        <Badge color={overdue ? 'red' : statusColor(doc.status)}>
                          {overdue ? 'Overdue' : statusLabel(doc.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        {formatMoney(doc.total_cents)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((doc) => {
              const overdue = isOverdue(doc.due_date, doc.status);
              return (
                <Card key={doc.id} className="p-4" onClick={() => onOpen(doc)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{doc.number}</p>
                      <p className="text-xs text-gray-500">{formatDate(doc.issue_date)}</p>
                    </div>
                    <Badge color={overdue ? 'red' : statusColor(doc.status)}>
                      {overdue ? 'Overdue' : statusLabel(doc.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 font-medium mb-0.5">{doc.client_name || 'No client'}</p>
                  {doc.project_name && <p className="text-xs text-gray-500 mb-2">{doc.project_name}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">Total</span>
                    <span className="text-base font-bold text-gray-900">{formatMoney(doc.total_cents)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

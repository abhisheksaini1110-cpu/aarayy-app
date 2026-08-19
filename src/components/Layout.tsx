import { type ReactNode, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Package,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchSettings } from '@/lib/db';
import type { BusinessSettings } from '@/lib/types';

export type PageKey =
  | 'dashboard'
  | 'quotes'
  | 'invoices'
  | 'clients'
  | 'catalogue'
  | 'settings';

interface LayoutProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

const navItems: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'quotes', label: 'Quotes', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'catalogue', label: 'Items & Services', icon: Package },
  { key: 'settings', label: 'Business Settings', icon: Settings },
];

export function Layout({ current, onNavigate, children }: LayoutProps) {
  const { signOut } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    const refreshBrand = () => fetchSettings().then(setSettings).catch(() => undefined);
    refreshBrand();
    window.addEventListener('aarayy:settings-updated', refreshBrand);
    return () => window.removeEventListener('aarayy:settings-updated', refreshBrand);
  }, []);

  const brandName = settings?.business_name?.trim() || 'AARAYY Flooring Inc.';

  const BrandMark = ({ mobile = false }: { mobile?: boolean }) =>
    settings?.logo_url ? (
      <img
        src={settings.logo_url}
        alt={`${brandName} logo`}
        className={`${mobile ? 'w-9 h-9' : 'w-10 h-10'} rounded-full object-contain bg-white`}
      />
    ) : (
      <div className={`${mobile ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm'} rounded-full border border-stone-400 bg-stone-50 text-stone-700 flex items-center justify-center font-serif tracking-tight`}>
        AA
      </div>
    );

  return (
    <div className="min-h-screen bg-[#faf7f2] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3 px-4 h-[72px] border-b border-gray-100">
          <BrandMark />
          <div className="min-w-0">
            <div className="font-serif text-[13px] tracking-[0.08em] text-stone-900 truncate">{brandName}</div>
            <div className="text-[9px] uppercase tracking-[0.13em] text-stone-500 mt-0.5">Residential &amp; Commercial Renovations</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-stone-100 text-stone-800'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-stone-700' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark mobile />
            <div className="min-w-0">
              <div className="font-serif text-xs tracking-[0.08em] text-stone-900 truncate">{brandName}</div>
              <div className="text-[8px] uppercase tracking-[0.11em] text-stone-500">Renovations</div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
          <div className="grid grid-cols-5">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`flex flex-col items-center justify-center py-2.5 gap-0.5 ${
                    active ? 'text-stone-700' : 'text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none">
                    {item.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

import { type ReactNode } from 'react';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Package,
  Settings,
  LogOut,
  HardHat,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

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

  return (
    <div className="min-h-screen bg-[#faf7f2] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">AARAYY</span>
          <span className="text-[10px] text-gray-400 font-medium leading-tight">Renovations</span>
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
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-orange-600' : 'text-gray-400'}`} />
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
              <HardHat className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">AARAYY</span>
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
                    active ? 'text-orange-600' : 'text-gray-400'
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

import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`w-5 h-5 animate-spin ${className}`} />;
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner className="w-8 h-8 text-stone-700" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-4">{message}</p>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-stone-700 text-white hover:bg-stone-800 shadow-sm',
    secondary: 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  color = 'gray',
}: {
  children: ReactNode;
  color?: 'gray' | 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'purple';
}) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-stone-200 text-stone-800',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}

export function statusColor(status: string): 'gray' | 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'purple' {
  switch (status) {
    case 'draft':
      return 'gray';
    case 'sent':
      return 'blue';
    case 'accepted':
      return 'green';
    case 'declined':
      return 'red';
    case 'expired':
      return 'yellow';
    case 'partially_paid':
      return 'orange';
    case 'paid':
      return 'green';
    case 'overdue':
      return 'red';
    case 'void':
      return 'gray';
    default:
      return 'gray';
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Input({
  label,
  error,
  className = '',
  ...props
}: { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500/40 focus:border-stone-500 transition-colors ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className = '',
  ...props
}: { label?: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500/40 focus:border-stone-500 transition-colors resize-y ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  className = '',
  children,
  ...props
}: { label?: string; error?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-500/40 focus:border-stone-500 transition-colors ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}


import React from 'react';
import { LucideIcon, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info' | 'danger';
  surface?: 'tinted' | 'plain';
  loading?: boolean;
  delta?: string; // e.g., "7.2%" or "1.7%"
  deltaTone?: 'up' | 'down'; // controls color of delta text
}

const variantColors: Record<
  NonNullable<StatCardProps['variant']>,
  { edge: string; icon: string }
> = {
  default: { edge: 'from-[#800000] to-[#982B1C]', icon: 'text-[#800000]' }, // Dark maroon to muted red
  primary: { edge: 'from-[#800000] to-[#982B1C]', icon: 'text-[#800000]' }, // Maroon palette
  success: { edge: 'from-[#22c55e] to-[#16a34a]', icon: 'text-[#15803d]' }, // Keep green for success
  warning: { edge: 'from-[#f59e0b] to-[#fbbf24]', icon: 'text-[#c2410c]' }, // Keep amber for warnings
  info: { edge: 'from-[#982B1C] to-[#b85a3d]', icon: 'text-[#982B1C]' }, // Muted red palette
  danger: { edge: 'from-[#ef4444] to-[#dc2626]', icon: 'text-[#b91c1c]' }, // Keep red for danger
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  variant = 'default',
  loading = false,
  delta,
  deltaTone = 'up',
}) => {
  const colors = variantColors[variant];

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-slate-200 bg-white',
        'shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)]'
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-[10px] bg-gradient-to-b', colors.edge)} aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.06),transparent_40%)]" aria-hidden />

      <div className="relative flex items-center gap-6 px-6 py-6">
        <div className={cn('flex h-16 w-16 items-center justify-center text-5xl', colors.icon)}>
          <Icon className="h-12 w-12" strokeWidth={1.4} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-slate-700 leading-tight">{title}</p>
          {loading ? (
            <div className="mt-3 h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
          ) : (
            <p className="mt-3 text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">{value}</p>
          )}
          {delta && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
                deltaTone === 'down' ? 'text-rose-600' : 'text-emerald-600'
              )}
            >
              {deltaTone === 'down' ? (
                <ArrowDownRight className="h-4 w-4" strokeWidth={2} />
              ) : (
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              )}
              <span>{delta}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;

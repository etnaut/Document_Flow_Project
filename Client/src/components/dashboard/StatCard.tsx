import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
  surface?: 'tinted' | 'plain';
}

const variantStyles = {
  default: 'bg-card border-border',
  primary: 'bg-primary/5 border-primary/20',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
  info: 'bg-info/5 border-info/20',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, variant = 'default', surface = 'tinted' }) => {
  return (
    <div
      className={cn(
        'rounded-xl border p-6 shadow-card transition-all duration-300 hover:shadow-elevated animate-fade-in backdrop-blur-md',
        surface === 'plain' ? 'bg-card border-border' : variantStyles[variant]
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <p className="text-base font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-4xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn('rounded-xl p-3', iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;

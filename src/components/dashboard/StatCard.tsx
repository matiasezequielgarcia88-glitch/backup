import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'default' | 'primary' | 'accent';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  variant = 'default',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'stat-card animate-fade-in',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'accent' && 'bg-accent text-accent-foreground',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              'text-sm font-medium',
              variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
            )}
          >
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p
              className={cn(
                'text-sm',
                variant === 'default' ? 'text-muted-foreground' : 'opacity-70'
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              <span className={trend.isPositive ? 'text-success' : 'text-destructive'}>
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className={variant === 'default' ? 'text-muted-foreground' : 'opacity-60'}>
                vs mes anterior
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            variant === 'default' && 'bg-secondary text-secondary-foreground',
            variant === 'primary' && 'bg-primary-foreground/20 text-primary-foreground',
            variant === 'accent' && 'bg-accent-foreground/20 text-accent-foreground'
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

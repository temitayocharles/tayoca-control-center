import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TrendData {
  value: number;
  isPositiveGood?: boolean;
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  color?: 'default' | 'success' | 'error' | 'warning';
  trend?: TrendData;
  onClick?: () => void;
}

const iconTints: Record<NonNullable<StatCardProps['color']>, string> = {
  default: 'text-neutral-500 bg-neutral-100 dark:text-neutral-300 dark:bg-neutral-800',
  success: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10',
  error: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10',
  warning: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
};

const dotColors = {
  default: 'bg-neutral-300 dark:bg-neutral-600',
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  suffix,
  icon: Icon,
  color = 'default',
  trend,
  onClick,
}) => {
  const displayValue = suffix === '%' ? value.toFixed(1) : value;

  const getTrendColor = () => {
    if (!trend || trend.value === 0) return 'text-neutral-400';
    const isPositive = trend.value > 0;
    const isGood = trend.isPositiveGood !== false ? isPositive : !isPositive;
    return isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500';
  };

  const formatTrend = () => {
    if (!trend) return null;
    const prefix = trend.value > 0 ? '+' : '';
    return suffix === '%' ? `${prefix}${trend.value.toFixed(1)}%` : `${prefix}${trend.value}`;
  };

  const baseClasses = "app-card p-5 text-left w-full";
  const interactiveClasses = onClick ? "app-card-hover" : "";

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className={`p-2 rounded-xl ${iconTints[color]}`}>
          <Icon size={17} />
        </span>
        {color !== 'default' && (
          <span className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
        )}
      </div>
      <p className="text-[1.9rem] leading-none font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
        {displayValue}
        {suffix && <span className="ml-0.5 text-base font-semibold text-neutral-400 dark:text-neutral-500">{suffix}</span>}
      </p>
      <div className="flex items-center gap-2 mt-2.5">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
        {trend && trend.value !== 0 && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold ${getTrendColor()}`}>
            {trend.value > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {formatTrend()}
          </span>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} ${interactiveClasses}`}>
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import type { Execution } from '../types';

type TimeRange = 7 | 14 | 30;

interface ExecutionChartProps {
  executions: Execution[];
  isLoading?: boolean;
}

export const ExecutionChart: React.FC<ExecutionChartProps> = ({ executions, isLoading }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(7);

  const chartData = useMemo(() => {
    const data = [];

    for (let i = timeRange - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dayExecutions = executions.filter((e) =>
        isSameDay(new Date(e.startedAt), date)
      );
      const success = dayExecutions.filter((e) => e.status === 'success').length;
      const error = dayExecutions.filter((e) => e.status === 'error').length;

      data.push({
        date: format(date, timeRange > 14 ? 'M/d' : 'MMM d'),
        success,
        error,
        total: success + error,
      });
    }

    return data;
  }, [executions, timeRange]);

  const hasData = chartData.some((d) => d.total > 0);

  const timeRangeOptions: TimeRange[] = [7, 14, 30];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="h-8 w-36 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
        </div>
        <div className="h-40 animate-pulse">
          <div className="h-full flex items-end gap-1 px-6">
            {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-brand-200 dark:bg-brand-900 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between px-6 mt-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="w-8 h-3 bg-neutral-200 dark:bg-neutral-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 p-1">
          {timeRangeOptions.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-brand-500 dark:text-brand-950'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart or Empty State */}
      {!hasData ? (
        <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="text-2xl">▁▂▄</span>
          No execution data for the past {timeRange} days
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="successArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e8f7d" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#1e8f7d" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9a8a74' }}
                axisLine={false}
                tickLine={false}
                interval={timeRange > 14 ? 'preserveStartEnd' : 0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9a8a74' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-neutral-950)',
                  border: '1px solid var(--color-neutral-700)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'var(--color-neutral-50)',
                  boxShadow: '0 12px 30px -18px rgba(0,0,0,0.5)',
                }}
                labelStyle={{ color: 'var(--color-neutral-400)' }}
              />
              <Area
                type="monotone"
                dataKey="success"
                stroke="#1e8f7d"
                strokeWidth={2}
                fill="url(#successArea)"
                name="Success"
              />
              <Area
                type="monotone"
                dataKey="error"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#errorArea)"
                name="Errors"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

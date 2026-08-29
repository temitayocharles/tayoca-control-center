import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700 ${className}`} />
);

export const SkeletonText: React.FC<{ width?: string }> = ({ width = 'w-24' }) => (
  <Skeleton className={`h-4 ${width}`} />
);

export const SkeletonCard: React.FC = () => (
  <div className="app-card p-5">
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr className="border-b border-neutral-200 dark:border-neutral-800">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-5 py-4">
        <Skeleton className={`h-4 ${i === 0 ? 'w-8' : i === 1 ? 'w-40' : 'w-20'}`} />
      </td>
    ))}
  </tr>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="app-card overflow-hidden">
    <table className="app-table">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}><Skeleton className="h-3 w-16" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  </div>
);

export const SkeletonStatCard: React.FC = () => (
  <div className="app-card p-5">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <Skeleton className="h-3 w-8" />
    </div>
    <Skeleton className="h-9 w-24" />
    <Skeleton className="h-3 w-28 mt-3" />
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="app-card divide-y divide-neutral-100 dark:divide-neutral-800">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="px-5 py-4 flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

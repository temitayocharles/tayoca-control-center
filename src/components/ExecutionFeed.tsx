import React, { useState, useMemo, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import type { Execution } from '../types';
import { formatDistanceToNow } from '../utils/date';
import { exportExecutionsToCSV, exportExecutionsToJSON } from '../utils/export';

type StatusFilter = 'all' | 'success' | 'error' | 'running';

interface ExecutionFeedProps {
  executions: Execution[];
  isLoading?: boolean;
  onExecutionClick?: (execution: Execution) => void;
  itemsPerPage?: number;
  showFilter?: boolean;
  showPagination?: boolean;
}

const statusConfig = {
  success: { dotClass: 'bg-emerald-500', label: 'Success' },
  error: { dotClass: 'bg-red-500', label: 'Failed' },
  running: { dotClass: 'bg-brand-500 animate-pulse', label: 'Running' },
  waiting: { dotClass: 'bg-amber-500', label: 'Waiting' },
};

const formatDuration = (startedAt: string, stoppedAt: string | null): string => {
  if (!stoppedAt) return '...';
  const start = new Date(startedAt).getTime();
  const end = new Date(stoppedAt).getTime();
  const duration = end - start;

  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  return `${Math.floor(duration / 60000)}m ${Math.round((duration % 60000) / 1000)}s`;
};

export const ExecutionFeed: React.FC<ExecutionFeedProps> = ({
  executions,
  isLoading,
  onExecutionClick,
  itemsPerPage = 10,
  showFilter = true,
  showPagination = true,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const filteredExecutions = useMemo(() => {
    if (statusFilter === 'all') return executions;
    return executions.filter((e) => e.status === statusFilter);
  }, [executions, statusFilter]);

  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  const paginatedExecutions = filteredExecutions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="app-card divide-y divide-neutral-100 dark:divide-neutral-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-5 py-2.5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="flex-1">
                <div className="h-3.5 w-28 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
              <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="app-card px-4 py-10 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <Clock size={24} className="text-neutral-400 dark:text-neutral-500" />
        </span>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No executions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter and Export */}
      {showFilter && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
            <Filter size={14} />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="app-select !py-1.5 !text-xs flex-1"
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="error">Failed</option>
            <option value="running">Running</option>
          </select>
          <button
            onClick={() => exportExecutionsToCSV(filteredExecutions)}
            className="app-btn app-btn-secondary !py-1.5 !px-2.5 !text-xs"
            title="Export to CSV"
          >
            CSV
          </button>
          <button
            onClick={() => exportExecutionsToJSON(filteredExecutions)}
            className="app-btn app-btn-secondary !py-1.5 !px-2.5 !text-xs"
            title="Export to JSON"
          >
            JSON
          </button>
        </div>
      )}

      {filteredExecutions.length === 0 ? (
        <div className="app-card px-4 py-10 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            <Filter size={24} className="text-neutral-400 dark:text-neutral-500" />
          </span>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No {statusFilter} executions
          </p>
        </div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="!px-3 !py-2 w-7"></th>
                  <th className="!px-3 !py-2">Workflow</th>
                  <th className="!px-3 !py-2 text-right">Duration</th>
                  <th className="!px-3 !py-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExecutions.map((exec) => {
                  const status = statusConfig[exec.status] || statusConfig.waiting;

                  return (
                    <tr
                      key={exec.id}
                      onClick={() => onExecutionClick?.(exec)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                    >
                      {/* Status */}
                      <td className="!px-3 !py-2">
                        <span className={`h-2 w-2 rounded-full inline-block ${status.dotClass}`} />
                      </td>

                      {/* Workflow Name */}
                      <td className="!px-3 !py-2">
                        <span className="block max-w-[180px] truncate text-sm font-medium text-neutral-900 dark:text-white">
                          {exec.workflowName || `Workflow ${exec.workflowId}`}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="!px-3 !py-2 text-right">
                        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                          {formatDuration(exec.startedAt, exec.stoppedAt)}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="!px-3 !py-2 text-right">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatDistanceToNow(exec.startedAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="app-icon-btn p-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="app-icon-btn p-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

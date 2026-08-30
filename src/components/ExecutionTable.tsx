import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Webhook,
  MousePointer,
  Zap,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInSeconds, subHours, subDays, isAfter } from 'date-fns';
import type { Execution, Workflow } from '../types';
import { getN8nUrl } from '../lib/utils';
import type { TableDensity } from '../hooks/useSettings';

type TimeFilter = 'all' | '1h' | '24h' | '7d' | '30d';

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const getTimeFilterDate = (filter: TimeFilter): Date | null => {
  const now = new Date();
  switch (filter) {
    case '1h':
      return subHours(now, 1);
    case '24h':
      return subHours(now, 24);
    case '7d':
      return subDays(now, 7);
    case '30d':
      return subDays(now, 30);
    default:
      return null;
  }
};

interface ExecutionTableProps {
  executions: Execution[];
  workflows: Workflow[];
  isLoading?: boolean;
  onExecutionClick: (execution: Execution) => void;
  highlightId?: string | null;
  initialFilter?: FilterOption;
  defaultPageSize?: number;
  tableDensity?: TableDensity;
}

const formatDuration = (startedAt: string, stoppedAt: string | null): string => {
  if (!stoppedAt) return 'Running...';
  const seconds = differenceInSeconds(new Date(stoppedAt), new Date(startedAt));
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const getTriggerIcon = (mode: string): React.ReactNode => {
  switch (mode) {
    case 'webhook':
      return <Webhook size={12} />;
    case 'trigger':
      return <Zap size={12} />;
    case 'manual':
      return <MousePointer size={12} />;
    case 'retry':
      return <Clock size={12} />;
    default:
      return <Zap size={12} />;
  }
};

const getTriggerLabel = (mode: string): string => {
  switch (mode) {
    case 'webhook':
      return 'Webhook';
    case 'trigger':
      return 'Trigger';
    case 'manual':
      return 'Manual';
    case 'retry':
      return 'Retry';
    case 'cli':
      return 'CLI';
    case 'integrated':
      return 'Integrated';
    default:
      return mode.charAt(0).toUpperCase() + mode.slice(1);
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'success':
      return { label: 'Success', dotClass: 'bg-emerald-500' };
    case 'error':
      return { label: 'Error', dotClass: 'bg-red-500' };
    case 'running':
      return { label: 'Running', dotClass: 'bg-brand-500' };
    case 'waiting':
      return { label: 'Waiting', dotClass: 'bg-amber-500' };
    default:
      return { label: status, dotClass: 'bg-neutral-500' };
  }
};

type SortColumn = 'workflow' | 'status' | 'startTime' | 'duration' | 'trigger';
type SortDirection = 'asc' | 'desc';
type FilterOption = 'all' | 'success' | 'error' | 'running';

export const ExecutionTable: React.FC<ExecutionTableProps> = ({
  executions,
  workflows,
  isLoading,
  onExecutionClick,
  highlightId,
  initialFilter = 'all',
  defaultPageSize = 15,
  tableDensity = 'normal',
}) => {
  const pageSize = defaultPageSize > 0 ? defaultPageSize : 15;
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterBy, setFilterBy] = useState<FilterOption>(initialFilter);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const workflowNameMap = useMemo(() => {
    const map = new Map<string, string>();
    workflows.forEach((w) => map.set(w.id, w.name));
    return map;
  }, [workflows]);

  useEffect(() => {
    setFilterBy(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBy, timeFilter, sortColumn, sortDirection, pageSize]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="text-neutral-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="text-brand-600 dark:text-brand-300" />
    ) : (
      <ArrowDown size={14} className="text-brand-600 dark:text-brand-300" />
    );
  };

  const filteredAndSortedExecutions = useMemo(() => {
    let result = [...executions];

    const timeFilterDate = getTimeFilterDate(timeFilter);
    if (timeFilterDate) {
      result = result.filter((e) => isAfter(new Date(e.startedAt), timeFilterDate));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((e) => {
        const workflowName = e.workflowName || workflowNameMap.get(e.workflowId) || '';
        return workflowName.toLowerCase().includes(searchLower) ||
          e.id.toLowerCase().includes(searchLower);
      });
    }

    if (filterBy !== 'all') {
      result = result.filter((e) => e.status === filterBy);
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'workflow': {
          const nameA = a.workflowName || workflowNameMap.get(a.workflowId) || '';
          const nameB = b.workflowName || workflowNameMap.get(b.workflowId) || '';
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'startTime':
          comparison = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
          break;
        case 'duration': {
          const durationA = a.stoppedAt
            ? differenceInSeconds(new Date(a.stoppedAt), new Date(a.startedAt))
            : Infinity;
          const durationB = b.stoppedAt
            ? differenceInSeconds(new Date(b.stoppedAt), new Date(b.startedAt))
            : Infinity;
          comparison = durationB - durationA;
          break;
        }
        case 'trigger':
          comparison = a.mode.localeCompare(b.mode);
          break;
      }

      return sortDirection === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [executions, search, filterBy, timeFilter, sortColumn, sortDirection, workflowNameMap]);

  useEffect(() => {
    if (highlightId && filteredAndSortedExecutions.length > 0) {
      const index = filteredAndSortedExecutions.findIndex(e => e.id === highlightId);
      if (index !== -1) {
        const page = Math.floor(index / pageSize) + 1;
        setCurrentPage(page);
        setTimeout(() => {
          const row = document.querySelector(`[data-execution-id="${highlightId}"]`);
          row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [highlightId, filteredAndSortedExecutions, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedExecutions.length / pageSize);
  const paginatedExecutions = filteredAndSortedExecutions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 h-11 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="w-28 h-11 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
        </div>
        <div className="app-card">
          <div className="h-12 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-5 py-4 animate-pulse border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
              <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasActiveFilters = filterBy !== 'all' || timeFilter !== 'all' || search;

  const clearAllFilters = () => {
    setSearch('');
    setFilterBy('all');
    setTimeFilter('all');
  };

  return (
    <div className="space-y-4" data-filter={filterBy}>
      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {TIME_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setTimeFilter(filter.value)}
            className={`app-badge transition-colors ${
              timeFilter === filter.value
                ? 'app-badge-info'
                : 'app-badge-neutral hover:opacity-80'
            }`}
          >
            {filter.label}
          </button>
        ))}

        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700" />

        <button
          onClick={() => setFilterBy(filterBy === 'success' ? 'all' : 'success')}
          className={`app-badge transition-colors ${filterBy === 'success' ? 'app-badge-success' : 'app-badge-neutral hover:opacity-80'}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Success
        </button>
        <button
          onClick={() => setFilterBy(filterBy === 'error' ? 'all' : 'error')}
          className={`app-badge transition-colors ${filterBy === 'error' ? 'app-badge-error' : 'app-badge-neutral hover:opacity-80'}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Errors
        </button>
        <button
          onClick={() => setFilterBy(filterBy === 'running' ? 'all' : 'running')}
          className={`app-badge transition-colors ${filterBy === 'running' ? 'app-badge-info' : 'app-badge-neutral hover:opacity-80'}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          Running
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
        />
        <input
          type="text"
          placeholder="Search by workflow name or execution ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="app-input !pl-10"
        />
      </div>

      {/* Execution Table */}
      {filteredAndSortedExecutions.length === 0 ? (
        <div className="app-card px-4 py-14 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            <Activity size={26} className="text-neutral-400 dark:text-neutral-500" />
          </span>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {search ? 'No executions match your search' : 'No executions found'}
          </p>
        </div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="app-table" data-density={tableDensity}>
              <thead>
                <tr>
                  <th>
                    <button onClick={() => handleSort('workflow')} className="flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
                      Workflow {getSortIcon('workflow')}
                    </button>
                  </th>
                  <th>
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
                      Status {getSortIcon('status')}
                    </button>
                  </th>
                  <th>
                    <button onClick={() => handleSort('startTime')} className="flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
                      Start Time {getSortIcon('startTime')}
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => handleSort('duration')} className="flex items-center gap-1 ml-auto hover:text-brand-700 dark:hover:text-brand-300">
                      Duration {getSortIcon('duration')}
                    </button>
                  </th>
                  <th>
                    <button onClick={() => handleSort('trigger')} className="flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
                      Trigger {getSortIcon('trigger')}
                    </button>
                  </th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExecutions.map((execution) => {
                  const workflowName = execution.workflowName || workflowNameMap.get(execution.workflowId) || `Workflow ${execution.workflowId}`;
                  const statusConfig = getStatusConfig(execution.status);
                  const isHighlighted = highlightId === execution.id;

                  return (
                    <tr
                      key={execution.id}
                      data-execution-id={execution.id}
                      className={`transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-gold-300/15 dark:bg-gold-500/10 ring-1 ring-gold-400/40'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      }`}
                      onClick={() => onExecutionClick(execution)}
                    >
                      {/* Workflow */}
                      <td>
                        <p className="truncate max-w-xs text-sm font-semibold text-neutral-900 dark:text-white">{workflowName}</p>
                      </td>

                      {/* Status */}
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} />
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Start Time */}
                      <td>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {format(new Date(execution.startedAt), 'MMM d, HH:mm:ss')}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                        </p>
                      </td>

                      {/* Duration */}
                      <td className="text-right">
                        <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
                          {formatDuration(execution.startedAt, execution.stoppedAt)}
                        </span>
                      </td>

                      {/* Trigger */}
                      <td>
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                          {getTriggerIcon(execution.mode)}
                          {getTriggerLabel(execution.mode)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => onExecutionClick(execution)} className="app-icon-btn p-1.5" title="View details">
                            <Eye size={14} />
                          </button>
                          <a
                            href={`${getN8nUrl()}/workflow/${execution.workflowId}/executions/${execution.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="app-icon-btn p-1.5"
                            title="Open in n8n"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Page {currentPage} of {totalPages} ({filteredAndSortedExecutions.length} executions)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="app-icon-btn p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="app-icon-btn p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

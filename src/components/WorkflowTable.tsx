import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  ExternalLink,
  Workflow,
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Check,
  Tag,
  X,
  Webhook,
  Clock,
  MousePointer,
  Mail,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react';
import type { Workflow as WorkflowType, Execution, WorkflowNode } from '../types';
import { getN8nUrl } from '../lib/utils';
import { exportWorkflowsToCSV, exportWorkflowsToJSON } from '../utils/export';
import { formatDistanceToNow } from 'date-fns';
import type { TableDensity } from '../hooks/useSettings';

const getTriggerInfo = (nodes: WorkflowNode[]): { type: string; icon: React.ReactNode; label: string } => {
  const triggerNode = nodes.find((n) =>
    n.type.toLowerCase().includes('trigger') ||
    n.type === 'n8n-nodes-base.webhook' ||
    n.type === 'n8n-nodes-base.cron' ||
    n.type === 'n8n-nodes-base.start'
  );

  if (!triggerNode) {
    return { type: 'unknown', icon: <Zap size={12} />, label: 'Unknown' };
  }

  const type = triggerNode.type.toLowerCase();

  if (type.includes('webhook')) {
    return { type: 'webhook', icon: <Webhook size={12} />, label: 'Webhook' };
  }
  if (type.includes('schedule') || type.includes('cron')) {
    return { type: 'schedule', icon: <Clock size={12} />, label: 'Schedule' };
  }
  if (type.includes('manual') || type === 'n8n-nodes-base.start') {
    return { type: 'manual', icon: <MousePointer size={12} />, label: 'Manual' };
  }
  if (type.includes('email') || type.includes('imap') || type.includes('gmail')) {
    return { type: 'email', icon: <Mail size={12} />, label: 'Email' };
  }

  const parts = triggerNode.type.split('.');
  const nodeName = parts[parts.length - 1];
  const appName = nodeName.replace(/Trigger$/i, '').replace(/([A-Z])/g, ' $1').trim();

  return { type: 'app', icon: <Zap size={12} />, label: appName || 'Trigger' };
};

interface WorkflowStats {
  totalExecutions: number;
  successRate: number;
  lastExecution: Execution | null;
}

const calculateWorkflowStats = (workflowId: string, executions: Execution[]): WorkflowStats => {
  const workflowExecutions = executions.filter((e) => e.workflowId === workflowId);
  const totalExecutions = workflowExecutions.length;
  const successfulExecutions = workflowExecutions.filter((e) => e.status === 'success').length;
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

  const sortedExecutions = [...workflowExecutions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  const lastExecution = sortedExecutions[0] || null;

  return { totalExecutions, successRate, lastExecution };
};

interface WorkflowTableProps {
  workflows: WorkflowType[];
  executions: Execution[];
  isLoading?: boolean;
  onToggleActive?: (workflow: WorkflowType) => void;
  onTrigger?: (workflow: WorkflowType) => void;
  toggleLoadingId?: string;
  triggerLoadingId?: string;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  highlightId?: string | null;
  initialSearch?: string;
  initialFilter?: FilterOption;
  defaultPageSize?: number;
  tableDensity?: TableDensity;
}

type SortColumn = 'name' | 'status' | 'lastExecution' | 'executions' | 'successRate' | 'trigger' | 'favorite';
type SortDirection = 'asc' | 'desc';
type FilterOption = 'all' | 'active' | 'inactive';

export const WorkflowTable: React.FC<WorkflowTableProps> = ({
  workflows,
  executions,
  isLoading,
  onToggleActive,
  onTrigger,
  toggleLoadingId,
  triggerLoadingId,
  favorites,
  onToggleFavorite,
  searchInputRef,
  highlightId,
  initialSearch = '',
  initialFilter = 'all',
  defaultPageSize = 10,
  tableDensity = 'normal',
}) => {
  const pageSize = defaultPageSize > 0 ? defaultPageSize : 10;
  const [search, setSearch] = useState(initialSearch);
  const [sortColumn, setSortColumn] = useState<SortColumn>('favorite');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterBy, setFilterBy] = useState<FilterOption>(initialFilter);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const localInputRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || localInputRef;

  const workflowStatsMap = useMemo(() => {
    const map = new Map<string, WorkflowStats>();
    workflows.forEach((w) => {
      map.set(w.id, calculateWorkflowStats(w.id, executions));
    });
    return map;
  }, [workflows, executions]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    workflows.forEach((w) => {
      w.tags?.forEach((t) => tagSet.add(t.name));
    });
    return Array.from(tagSet).sort();
  }, [workflows]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setFilterBy(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBy, sortColumn, sortDirection, selectedTag, pageSize]);

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

  const filteredAndSortedWorkflows = useMemo(() => {
    let result = [...workflows];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(searchLower) ||
          w.id.toLowerCase().includes(searchLower) ||
          w.tags?.some((t) => t.name.toLowerCase().includes(searchLower))
      );
    }

    if (selectedTag) {
      result = result.filter((w) =>
        w.tags?.some((t) => t.name === selectedTag)
      );
    }

    if (filterBy === 'active') {
      result = result.filter((w) => w.active);
    } else if (filterBy === 'inactive') {
      result = result.filter((w) => !w.active);
    }

    result.sort((a, b) => {
      const statsA = workflowStatsMap.get(a.id) || { totalExecutions: 0, successRate: 0, lastExecution: null };
      const statsB = workflowStatsMap.get(b.id) || { totalExecutions: 0, successRate: 0, lastExecution: null };

      let comparison = 0;

      switch (sortColumn) {
        case 'favorite':
          comparison = (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0);
          if (comparison === 0) comparison = a.name.localeCompare(b.name);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = (b.active ? 1 : 0) - (a.active ? 1 : 0);
          break;
        case 'lastExecution':
          const timeA = statsA.lastExecution ? new Date(statsA.lastExecution.startedAt).getTime() : 0;
          const timeB = statsB.lastExecution ? new Date(statsB.lastExecution.startedAt).getTime() : 0;
          comparison = timeB - timeA;
          break;
        case 'executions':
          comparison = statsB.totalExecutions - statsA.totalExecutions;
          break;
        case 'successRate':
          comparison = statsB.successRate - statsA.successRate;
          break;
        case 'trigger':
          comparison = getTriggerInfo(a.nodes).label.localeCompare(getTriggerInfo(b.nodes).label);
          break;
      }

      return sortDirection === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [workflows, search, filterBy, sortColumn, sortDirection, favorites, selectedTag, workflowStatsMap]);

  useEffect(() => {
    if (highlightId && filteredAndSortedWorkflows.length > 0) {
      const index = filteredAndSortedWorkflows.findIndex(w => w.id === highlightId);
      if (index !== -1) {
        const page = Math.floor(index / pageSize) + 1;
        setCurrentPage(page);
        setTimeout(() => {
          const row = document.querySelector(`[data-workflow-id="${highlightId}"]`);
          row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [highlightId, filteredAndSortedWorkflows, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedWorkflows.length / pageSize);
  const paginatedWorkflows = filteredAndSortedWorkflows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedWorkflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedWorkflows.map((w) => w.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = (action: 'activate' | 'deactivate') => {
    const selectedWorkflows = workflows.filter((w) => selectedIds.has(w.id));
    selectedWorkflows.forEach((workflow) => {
      if (action === 'activate' && !workflow.active) {
        onToggleActive?.(workflow);
      } else if (action === 'deactivate' && workflow.active) {
        onToggleActive?.(workflow);
      }
    });
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 h-11 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="w-28 h-11 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
        </div>
        <div className="app-card">
          <div className="h-12 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-4 animate-pulse border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
              <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-filter={filterBy}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="app-input !pl-10"
          />
        </div>
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as FilterOption)}
          className="app-select sm:w-36"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Tag Filter and Export */}
      <div className="flex items-center justify-between gap-2">
        {allTags.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={14} className="text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`app-badge transition-colors ${
                  selectedTag === tag
                    ? 'app-badge-info'
                    : 'app-badge-neutral hover:opacity-80'
                }`}
              >
                {tag}
                {selectedTag === tag && <X size={10} />}
              </button>
            ))}
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => exportWorkflowsToCSV(filteredAndSortedWorkflows)}
            className="app-btn app-btn-secondary !py-1.5 !px-2.5 !text-xs"
            title="Export to CSV"
          >
            CSV
          </button>
          <button
            onClick={() => exportWorkflowsToJSON(filteredAndSortedWorkflows)}
            className="app-btn app-btn-secondary !py-1.5 !px-2.5 !text-xs"
            title="Export to JSON"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="app-panel flex flex-wrap items-center gap-2 p-2.5">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => handleBulkAction('activate')}
            className="app-btn app-btn-secondary !py-1.5 !px-3 !text-xs"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkAction('deactivate')}
            className="app-btn app-btn-secondary !py-1.5 !px-3 !text-xs"
          >
            Deactivate
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Workflow Table */}
      {filteredAndSortedWorkflows.length === 0 ? (
        <div className="app-card px-4 py-14 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            <Workflow size={26} className="text-neutral-400 dark:text-neutral-500" />
          </span>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {search ? 'No workflows match your search' : 'No workflows found'}
          </p>
        </div>
      ) : (
        <div className="app-card overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="app-table" data-density={tableDensity}>
              <thead>
                <tr>
                  <th className="w-9">
                    <button
                      onClick={toggleSelectAll}
                      className={`h-[18px] w-[18px] rounded-md border flex items-center justify-center transition-colors ${
                        selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'border-neutral-300 dark:border-neutral-600 hover:border-brand-500'
                      }`}
                    >
                      {selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0 && (
                        <Check size={12} />
                      )}
                    </button>
                  </th>
                  <th className="w-9"></th>
                  <th>
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
                      Workflow {getSortIcon('name')}
                    </button>
                  </th>
                  <th>
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
                      Status {getSortIcon('status')}
                    </button>
                  </th>
                  <th>
                    <button onClick={() => handleSort('lastExecution')} className="flex items-center gap-1 hover:text-brand-700 dark:hover:text-brand-300">
                      Last Execution {getSortIcon('lastExecution')}
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => handleSort('executions')} className="flex items-center gap-1 ml-auto hover:text-brand-700 dark:hover:text-brand-300">
                      Executions {getSortIcon('executions')}
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => handleSort('successRate')} className="flex items-center gap-1 ml-auto hover:text-brand-700 dark:hover:text-brand-300">
                      Success Rate {getSortIcon('successRate')}
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
                {paginatedWorkflows.map((workflow) => {
                  const stats = workflowStatsMap.get(workflow.id) || { totalExecutions: 0, successRate: 0, lastExecution: null };
                  const triggerInfo = getTriggerInfo(workflow.nodes);

                  const isHighlighted = highlightId === workflow.id;

                  return (
                    <tr
                      key={workflow.id}
                      data-workflow-id={workflow.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-gold-300/15 dark:bg-gold-500/10 ring-1 ring-gold-400/40'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="">
                        <button
                          onClick={() => toggleSelect(workflow.id)}
                          className={`h-[18px] w-[18px] rounded-md border flex items-center justify-center transition-colors ${
                            selectedIds.has(workflow.id)
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'border-neutral-300 dark:border-neutral-600 hover:border-brand-500'
                          }`}
                        >
                          {selectedIds.has(workflow.id) && <Check size={12} />}
                        </button>
                      </td>

                      {/* Favorite */}
                      <td className="">
                        <button
                          onClick={() => onToggleFavorite(workflow.id)}
                          className={`${
                            favorites.has(workflow.id)
                              ? 'text-gold-500'
                              : 'text-neutral-300 dark:text-neutral-600 hover:text-gold-500'
                          }`}
                        >
                          <Star size={14} fill={favorites.has(workflow.id) ? 'currentColor' : 'none'} />
                        </button>
                      </td>

                      {/* Workflow Name */}
                      <td className="">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                            {workflow.name}
                          </p>
                          {workflow.tags && workflow.tags.length > 0 && (
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                              {workflow.tags.map((t) => t.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="">
                        <span className={`app-badge ${workflow.active ? 'app-badge-success' : 'app-badge-neutral'}`}>
                          {workflow.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Last Execution */}
                      <td className="">
                        {stats.lastExecution ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                stats.lastExecution.status === 'success'
                                  ? 'bg-emerald-500'
                                  : stats.lastExecution.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">
                              {formatDistanceToNow(new Date(stats.lastExecution.startedAt), { addSuffix: true })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">Never</span>
                        )}
                      </td>

                      {/* Executions Count */}
                      <td className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
                          {stats.totalExecutions}
                        </span>
                      </td>

                      {/* Success Rate */}
                      <td className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
                          {stats.totalExecutions > 0 ? `${stats.successRate.toFixed(0)}%` : '-'}
                        </span>
                      </td>

                      {/* Trigger */}
                      <td className="">
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          {triggerInfo.icon}
                          {triggerInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="">
                        <div className="flex items-center justify-end gap-1">
                          {workflow.active && onTrigger && (
                            <button
                              onClick={() => onTrigger(workflow)}
                              disabled={triggerLoadingId === workflow.id}
                              className="app-icon-btn p-1.5"
                              title="Run workflow"
                            >
                              {triggerLoadingId === workflow.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <PlayCircle size={14} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => onToggleActive?.(workflow)}
                            disabled={toggleLoadingId === workflow.id}
                            className={`app-icon-btn p-1.5 ${workflow.active ? 'text-gold-600 dark:text-gold-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                            title={workflow.active ? 'Deactivate' : 'Activate'}
                          >
                            {toggleLoadingId === workflow.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : workflow.active ? (
                              <Pause size={14} />
                            ) : (
                              <Play size={14} />
                            )}
                          </button>
                          <a
                            href={`${getN8nUrl()}/workflow/${workflow.id}`}
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
            Page {currentPage} of {totalPages} ({filteredAndSortedWorkflows.length} workflows)
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

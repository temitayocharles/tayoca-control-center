import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  ExternalLink,
  Workflow,
  Star,
  PlayCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Workflow as WorkflowType, Execution } from '../types';
import { getN8nUrl } from '../lib/utils';

interface WorkflowStats {
  totalExecutions: number;
  successRate: number;
}

interface DashboardWorkflowListProps {
  workflows: WorkflowType[];
  executions?: Execution[];
  isLoading?: boolean;
  onToggleActive?: (workflow: WorkflowType) => void;
  onTrigger?: (workflow: WorkflowType) => void;
  toggleLoadingId?: string;
  triggerLoadingId?: string;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  maxItems?: number;
}

export const DashboardWorkflowList: React.FC<DashboardWorkflowListProps> = ({
  workflows,
  executions = [],
  isLoading,
  onToggleActive,
  onTrigger,
  toggleLoadingId,
  triggerLoadingId,
  favorites,
  onToggleFavorite,
  maxItems = 6,
}) => {
  const navigate = useNavigate();

  const workflowStatsMap = useMemo(() => {
    const map = new Map<string, WorkflowStats>();
    workflows.forEach((w) => {
      const workflowExecutions = executions.filter((e) => e.workflowId === w.id);
      const totalExecutions = workflowExecutions.length;
      const successfulExecutions = workflowExecutions.filter((e) => e.status === 'success').length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      map.set(w.id, { totalExecutions, successRate });
    });
    return map;
  }, [workflows, executions]);

  const sortedWorkflows = useMemo(() => {
    return [...workflows].sort((a, b) => {
      const aFav = favorites.has(a.id) ? 1 : 0;
      const bFav = favorites.has(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.name.localeCompare(b.name);
    }).slice(0, maxItems);
  }, [workflows, favorites, maxItems]);

  if (isLoading) {
    return (
      <div className="app-card divide-y divide-neutral-100 dark:divide-neutral-800">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-5 py-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="flex-1"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" /></div>
              <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="app-card px-4 py-10 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <Workflow size={24} className="text-neutral-400 dark:text-neutral-500" />
        </span>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No workflows found</p>
      </div>
    );
  }

  return (
    <div className="app-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="app-table">
          <thead>
            <tr>
              <th className="!px-3 !py-2.5 w-9"></th>
              <th className="!px-3 !py-2.5">Name</th>
              <th className="!px-3 !py-2.5">Status</th>
              <th className="!px-3 !py-2.5 text-right">Success</th>
              <th className="!px-3 !py-2.5 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {sortedWorkflows.map((workflow) => {
              const stats = workflowStatsMap.get(workflow.id) || { totalExecutions: 0, successRate: 0 };

              return (
                <tr key={workflow.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  {/* Favorite */}
                  <td className="!px-3 !py-3">
                    <button
                      onClick={() => onToggleFavorite(workflow.id)}
                      className={`flex-shrink-0 ${
                        favorites.has(workflow.id)
                          ? 'text-gold-500'
                          : 'text-neutral-300 dark:text-neutral-600 hover:text-gold-500'
                      }`}
                    >
                      <Star size={14} fill={favorites.has(workflow.id) ? 'currentColor' : 'none'} />
                    </button>
                  </td>

                  {/* Name */}
                  <td className="!px-3 !py-3">
                    <button
                      onClick={() => navigate(`/workflows?highlight=${workflow.id}`)}
                      className="truncate text-left text-sm font-semibold text-neutral-900 dark:text-white hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      {workflow.name}
                    </button>
                  </td>

                  {/* Status */}
                  <td className="!px-3 !py-3">
                    <span className={`app-badge ${workflow.active ? 'app-badge-success' : 'app-badge-neutral'}`}>
                      {workflow.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Success Rate */}
                  <td className="!px-3 !py-3 text-right">
                    {stats.totalExecutions > 0 ? (
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {stats.successRate.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400 dark:text-neutral-600">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="!px-3 !py-3">
                    <div className="flex items-center justify-end gap-1">
                      {workflow.active && onTrigger && (
                        <button
                          onClick={() => onTrigger(workflow)}
                          disabled={triggerLoadingId === workflow.id}
                          className="app-icon-btn p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className={`app-icon-btn p-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${workflow.active ? 'text-gold-600 dark:text-gold-400' : 'text-emerald-600 dark:text-emerald-400'}`}
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

      {/* View All Link */}
      {workflows.length > maxItems && (
        <button
          onClick={() => navigate('/workflows')}
          className="flex w-full items-center justify-center gap-1 px-4 py-3 text-sm font-medium text-neutral-500 hover:text-brand-700 dark:text-neutral-400 dark:hover:text-brand-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border-t border-neutral-100 dark:border-neutral-800"
        >
          View all {workflows.length} workflows
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};

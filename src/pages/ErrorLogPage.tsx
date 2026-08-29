import React, { useState, useMemo } from 'react';
import { RefreshCw, AlertCircle, ExternalLink, RotateCcw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAllExecutions, useWorkflows, useTriggerWorkflow } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Execution } from '../types';

type TimeFilter = '1h' | '24h' | '7d' | '30d' | 'all';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export const ErrorLogPage: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const triggerWorkflow = useTriggerWorkflow();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  // Fetch all executions and filter client-side for errors
  // The n8n API status filter may not work reliably in all versions
  const { data: allExecutions, isLoading, refetch } = useAllExecutions(
    {},
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  // Filter for error executions client-side
  const executions = useMemo(() => {
    if (!allExecutions) return [];
    return allExecutions.filter(e => e.status === 'error');
  }, [allExecutions]);

  const { data: workflows } = useWorkflows(
    shouldFetchData ? { autoRefresh: false } : { autoRefresh: false }
  );

  const workflowMap = useMemo(() => {
    if (!workflows) return new Map<string, string>();
    return new Map(workflows.map(w => [w.id, w.name]));
  }, [workflows]);

  const filteredErrors = useMemo(() => {
    if (!executions) return [];

    const now = new Date();
    const cutoffMap: Record<TimeFilter, number | null> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': null,
    };

    const cutoff = cutoffMap[timeFilter];
    if (cutoff === null) return executions;

    const cutoffDate = new Date(now.getTime() - cutoff);
    return executions.filter(e => new Date(e.startedAt) >= cutoffDate);
  }, [executions, timeFilter]);

  // Reset to page 1 when filter changes
  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredErrors.length / itemsPerPage);

  const paginatedErrors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredErrors.slice(startIndex, endIndex);
  }, [filteredErrors, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing error log...');
  };

  const handleRunWorkflow = async (execution: Execution) => {
    try {
      await triggerWorkflow.mutateAsync(execution.workflowId);
      toast.success('Workflow run requested', workflowMap.get(execution.workflowId) || 'Workflow');
    } catch {
      toast.error('Workflow run failed');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllOnPage = () => {
    const pageIds = paginatedErrors.map(e => e.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        pageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedIds(prev => new Set([...prev, ...pageIds]));
    }
  };

  const allOnPageSelected = paginatedErrors.length > 0 &&
    paginatedErrors.every(e => selectedIds.has(e.id));

  const handleBulkRun = async () => {
    if (selectedIds.size === 0) return;

    setIsRunning(true);
    const uniqueWorkflowIds = new Set<string>();

    // Get unique workflow IDs from selected errors
    filteredErrors
      .filter(e => selectedIds.has(e.id))
      .forEach(e => uniqueWorkflowIds.add(e.workflowId));

    let successCount = 0;
    let errorCount = 0;

    for (const workflowId of uniqueWorkflowIds) {
      try {
        await triggerWorkflow.mutateAsync(workflowId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsRunning(false);
    setSelectedIds(new Set());

    if (successCount > 0) {
      toast.success(`Triggered ${successCount} workflow${successCount !== 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to trigger ${errorCount} workflow${errorCount !== 1 ? 's' : ''}`);
    }
  };

  const getErrorMessage = (execution: Execution): string => {
    return execution.data?.resultData?.error?.message || 'Unknown error';
  };

  const getErrorStack = (execution: Execution): string | undefined => {
    return execution.data?.resultData?.error?.stack;
  };

  return (
    <>
      <PageHeader
        title="Error Log"
        description="View and troubleshoot failed executions"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 app-panel !p-1">
              {(['1h', '24h', '7d', '30d', 'all'] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleTimeFilterChange(filter)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    timeFilter === filter
                      ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              className="app-btn app-btn-secondary"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="app-inset mb-4 flex items-start gap-3 px-4 py-3.5">
        <AlertCircle size={17} className="mt-0.5 flex-shrink-0 text-brand-600 dark:text-brand-300" />
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Run workflow launches the workflow through its supported production trigger. It does not replay the failed execution or reuse its original payload/state.
        </p>
      </div>

      <ErrorBoundary>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-neutral-400" />
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="app-card p-8 text-center">
              <AlertCircle size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No errors found</h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                No failed executions in the selected time period.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAllOnPage}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    allOnPageSelected
                      ? 'bg-brand-600 border-brand-600 text-white dark:bg-brand-500 dark:border-brand-500 dark:text-brand-950'
                      : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-900 dark:hover:border-white'
                  }`}
                  title={allOnPageSelected ? 'Deselect all on page' : 'Select all on page'}
                >
                  {allOnPageSelected && <Check size={12} />}
                </button>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {filteredErrors.length} error{filteredErrors.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Bulk Action Bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={handleBulkRun}
                    disabled={isRunning}
                    className="app-btn app-btn-primary disabled:opacity-50"
                  >
                    <RotateCcw size={14} className={isRunning ? 'animate-spin' : ''} />
                    {isRunning ? 'Running...' : 'Run selected workflows'}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  >
                    Clear
                  </button>
                </div>
              )}

              {paginatedErrors.map((execution) => {
                const isExpanded = expandedId === execution.id;
                const errorStack = getErrorStack(execution);

                return (
                  <div
                    key={execution.id}
                    className={`app-card overflow-hidden transition-colors ${
                      selectedIds.has(execution.id)
                        ? '!border-brand-500 dark:!border-brand-400'
                        : ''
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => toggleSelect(execution.id)}
                            className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              selectedIds.has(execution.id)
                                ? 'bg-brand-600 border-brand-600 text-white dark:bg-brand-500 dark:border-brand-500 dark:text-brand-950'
                                : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-900 dark:hover:border-white'
                            }`}
                          >
                            {selectedIds.has(execution.id) && <Check size={12} />}
                          </button>
                          <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                              {workflowMap.get(execution.workflowId) || execution.workflowName || 'Unknown Workflow'}
                            </span>
                            <span className="text-xs text-neutral-400">#{execution.id.slice(0, 8)}</span>
                          </div>
                          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                            {getErrorMessage(execution)}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>{formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}</span>
                            <span>Mode: {execution.mode}</span>
                          </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleRunWorkflow(execution)}
                            disabled={triggerWorkflow.isPending}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Run the workflow using its supported production trigger; this does not replay the failed execution"
                          >
                            <RotateCcw size={14} />
                            Run workflow
                          </button>
                          <Link
                            to={`/workflows?highlight=${execution.workflowId}`}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="View workflow"
                          >
                            <ExternalLink size={14} />
                            View
                          </Link>
                          {errorStack && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : execution.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              Stack
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && errorStack && (
                      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4">
                        <pre className="text-xs text-neutral-600 dark:text-neutral-400 overflow-x-auto whitespace-pre-wrap font-mono">
                          {errorStack}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredErrors.length)} of {filteredErrors.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Per page:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                        className="app-select !w-auto !py-1"
                      >
                        {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ErrorBoundary>
    </>
  );
};

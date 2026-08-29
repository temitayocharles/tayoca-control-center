import React, { useState, useRef, useMemo } from 'react';
import { RefreshCw, Download, Upload, Archive, Check, AlertCircle, FileJson, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkflows } from '../hooks/useN8n';
import { n8nApi } from '../services/n8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Workflow } from '../types';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export const BackupsPage: React.FC = () => {
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: workflows, isLoading, refetch } = useWorkflows(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  // Pagination calculations
  const totalItems = workflows?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedWorkflows = useMemo(() => {
    if (!workflows) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return workflows.slice(startIndex, endIndex);
  }, [workflows, currentPage, itemsPerPage]);

  // Reset to page 1 when items per page changes or when workflows change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing workflows...');
  };

  const toggleWorkflowSelection = (workflowId: string) => {
    setSelectedWorkflows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workflowId)) {
        newSet.delete(workflowId);
      } else {
        newSet.add(workflowId);
      }
      return newSet;
    });
  };

  const selectAllOnPage = () => {
    const pageIds = paginatedWorkflows.map(w => w.id);
    const allPageSelected = pageIds.every(id => selectedWorkflows.has(id));

    if (allPageSelected) {
      // Deselect all on current page
      setSelectedWorkflows(prev => {
        const newSet = new Set(prev);
        pageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all on current page
      setSelectedWorkflows(prev => new Set([...prev, ...pageIds]));
    }
  };

  const selectAllWorkflows = () => {
    if (!workflows) return;
    if (selectedWorkflows.size === workflows.length) {
      setSelectedWorkflows(new Set());
    } else {
      setSelectedWorkflows(new Set(workflows.map(w => w.id)));
    }
  };

  const allOnPageSelected = paginatedWorkflows.length > 0 &&
    paginatedWorkflows.every(w => selectedWorkflows.has(w.id));

  const exportWorkflow = (workflow: Workflow) => {
    const data = JSON.stringify(workflow, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${workflow.name.replace(/[^a-z0-9]/gi, '-')}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exported', workflow.name);
  };

  const exportSelectedWorkflows = async () => {
    if (!workflows || selectedWorkflows.size === 0) return;

    setIsExporting(true);

    try {
      const selectedWorkflowData = workflows.filter(w => selectedWorkflows.has(w.id));

      if (selectedWorkflowData.length === 1) {
        exportWorkflow(selectedWorkflowData[0]);
      } else {
        // Export as a bundle
        const bundle = {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          workflows: selectedWorkflowData,
        };

        const data = JSON.stringify(bundle, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflows-bundle-${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Workflows exported', `${selectedWorkflowData.length} workflows`);
      }
    } catch {
      toast.error('Export failed', 'Unable to export workflows');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAllWorkflows = async () => {
    if (!workflows) return;

    setIsExporting(true);

    try {
      const bundle = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalWorkflows: workflows.length,
        workflows: workflows,
      };

      const data = JSON.stringify(bundle, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `n8n-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full backup created', `${workflows.length} workflows exported`);
    } catch {
      toast.error('Backup failed', 'Unable to create backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
    const MAX_RESTORE_WORKFLOWS = 25;

    try {
      if (file.size > MAX_BACKUP_BYTES) {
        throw new Error('Backup file is larger than the 2 MB restore limit.');
      }

      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const root = parsed as Record<string, unknown>;
      const candidates: unknown[] = Array.isArray(root?.workflows) ? root.workflows : [parsed];

      if (candidates.length === 0 || candidates.length > MAX_RESTORE_WORKFLOWS) {
        throw new Error(`A backup must contain between 1 and ${MAX_RESTORE_WORKFLOWS} workflows.`);
      }

      const drafts = candidates.map((candidate, index) => {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
          throw new Error(`Workflow ${index + 1} is not a valid object.`);
        }
        const item = candidate as Record<string, unknown>;
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        const nodes = item.nodes;
        const connections = item.connections;
        if (!name || !Array.isArray(nodes) || !connections || typeof connections !== 'object' || Array.isArray(connections)) {
          throw new Error(`Workflow ${index + 1} must include name, nodes[], and connections.`);
        }
        if (nodes.length > 1000) {
          throw new Error(`Workflow ${index + 1} exceeds the 1,000-node restore limit.`);
        }
        return {
          name,
          nodes: nodes as Workflow['nodes'],
          connections: connections as Workflow['connections'],
          ...(item.settings && typeof item.settings === 'object' && !Array.isArray(item.settings)
            ? { settings: item.settings as Record<string, unknown> }
            : {}),
          ...(typeof item.description === 'string' ? { description: item.description } : {}),
        };
      });

      if (!window.confirm(`Restore ${drafts.length} workflow${drafts.length === 1 ? '' : 's'} as unpublished drafts? Existing workflows will not be overwritten.`)) {
        return;
      }

      setIsRestoring(true);
      const usedNames = new Set((workflows || []).map(workflow => workflow.name.toLowerCase()));
      const makeUniqueName = (baseName: string) => {
        if (!usedNames.has(baseName.toLowerCase())) {
          usedNames.add(baseName.toLowerCase());
          return baseName;
        }
        let suffix = 1;
        let candidate = `${baseName} (restored)`;
        while (usedNames.has(candidate.toLowerCase())) {
          suffix += 1;
          candidate = `${baseName} (restored ${suffix})`;
        }
        usedNames.add(candidate.toLowerCase());
        return candidate;
      };

      let restored = 0;
      const failures: string[] = [];
      for (const draft of drafts) {
        const restoreName = makeUniqueName(draft.name);
        try {
          await n8nApi.createWorkflow({ ...draft, name: restoreName });
          restored += 1;
        } catch (error) {
          failures.push(`${restoreName}: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      await refetch();
      if (restored > 0) {
        toast.success('Backup restored', `${restored} unpublished draft${restored === 1 ? '' : 's'} created`);
      }
      if (failures.length > 0) {
        toast.error('Some workflows could not be restored', `${failures.length} failed. No existing workflows were overwritten.`);
        console.error('Restore failures', failures);
      }
    } catch (error) {
      toast.error('Restore failed', error instanceof Error ? error.message : 'Unable to read backup file');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader
        title="Backups"
        description="Export workflow configurations and restore backups as unpublished drafts"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreClick}
              disabled={isRestoring}
              className="app-btn app-btn-secondary"
            >
              {isRestoring ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              {isRestoring ? 'Restoring…' : 'Restore backup'}
            </button>
            <button
              onClick={exportAllWorkflows}
              disabled={isExporting || !workflows?.length}
              className="app-btn app-btn-primary disabled:opacity-50"
            >
              <Archive size={16} />
              Export All
            </button>
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileRestore}
        className="hidden"
      />

      <ErrorBoundary>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-neutral-400" />
          </div>
        ) : !workflows || workflows.length === 0 ? (
          <div className="app-card p-8 text-center">
            <Archive size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No workflows found</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              No workflows available to backup.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="app-card p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <FileJson size={16} />
                  <span className="text-xs font-medium uppercase">Total Workflows</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {workflows.length}
                </span>
              </div>

              <div className="app-card p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Check size={16} />
                  <span className="text-xs font-medium uppercase">Selected</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {selectedWorkflows.size}
                </span>
              </div>

              <div className="app-card p-4 md:col-span-1 col-span-2">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-medium uppercase">Last Modified</span>
                </div>
                <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {workflows.length > 0
                    ? formatDistanceToNow(new Date(
                        Math.max(...workflows.map(w => new Date(w.updatedAt).getTime()))
                      ), { addSuffix: true })
                    : 'N/A'
                  }
                </span>
              </div>
            </div>

            {/* Info Notice */}
            <div className="app-inset p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-brand-600 dark:text-brand-300 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Backup Information</h4>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                    Exports include workflow configuration only; credentials are never included. Restoring a backup creates
                    new unpublished drafts through the guarded Control Center gateway and never overwrites existing workflows.
                  </p>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedWorkflows.size > 0 && (
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {selectedWorkflows.size} workflow{selectedWorkflows.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={exportSelectedWorkflows}
                  disabled={isExporting}
                  className="app-btn app-btn-primary disabled:opacity-50"
                >
                  <Download size={14} />
                  Export Selected
                </button>
              </div>
            )}

            {/* Workflows Table */}
            <div className="app-card overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                  Workflows
                  <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                  </span>
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllOnPage}
                    className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  >
                    {allOnPageSelected ? 'Deselect page' : 'Select page'}
                  </button>
                  <span className="text-neutral-300 dark:text-neutral-700">|</span>
                  <button
                    onClick={selectAllWorkflows}
                    className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  >
                    {selectedWorkflows.size === workflows.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {paginatedWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedWorkflows.has(workflow.id)}
                        onChange={() => toggleWorkflowSelection(workflow.id)}
                        className="rounded border-neutral-300 dark:border-neutral-600"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {workflow.name}
                          </p>
                          {workflow.active && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {workflow.nodes?.length || 0} nodes • Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => exportWorkflow(workflow)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                      <Download size={14} />
                      Export
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Rows per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    >
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-7 h-7 text-xs rounded transition-colors ${
                              currentPage === pageNum
                                ? 'bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ErrorBoundary>
    </>
  );
};

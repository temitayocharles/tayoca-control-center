import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { ExecutionTable } from '../components/ExecutionTable';
import { ExecutionDetailsPanel } from '../components/ExecutionDetailsPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkflows, useExecutions } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Execution } from '../types';

export const ExecutionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const statusQuery = searchParams.get('status');
  const initialFilter = statusQuery === 'success' || statusQuery === 'error' || statusQuery === 'running'
    ? statusQuery
    : 'all';
  const [selectedExecution, setSelectedExecution] = React.useState<Execution | null>(null);
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: workflows } = useWorkflows(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );
  const { data: executions, isLoading, refetch } = useExecutions(
    { limit: 200 },
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing executions...');
  };

  const handleExecutionClick = (execution: Execution) => {
    setSelectedExecution(execution);
  };

  return (
    <>
      <PageHeader
        title="Executions"
        description="View execution history and details"
        actions={
          <button
            onClick={handleRefresh}
            className="app-btn app-btn-secondary"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      <ErrorBoundary>
        <ExecutionTable
          executions={executions || []}
          workflows={workflows || []}
          isLoading={isLoading}
          onExecutionClick={handleExecutionClick}
          highlightId={highlightId}
          initialFilter={initialFilter}
          defaultPageSize={settings.defaultPageSize}
          tableDensity={settings.tableDensity}
        />
      </ErrorBoundary>

      <ExecutionDetailsPanel
        execution={selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </>
  );
};

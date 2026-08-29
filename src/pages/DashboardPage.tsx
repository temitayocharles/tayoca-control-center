import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow, Play, CheckCircle, AlertCircle, RefreshCw, FilePenLine, Braces, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { StatCard } from '../components/StatCard';
import { Section } from '../components/Section';
import { ExecutionFeed } from '../components/ExecutionFeed';
import { DashboardWorkflowList } from '../components/DashboardWorkflowList';
import { ExecutionChart } from '../components/ExecutionChart';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkflows, useExecutions, useToggleWorkflow, useTriggerWorkflow, useDashboardStats } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useFavorites } from '../hooks/useFavorites';
import { useExecutionNotifications } from '../hooks/useExecutionNotifications';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { n8nApi } from '../services/n8n';
import { cmsApi } from '../services/cms';
import type { Execution, Workflow as WorkflowType } from '../types';

interface DashboardPageProps {
  onShowSettings: () => void;
}

const quickActionCards = [
  {
    label: 'Website CMS',
    description: 'Pages, media, products and site settings',
    icon: FilePenLine,
    path: '/content',
  },
  {
    label: 'Workflow Studio',
    description: 'Create and manage automations',
    icon: Braces,
    path: '/workflow-studio',
  },
  {
    label: 'Preferences',
    description: 'Refresh, display and notifications',
    icon: SlidersHorizontal,
    path: null,
  },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ onShowSettings }) => {
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const { favorites, toggleFavorite } = useFavorites();
  const toast = useToast();
  const [controlHealth, setControlHealth] = React.useState<{
    automation: 'checking' | 'healthy' | 'error';
    cms: 'checking' | 'healthy' | 'error';
    settingsHistory: number | null;
    settingsSha: string | null;
  }>({ automation: 'checking', cms: 'checking', settingsHistory: null, settingsSha: null });

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: workflows, isLoading: workflowsLoading, refetch: refetchWorkflows } = useWorkflows(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );
  const { data: executions, isLoading: executionsLoading, refetch: refetchExecutions } = useExecutions(
    { limit: 50 },
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );
  const toggleWorkflow = useToggleWorkflow();
  const triggerWorkflow = useTriggerWorkflow();

  const stats = useDashboardStats(workflows, executions);

  useExecutionNotifications(executions);

  const checkControlHealth = React.useCallback(async () => {
    setControlHealth(prev => ({ ...prev, automation: 'checking', cms: 'checking' }));
    const [automationResult, cmsResult] = await Promise.allSettled([
      n8nApi.testConnection(),
      Promise.all([
        cmsApi.get('public/data/site-settings.json'),
        cmsApi.history('public/data/site-settings.json', 20),
      ]),
    ]);

    const automationHealthy = automationResult.status === 'fulfilled' && automationResult.value === true;
    if (cmsResult.status === 'fulfilled') {
      const [settingsDocument, revisions] = cmsResult.value;
      setControlHealth({
        automation: automationHealthy ? 'healthy' : 'error',
        cms: 'healthy',
        settingsHistory: revisions.length,
        settingsSha: settingsDocument.sha,
      });
      return;
    }

    setControlHealth({
      automation: automationHealthy ? 'healthy' : 'error',
      cms: 'error',
      settingsHistory: null,
      settingsSha: null,
    });
  }, []);

  React.useEffect(() => {
    if (shouldFetchData) void checkControlHealth();
  }, [shouldFetchData, checkControlHealth]);

  const handleRefresh = () => {
    refetchWorkflows();
    refetchExecutions();
    void checkControlHealth();
    toast.info('Refreshing data...');
  };

  const handleToggleWorkflow = (workflow: WorkflowType) => {
    const action = workflow.active ? 'Deactivating' : 'Activating';
    toast.info(`${action} ${workflow.name}...`);
    toggleWorkflow.mutate(workflow, {
      onSuccess: () => {
        toast.success(
          workflow.active ? 'Workflow deactivated' : 'Workflow activated',
          workflow.name
        );
      },
      onError: () => {
        toast.error('Failed to toggle workflow', workflow.name);
      },
    });
  };

  const handleTriggerWorkflow = (workflow: WorkflowType) => {
    toast.info(`Triggering ${workflow.name}...`);
    triggerWorkflow.mutate(workflow.id, {
      onSuccess: () => {
        toast.success('Workflow triggered', workflow.name);
      },
      onError: () => {
        toast.error('Failed to trigger workflow', workflow.name);
      },
    });
  };

  const handleExecutionClick = (execution: Execution) => {
    navigate(`/executions?highlight=${execution.id}`);
  };

  const workflowNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    workflows?.forEach(w => map.set(w.id, w.name));
    return map;
  }, [workflows]);

  const enrichedExecutions = React.useMemo(() => {
    return executions?.map(exec => ({
      ...exec,
      workflowName: exec.workflowName || workflowNameMap.get(exec.workflowId) || `Workflow ${exec.workflowId}`,
    })) || [];
  }, [executions, workflowNameMap]);

  const recentExecutions = enrichedExecutions.slice(0, 12);
  const errorExecutions = enrichedExecutions.filter(e => e.status === 'error').slice(0, 4);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Tayoca operations overview across automation and website management"
        actions={
          <button onClick={handleRefresh} className="app-btn app-btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickActionCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => card.path ? navigate(card.path) : onShowSettings()}
              className="app-card app-card-hover group flex items-center gap-4 p-4 text-left"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 transition-colors group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20">
                <Icon size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{card.label}</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{card.description}</span>
              </span>
              <ArrowUpRight size={16} className="flex-shrink-0 text-neutral-300 dark:text-neutral-600 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Control health */}
      <section className="app-card mb-6 p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Control health</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Live checks through the guarded server-side control gateway.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="app-inset p-4">
            <div className="app-section-title">Automation gateway</div>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              {controlHealth.automation === 'healthy' ? <CheckCircle size={16} className="text-emerald-500" /> : controlHealth.automation === 'error' ? <AlertCircle size={16} className="text-red-500" /> : <RefreshCw size={16} className="animate-spin text-neutral-400" />}
              {controlHealth.automation === 'healthy' ? 'Connected' : controlHealth.automation === 'error' ? 'Unavailable' : 'Checking'}
            </div>
          </div>
          <div className="app-inset p-4">
            <div className="app-section-title">Canonical CMS</div>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              {controlHealth.cms === 'healthy' ? <CheckCircle size={16} className="text-emerald-500" /> : controlHealth.cms === 'error' ? <AlertCircle size={16} className="text-red-500" /> : <RefreshCw size={16} className="animate-spin text-neutral-400" />}
              {controlHealth.cms === 'healthy' ? 'Site settings readable' : controlHealth.cms === 'error' ? 'Unavailable' : 'Checking'}
            </div>
            {controlHealth.settingsSha && <div className="mt-1.5 text-[11px] font-mono text-neutral-400 dark:text-neutral-500">SHA {controlHealth.settingsSha.slice(0, 10)}</div>}
          </div>
          <button onClick={() => navigate('/content')} className="app-inset app-card-hover p-4 text-left">
            <div className="app-section-title">Settings recovery</div>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              {controlHealth.cms === 'healthy' ? <CheckCircle size={16} className="text-emerald-500" /> : controlHealth.cms === 'error' ? <AlertCircle size={16} className="text-red-500" /> : <RefreshCw size={16} className="animate-spin text-neutral-400" />}
              {controlHealth.settingsHistory === null ? (controlHealth.cms === 'error' ? 'Unavailable' : 'Checking') : `${controlHealth.settingsHistory} recent revision${controlHealth.settingsHistory === 1 ? '' : 's'}`}
            </div>
            <div className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">Open Website CMS to review or restore settings.</div>
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Workflows"
          value={stats.totalWorkflows}
          icon={Workflow}
          onClick={() => navigate('/workflows')}
        />
        <StatCard
          label="Executions"
          value={stats.totalExecutions}
          icon={Play}
          trend={stats.trends.executions}
          onClick={() => navigate('/executions')}
        />
        <StatCard
          label="Success Rate"
          value={stats.successRate}
          suffix="%"
          icon={CheckCircle}
          color="success"
          trend={stats.trends.successRate}
          onClick={() => navigate('/executions?status=success')}
        />
        <StatCard
          label="Errors"
          value={stats.recentErrors}
          icon={AlertCircle}
          color={stats.recentErrors > 0 ? 'error' : 'default'}
          trend={stats.trends.errors}
          onClick={() => navigate('/executions?status=error')}
        />
      </div>

      {/* Execution Chart */}
      <div className="mb-8">
        <Section title="Execution History">
          <div className="app-card p-5">
            <ErrorBoundary>
              <ExecutionChart executions={enrichedExecutions} isLoading={executionsLoading} />
            </ErrorBoundary>
          </div>
        </Section>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Workflows - 3/5 */}
        <div className="lg:col-span-3">
          <Section title="Recent Workflows">
            <ErrorBoundary>
              <DashboardWorkflowList
                workflows={workflows || []}
                executions={executions || []}
                isLoading={workflowsLoading}
                onToggleActive={handleToggleWorkflow}
                onTrigger={handleTriggerWorkflow}
                toggleLoadingId={toggleWorkflow.isPending ? toggleWorkflow.variables?.id : undefined}
                triggerLoadingId={triggerWorkflow.isPending ? triggerWorkflow.variables : undefined}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                maxItems={6}
              />
            </ErrorBoundary>
          </Section>
        </div>

        {/* Executions - 2/5 */}
        <div className="space-y-6 lg:col-span-2">
          <Section title="Recent Executions">
            <ErrorBoundary>
              <ExecutionFeed
                executions={recentExecutions}
                isLoading={executionsLoading}
                onExecutionClick={handleExecutionClick}
                itemsPerPage={6}
                showFilter={false}
                showPagination={false}
              />
            </ErrorBoundary>
          </Section>

          {errorExecutions.length > 0 && (
            <Section title="Recent Errors">
              <ErrorBoundary>
                <ExecutionFeed
                  executions={errorExecutions}
                  onExecutionClick={handleExecutionClick}
                  showFilter={false}
                  showPagination={false}
                  itemsPerPage={4}
                />
              </ErrorBoundary>
            </Section>
          )}
        </div>
      </div>
    </>
  );
};

import React from 'react';
import { X, CheckCircle, XCircle, Clock, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import type { Execution } from '../types';
import { getN8nUrl } from '../lib/utils';

interface ExecutionDetailsPanelProps {
  execution: Execution | null;
  onClose: () => void;
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    label: 'Success',
    color: 'text-emerald-600 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  error: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-600 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-500/10',
  },
  running: {
    icon: Loader2,
    label: 'Running',
    color: 'text-brand-600 dark:text-brand-300',
    bg: 'bg-brand-50 dark:bg-brand-500/10',
  },
  waiting: {
    icon: Clock,
    label: 'Waiting',
    color: 'text-amber-600 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
};

const formatDuration = (startedAt: string, stoppedAt: string | null): string => {
  if (!stoppedAt) return 'Running...';
  const start = new Date(startedAt).getTime();
  const end = new Date(stoppedAt).getTime();
  const duration = end - start;

  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
  return `${Math.floor(duration / 60000)}m ${Math.round((duration % 60000) / 1000)}s`;
};

export const ExecutionDetailsPanel: React.FC<ExecutionDetailsPanelProps> = ({
  execution,
  onClose,
}) => {
  const [copied, setCopied] = React.useState<string | null>(null);

  if (!execution) return null;

  const status = statusConfig[execution.status] || statusConfig.waiting;
  const StatusIcon = status.icon;
  const errorMessage = execution?.data?.resultData?.error?.message;
  const errorStack = execution?.data?.resultData?.error?.stack;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4"
      onClick={handleBackdropClick}
    >
      <div className="app-overlay" />
      <div className="app-dialog relative w-full max-w-2xl max-h-[90vh] flex flex-col animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`p-2 rounded-xl flex-shrink-0 ${status.bg}`}>
              <StatusIcon
                size={17}
                className={`${status.color} ${execution.status === 'running' ? 'animate-spin' : ''}`}
              />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                {execution.workflowName || `Workflow ${execution.workflowId}`}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {status.label} · {formatDuration(execution.startedAt, execution.stoppedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={`${getN8nUrl()}/execution/${execution.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="app-icon-btn p-2"
              aria-label="Open in n8n"
              title="Open in n8n"
            >
              <ExternalLink size={16} />
            </a>
            <button onClick={onClose} className="app-icon-btn p-2" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="app-inset p-3.5">
              <span className="app-section-title block mb-1">Execution ID</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-neutral-900 dark:text-white">{execution.id}</span>
                <button
                  onClick={() => handleCopy(execution.id.toString(), 'id')}
                  className="app-icon-btn p-1.5"
                  aria-label="Copy execution ID"
                >
                  {copied === 'id' ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
            <div className="app-inset p-3.5">
              <span className="app-section-title block mb-1">Workflow ID</span>
              <span className="text-sm font-mono text-neutral-900 dark:text-white">{execution.workflowId}</span>
            </div>
            <div className="app-inset p-3.5">
              <span className="app-section-title block mb-1">Started</span>
              <span className="text-sm text-neutral-800 dark:text-neutral-200">
                {new Date(execution.startedAt).toLocaleString()}
              </span>
            </div>
            <div className="app-inset p-3.5">
              <span className="app-section-title block mb-1">Finished</span>
              <span className="text-sm text-neutral-800 dark:text-neutral-200">
                {execution.stoppedAt ? new Date(execution.stoppedAt).toLocaleString() : 'Still running...'}
              </span>
            </div>
          </div>

          {/* Error Section */}
          {execution.status === 'error' && errorMessage && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="app-section-title">Error</span>
                <button
                  onClick={() => handleCopy(errorStack || errorMessage, 'error')}
                  className="app-btn app-btn-ghost !py-1 !px-2.5 !text-xs"
                >
                  {copied === 'error' ? <Check size={12} /> : <Copy size={12} />}
                  {copied === 'error' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3.5">
                <p className="text-sm text-red-700 dark:text-red-300 font-mono break-words">{errorMessage}</p>
              </div>
              {errorStack && (
                <pre className="mt-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-3.5 text-xs font-mono text-neutral-600 dark:text-neutral-300 overflow-x-auto whitespace-pre-wrap break-words max-h-48">
                  {errorStack}
                </pre>
              )}
            </div>
          )}

          {/* Success Message */}
          {execution.status === 'success' && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-3.5">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Execution completed successfully in {formatDuration(execution.startedAt, execution.stoppedAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import { useMemo } from 'react';
import { useWorkflows } from './useN8n';
import { getN8nUrl } from '../lib/utils';
import type { Workflow, WorkflowNode } from '../types';

export interface WebhookInfo {
  workflowId: string;
  workflowName: string;
  workflowActive: boolean;
  nodeName: string;
  nodeType: string;
  path: string;
  httpMethod: string;
  webhookUrl: string;
  responseMode?: string;
  authentication?: string;
}

const parseWebhookNode = (workflow: Workflow, node: WorkflowNode, baseUrl: string): WebhookInfo | null => {
  const nodeType = node.type.toLowerCase();
  if (!nodeType.includes('webhook')) return null;

  const params = node.parameters || {};
  let path = (params.path as string) || '';
  if (!path && params.options) {
    const options = params.options as Record<string, unknown>;
    path = (options.path as string) || '';
  }
  if (!path) path = workflow.id;
  if (!path.startsWith('/')) path = `/${path}`;

  let httpMethod = (params.httpMethod as string) || 'GET';
  if (Array.isArray(httpMethod)) httpMethod = httpMethod.join(', ');

  const responseMode = (params.responseMode as string) || 'onReceived';
  let authentication = 'None';
  if (params.authentication) authentication = params.authentication as string;
  else if (params.options) {
    const options = params.options as Record<string, unknown>;
    if (options.authentication) authentication = options.authentication as string;
  }

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowActive: workflow.active,
    nodeName: node.name,
    nodeType: node.type,
    path,
    httpMethod: httpMethod.toUpperCase(),
    webhookUrl: baseUrl ? `${baseUrl}/webhook${path}` : `/webhook${path}`,
    responseMode,
    authentication,
  };
};

export const useWebhooks = (options?: { autoRefresh?: boolean; refreshInterval?: number }) => {
  const { data: workflows, isLoading, refetch, error } = useWorkflows(options);
  const webhooks = useMemo((): WebhookInfo[] => {
    if (!workflows) return [];
    const baseUrl = getN8nUrl();
    const allWebhooks: WebhookInfo[] = [];
    workflows.forEach(workflow => {
      workflow.nodes?.forEach(node => {
        const info = parseWebhookNode(workflow, node, baseUrl);
        if (info) allWebhooks.push(info);
      });
    });
    return allWebhooks.sort((a, b) => {
      if (a.workflowActive !== b.workflowActive) return a.workflowActive ? -1 : 1;
      return a.workflowName.localeCompare(b.workflowName);
    });
  }, [workflows]);

  return { webhooks, isLoading, refetch, error };
};

import type { Workflow, Execution, Credential, Variable } from '../types';
import { controlRequest } from './control';

type Page<T> = { data: T[]; nextCursor?: string };
type WorkflowDraft = Pick<Workflow, 'name' | 'nodes' | 'connections'> & {
  settings?: Record<string, unknown>;
  description?: string;
};

const workflowDraft = (workflow: Workflow): WorkflowDraft => ({
  name: workflow.name,
  nodes: workflow.nodes,
  connections: workflow.connections,
  settings: workflow.settings || {},
  ...(workflow.description ? { description: workflow.description } : {}),
});

const stable = (value: unknown): string => JSON.stringify(value, Object.keys(value as object).sort());

export const n8nApi = {
  async getWorkflows(params?: { limit?: number }): Promise<Page<Workflow>> {
    return controlRequest('list_workflows', { limit: params?.limit ?? 250 });
  },

  async getAllWorkflows(): Promise<Page<Workflow>> {
    const data: Workflow[] = [];
    let cursor: string | undefined;
    do {
      const page = await controlRequest<Page<Workflow>>('list_workflows', { limit: 250, ...(cursor ? { cursor } : {}) });
      data.push(...(page.data || []));
      cursor = page.nextCursor;
    } while (cursor);
    return { data };
  },

  async getWorkflow(id: string): Promise<Workflow> {
    return controlRequest('get_workflow', { id });
  },

  async createWorkflow(definition: WorkflowDraft): Promise<Workflow> {
    return controlRequest('create_workflow', { workflow: definition });
  },

  async updateWorkflow(id: string, definition: WorkflowDraft): Promise<Workflow> {
    await controlRequest<Workflow>('update_workflow', { id, workflow: definition });
    const readBack = await this.getWorkflow(id);
    const expected = workflowDraft({ ...readBack, ...definition } as Workflow);
    const actual = workflowDraft(readBack);
    if (stable(expected) !== stable(actual)) throw new Error('Save verification failed: n8n read-back differs from the submitted draft.');
    return readBack;
  },

  async deleteWorkflow(id: string): Promise<Workflow> {
    return controlRequest('delete_workflow', { id });
  },

  async archiveWorkflow(id: string): Promise<Workflow> {
    return controlRequest('archive_workflow', { id });
  },

  async unarchiveWorkflow(id: string): Promise<Workflow> {
    return controlRequest('unarchive_workflow', { id });
  },

  async publishWorkflow(id: string): Promise<Workflow> {
    return controlRequest('publish_workflow', { id });
  },

  async unpublishWorkflow(id: string): Promise<Workflow> {
    return controlRequest('unpublish_workflow', { id });
  },

  async activateWorkflow(id: string): Promise<Workflow> { return this.publishWorkflow(id); },
  async deactivateWorkflow(id: string): Promise<Workflow> { return this.unpublishWorkflow(id); },

  async triggerWorkflow(id: string): Promise<{ executionId?: string; id?: string }> {
    return controlRequest('run_workflow', { id });
  },

  async getExecutions(params?: { limit?: number; status?: string; workflowId?: string }): Promise<Page<Execution>> {
    return controlRequest('list_executions', { limit: params?.limit ?? 250, ...(params?.status ? { status: params.status } : {}), ...(params?.workflowId ? { workflowId: params.workflowId } : {}) });
  },

  async getAllExecutions(params?: { status?: string; workflowId?: string }): Promise<Page<Execution>> {
    const data: Execution[] = [];
    let cursor: string | undefined;
    do {
      const page = await controlRequest<Page<Execution>>('list_executions', { limit: 250, ...(params || {}), ...(cursor ? { cursor } : {}) });
      data.push(...(page.data || []));
      cursor = page.nextCursor;
    } while (cursor);
    return { data };
  },

  async getExecution(id: string): Promise<Execution> { return controlRequest('get_execution', { id }); },
  async getCredentials(): Promise<Page<Credential>> { return controlRequest('list_credentials', { limit: 250 }); },
  async getVariables(): Promise<Page<Variable>> { return controlRequest('list_variables', { limit: 250 }); },
  async testConnection(): Promise<boolean> {
    try { await controlRequest('list_workflows', { limit: 1 }); return true; } catch { return false; }
  },
};

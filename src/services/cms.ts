import { controlRequest } from './control';

export interface ContentEntry { path: string; sha: string; size: number; }
export interface ContentDocument extends ContentEntry { content: string; }

export const cmsApi = {
  async list(): Promise<ContentEntry[]> {
    const response = await controlRequest<{ data: ContentEntry[] }>('list_content');
    return response.data || [];
  },
  async get(path: string): Promise<ContentDocument> { return controlRequest('get_content', { path }); },
  async create(path: string, content: string): Promise<{ ok: boolean; path: string; sha?: string }> {
    return controlRequest('create_content', { path, content });
  },
  async update(path: string, sha: string, content: string): Promise<{ ok: boolean; path: string; sha?: string }> {
    return controlRequest('update_content', { path, sha, content });
  },
  async delete(path: string, sha: string): Promise<{ ok: boolean }> { return controlRequest('delete_content', { path, sha }); },
};

import { controlRequest } from './control';

export interface ContentEntry { path: string; sha: string; size: number; }
export interface ContentDocument extends ContentEntry { content: string; }
export interface MediaEntry { path: string; sha: string; size: number; mime: string; url: string; managedUpload: boolean; }
export interface ContentRevision { sha: string; created: string; message: string; author: string; }

export const cmsApi = {
  async list(): Promise<ContentEntry[]> { const r = await controlRequest<{ data: ContentEntry[] }>('list_content'); return r.data || []; },
  async get(path: string): Promise<ContentDocument> { return controlRequest('get_content', { path }); },
  async history(path: string, limit = 20): Promise<ContentRevision[]> { const r = await controlRequest<{ data: ContentRevision[] }>('list_content', { history: true, path, limit }); return r.data || []; },
  async getRevision(path: string, ref: string): Promise<ContentDocument> { return controlRequest('get_content', { history: true, path, ref }); },
  async create(path: string, content: string): Promise<{ ok: boolean; path: string; sha?: string }> { return controlRequest('create_content', { path, content }); },
  async update(path: string, sha: string, content: string): Promise<{ ok: boolean; path: string; sha?: string }> { return controlRequest('update_content', { path, sha, content }); },
  async delete(path: string, sha: string): Promise<{ ok: boolean }> { return controlRequest('delete_content', { path, sha }); },
  async listMedia(): Promise<MediaEntry[]> { const r = await controlRequest<{ data: MediaEntry[] }>('list_content', { media: true }); return r.data || []; },
  async uploadMedia(path: string, contentBase64: string, mime: string): Promise<{ ok: boolean; path: string; sha?: string }> { return controlRequest('create_content', { media: true, path, contentBase64, mime }); },
  async deleteMedia(path: string, sha: string): Promise<{ ok: boolean }> { return controlRequest('delete_content', { media: true, path, sha }); },
  async findMediaReferences(path: string): Promise<ContentEntry[]> {
    const needle = `/${path.replace(/^public\//, '')}`;
    const entries = await this.list();
    const hits: ContentEntry[] = [];
    for (let i = 0; i < entries.length; i += 8) {
      const batch = entries.slice(i, i + 8);
      const docs = await Promise.all(batch.map(async (entry) => { try { return { entry, doc: await this.get(entry.path) }; } catch { return { entry, doc: null }; } }));
      for (const item of docs) if (item.doc?.content.includes(needle)) hits.push(item.entry);
    }
    return hits;
  },
};

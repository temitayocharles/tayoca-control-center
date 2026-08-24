import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus2, RefreshCw, Save, Trash2, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { cmsApi, type ContentDocument, type ContentEntry } from '../services/cms';
import { useToast } from '../components/Toast';

export const ContentPage: React.FC = () => {
  const toast = useToast();
  const [files, setFiles] = useState<ContentEntry[]>([]);
  const [selected, setSelected] = useState<ContentDocument | null>(null);
  const [content, setContent] = useState('');
  const [path, setPath] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => files.filter(f => f.path.toLowerCase().includes(search.toLowerCase())), [files, search]);
  const reload = async () => { setFiles(await cmsApi.list()); };
  useEffect(() => { reload().catch(e => toast.error('Failed to load site content', e.message)); }, []);

  const open = async (entry: ContentEntry) => {
    setBusy(true);
    try { const doc = await cmsApi.get(entry.path); setSelected(doc); setPath(doc.path); setContent(doc.content); setCreating(false); }
    catch (e) { toast.error('Failed to open content', e instanceof Error ? e.message : 'Unknown error'); }
    finally { setBusy(false); }
  };

  const newFile = () => { setSelected(null); setPath('public/'); setContent(''); setCreating(true); };
  const save = async () => {
    setBusy(true);
    try {
      if (creating) {
        await cmsApi.create(path, content);
        toast.success('Content created', path);
      } else if (selected) {
        await cmsApi.update(selected.path, selected.sha, content);
        toast.success('Content published', selected.path);
      }
      await reload();
      const fresh = await cmsApi.get(path);
      setSelected(fresh); setCreating(false);
    } catch (e) { toast.error('Save failed', e instanceof Error ? e.message : 'Unknown error'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!selected || !window.confirm(`Delete ${selected.path}? This commits the deletion to canonical Forgejo.`)) return;
    setBusy(true);
    try { await cmsApi.delete(selected.path, selected.sha); toast.success('Content deleted', selected.path); setSelected(null); setContent(''); setPath(''); await reload(); }
    catch (e) { toast.error('Delete failed', e instanceof Error ? e.message : 'Unknown error'); }
    finally { setBusy(false); }
  };
  const liveUrl = path.startsWith('public/') ? `https://tayoca.com/${path.slice(7).replace(/index\.html$/, '')}` : '';

  return <>
    <PageHeader title="Site Content" description="Manage Tayoca website content directly in canonical Forgejo" actions={<div className="flex gap-2"><button onClick={newFile} className="px-3 py-1.5 text-sm rounded-lg border"><FilePlus2 size={15} className="inline mr-2"/>New</button><button onClick={() => reload()} className="px-3 py-1.5 text-sm rounded-lg border"><RefreshCw size={15} className="inline mr-2"/>Refresh</button></div>} />
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <div className="border rounded-lg bg-white dark:bg-neutral-900 dark:border-neutral-800 overflow-hidden">
        <div className="p-3 border-b dark:border-neutral-800"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search content..." className="w-full px-3 py-2 text-sm border rounded-md bg-transparent dark:border-neutral-700"/></div>
        <div className="max-h-[70vh] overflow-auto">{filtered.map(f=><button key={f.path} onClick={()=>open(f)} className={`block w-full text-left px-3 py-2 text-sm border-b dark:border-neutral-800 ${selected?.path===f.path?'bg-neutral-100 dark:bg-neutral-800':''}`}><div className="font-medium truncate">{f.path.replace(/^public\//,'')}</div><div className="text-xs text-neutral-500">{Math.max(1,Math.round(f.size/1024))} KB</div></button>)}</div>
      </div>
      <div className="border rounded-lg bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center"><input value={path} onChange={e=>setPath(e.target.value)} disabled={!creating && !!selected} className="flex-1 min-w-64 px-3 py-2 text-sm font-mono border rounded-md bg-transparent dark:border-neutral-700"/><button disabled={busy || !path} onClick={save} className="px-3 py-2 text-sm rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"><Save size={15} className="inline mr-2"/>Save & Publish</button>{selected && <button disabled={busy} onClick={remove} className="px-3 py-2 text-sm rounded-md border text-red-600"><Trash2 size={15} className="inline mr-2"/>Delete</button>}{liveUrl && <a href={liveUrl} target="_blank" rel="noreferrer" className="px-3 py-2 text-sm rounded-md border"><ExternalLink size={15} className="inline mr-2"/>Live</a>}</div>
        <textarea value={content} onChange={e=>setContent(e.target.value)} disabled={busy || (!creating && !selected)} spellCheck={false} className="w-full min-h-[66vh] p-4 text-xs leading-5 font-mono border rounded-md bg-neutral-950 text-neutral-100 dark:border-neutral-700 disabled:opacity-50" placeholder="Select a file or create a new public/*.html, .md, .txt, or .json file."/>
      </div>
    </div>
  </>;
};

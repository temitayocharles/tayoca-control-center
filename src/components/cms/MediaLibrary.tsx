import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Image as ImageIcon, Search, Trash2, Upload } from 'lucide-react';
import { cmsApi, type MediaEntry } from '../../services/cms';
import { friendlyContentName } from '../../lib/cmsDocument';
import { useToast } from '../Toast';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const inputClass = 'app-input';
const relativePath = (path: string) => `/${path.replace(/^public\//, '')}`;
const publicUrl = (value: string) => value.startsWith('http') ? value : `https://tayoca.com${value.startsWith('/') ? '' : '/'}${value}`;
const safeName = (name: string) => {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  const base = (dot >= 0 ? name.slice(0, dot) : name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'image';
  return `${base}${ext}`;
};
const asBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => { const v = String(reader.result || ''); const i = v.indexOf(','); if (i >= 0) resolve(v.slice(i + 1)); else reject(new Error('Could not encode image.')); };
  reader.onerror = () => reject(reader.error || new Error('Could not read image.'));
  reader.readAsDataURL(file);
});

export const MediaSelect: React.FC<{ label: string; value: string; onChange: (value: string) => void; disabled?: boolean }> = ({ label, value, onChange, disabled }) => {
  const [media, setMedia] = useState<MediaEntry[]>([]);
  useEffect(() => { void cmsApi.listMedia().then(setMedia).catch(() => setMedia([])); }, []);
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span><div className="grid gap-3 sm:grid-cols-[96px_1fr]"><div className="flex h-20 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">{value ? <img src={publicUrl(value)} alt="" className="h-full w-full object-contain p-1" /> : <ImageIcon size={24} className="text-neutral-400" />}</div><select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={inputClass}><option value="">No image selected</option>{media.map((item) => <option key={item.path} value={relativePath(item.path)}>{friendlyContentName(item.path)}</option>)}</select></div></label>;
};

export const MediaLibrary: React.FC<{ onCount?: (count: number) => void }> = ({ onCount }) => {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<MediaEntry[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState('');
  const load = useCallback(async () => {
    setBusy(true);
    try { const items = await cmsApi.listMedia(); setMedia(items); onCount?.(items.length); }
    catch (e) { toast.error('Could not load media', e instanceof Error ? e.message : 'Unknown error'); }
    finally { setBusy(false); }
  }, [onCount, toast]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return q ? media.filter((m) => m.path.toLowerCase().includes(q)) : media; }, [media, query]);

  const upload = async (file: File) => {
    if (!TYPES.has(file.type)) return toast.error('Unsupported image', 'Use PNG, JPEG, WebP or GIF.');
    if (file.size <= 0 || file.size > MAX_BYTES) return toast.error('Image is too large', 'Maximum upload size is 2 MB.');
    const path = `public/assets/uploads/${safeName(file.name)}`;
    if (media.some((m) => m.path === path)) return toast.error('Filename already exists', 'Rename the image and try again.');
    setBusy(true);
    try { await cmsApi.uploadMedia(path, await asBase64(file), file.type); toast.success('Image uploaded', friendlyContentName(path)); await load(); }
    catch (e) { toast.error('Upload failed', e instanceof Error ? e.message : 'Unknown error'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  const remove = async (item: MediaEntry) => {
    setChecking(item.path);
    try {
      const refs = await cmsApi.findMediaReferences(item.path);
      if (refs.length) { toast.error('Image is still in use', refs.slice(0, 4).map((r) => friendlyContentName(r.path)).join(', ')); return; }
      if (!window.confirm(`Delete “${friendlyContentName(item.path)}”? No references were found in CMS-managed content.`)) return;
      await cmsApi.deleteMedia(item.path, item.sha); toast.success('Image deleted'); await load();
    } catch (e) { toast.error('Delete failed', e instanceof Error ? e.message : 'Unknown error'); }
    finally { setChecking(''); }
  };

  return <div className="app-card p-5 lg:p-7">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Media Library</h2><p className="mt-1 text-sm text-neutral-500">Choose Tayoca images visually. New uploads are stored in the canonical site repository.</p></div><div><input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} /><button onClick={() => input.current?.click()} disabled={busy} className="app-btn app-btn-primary disabled:opacity-50"><Upload size={16} /> Upload image</button></div></div>
    <div className="relative mb-5 max-w-xl"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search images…" className={`${inputClass} pl-9`} /></div>
    {busy && !media.length ? <div className="py-16 text-center text-sm text-neutral-500">Loading media…</div> : visible.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{visible.map((item) => <article key={item.path} className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800"><div className="aspect-[4/3] bg-neutral-100 p-3 dark:bg-neutral-800"><img src={publicUrl(relativePath(item.path))} alt="" loading="lazy" className="h-full w-full object-contain" /></div><div className="p-3"><div className="truncate text-sm font-medium">{friendlyContentName(item.path)}</div><div className="mt-1 text-xs text-neutral-500">{Math.max(1, Math.round(item.size / 1024))} KB · {item.mime.replace('image/', '').toUpperCase()}</div></div><div className="flex items-center justify-between border-t border-neutral-100 px-3 py-2 dark:border-neutral-800"><button onClick={() => void navigator.clipboard.writeText(relativePath(item.path))} className="inline-flex items-center gap-1.5 text-xs text-neutral-500"><Copy size={13} /> Copy path</button>{item.managedUpload && <button onClick={() => void remove(item)} disabled={checking === item.path} className="inline-flex items-center gap-1.5 text-xs text-red-600 disabled:opacity-40"><Trash2 size={13} /> {checking === item.path ? 'Checking…' : 'Delete'}</button>}</div></article>)}</div> : <div className="py-16 text-center text-sm text-neutral-500">No images match this view.</div>}
  </div>;
};

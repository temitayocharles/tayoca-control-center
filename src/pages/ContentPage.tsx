import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Code2,
  ExternalLink,
  Eye,
  FilePlus2,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/layout';
import { cmsApi, type ContentDocument, type ContentEntry } from '../services/cms';
import { useToast } from '../components/Toast';

type EditorMode = 'source' | 'preview';

const ALLOWED_EXTENSIONS = ['.html', '.htm', '.md', '.txt', '.json'];

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extensionOf = (path: string): string => {
  const clean = path.toLowerCase().split('?')[0];
  return ALLOWED_EXTENSIONS.find((extension) => clean.endsWith(extension)) || '';
};

const validatePath = (path: string): string | null => {
  const trimmed = path.trim();
  if (!trimmed) return 'A file path is required.';
  if (!trimmed.startsWith('public/')) return 'Content must stay inside public/.';
  if (trimmed.includes('..')) return 'Parent-directory traversal is not allowed.';
  if (!extensionOf(trimmed)) return `Use one of: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  return null;
};

const liveUrlFor = (path: string): string => {
  if (!path.startsWith('public/') || !['.html', '.htm'].includes(extensionOf(path))) return '';
  const relative = path.slice(7).replace(/index\.html?$/i, '');
  return `https://tayoca.com/${relative}`;
};

export const ContentPage: React.FC = () => {
  const toast = useToast();
  const [files, setFiles] = useState<ContentEntry[]>([]);
  const [selected, setSelected] = useState<ContentDocument | null>(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [path, setPath] = useState('');
  const [originalPath, setOriginalPath] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<EditorMode>('source');

  const filtered = useMemo(
    () => files.filter((file) => file.path.toLowerCase().includes(search.toLowerCase())),
    [files, search],
  );

  const pathError = useMemo(() => validatePath(path), [path]);
  const extension = extensionOf(path);
  const jsonError = useMemo(() => {
    if (extension !== '.json' || !content.trim()) return null;
    try {
      JSON.parse(content);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid JSON';
    }
  }, [content, extension]);

  const dirty = creating
    ? Boolean(path !== 'public/' || content.length > 0)
    : Boolean(selected && (content !== originalContent || path !== originalPath));

  const canSave = !busy && !pathError && !jsonError && dirty && (creating || Boolean(selected));
  const liveUrl = liveUrlFor(path);
  const lineCount = content ? content.split('\n').length : 0;

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const confirmDiscard = (): boolean =>
    !dirty || window.confirm('Discard your unsaved content changes?');

  const reload = async (force = false) => {
    if (!force && !confirmDiscard()) return;
    setBusy(true);
    try {
      const refreshedFiles = await cmsApi.list();
      setFiles(refreshedFiles);

      if (selected && !creating) {
        const fresh = await cmsApi.get(selected.path);
        setSelected(fresh);
        setPath(fresh.path);
        setOriginalPath(fresh.path);
        setContent(fresh.content);
        setOriginalContent(fresh.content);
      } else if (creating) {
        setSelected(null);
        setPath('');
        setOriginalPath('');
        setContent('');
        setOriginalContent('');
        setCreating(false);
        setMode('source');
      }

      toast.success('Content refreshed');
    } catch (error) {
      toast.error('Failed to load site content', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setBusy(true);
    cmsApi
      .list()
      .then(setFiles)
      .catch((error) => toast.error('Failed to load site content', error instanceof Error ? error.message : 'Unknown error'))
      .finally(() => setBusy(false));
  }, []);

  const open = async (entry: ContentEntry) => {
    if (selected?.path === entry.path && !creating) return;
    if (!confirmDiscard()) return;
    setBusy(true);
    try {
      const document = await cmsApi.get(entry.path);
      setSelected(document);
      setPath(document.path);
      setOriginalPath(document.path);
      setContent(document.content);
      setOriginalContent(document.content);
      setCreating(false);
      setMode('source');
    } catch (error) {
      toast.error('Failed to open content', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const newFile = () => {
    if (!confirmDiscard()) return;
    setSelected(null);
    setPath('public/');
    setOriginalPath('public/');
    setContent('');
    setOriginalContent('');
    setCreating(true);
    setMode('source');
  };

  const revert = () => {
    if (!dirty) return;
    if (!window.confirm('Revert all unsaved changes in this editor?')) return;
    setPath(originalPath);
    setContent(originalContent);
  };

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const targetPath = path.trim();
      if (creating) {
        await cmsApi.create(targetPath, content);
        toast.success('Content created and published', targetPath);
      } else if (selected) {
        if (targetPath !== selected.path) {
          throw new Error('Renaming existing content is disabled. Create the new path, verify it, then delete the old file.');
        }
        await cmsApi.update(selected.path, selected.sha, content);
        toast.success('Content saved and published', selected.path);
      }

      const refreshedFiles = await cmsApi.list();
      setFiles(refreshedFiles);
      const fresh = await cmsApi.get(targetPath);
      setSelected(fresh);
      setPath(fresh.path);
      setOriginalPath(fresh.path);
      setContent(fresh.content);
      setOriginalContent(fresh.content);
      setCreating(false);
    } catch (error) {
      toast.error('Save failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (canSave) void save();
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [canSave, busy, content, creating, path, selected]);

  const remove = async () => {
    if (!selected) return;
    if (dirty && !window.confirm('This editor has unsaved changes. Delete the published file anyway?')) return;
    if (!window.confirm(`Delete ${selected.path}? This commits the deletion to canonical Forgejo.`)) return;

    setBusy(true);
    try {
      await cmsApi.delete(selected.path, selected.sha);
      toast.success('Content deleted', selected.path);
      setSelected(null);
      setContent('');
      setOriginalContent('');
      setPath('');
      setOriginalPath('');
      setCreating(false);
      setFiles(await cmsApi.list());
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const renderPreview = () => {
    if (!selected && !creating) {
      return <div className="h-full grid place-items-center text-sm text-neutral-500">Select or create a content file.</div>;
    }

    if (extension === '.html' || extension === '.htm') {
      return (
        <iframe
          title={`Preview of ${path}`}
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={content}
          className="w-full min-h-[64vh] bg-white rounded-md border dark:border-neutral-700"
        />
      );
    }

    if (extension === '.json') {
      if (jsonError) {
        return (
          <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            <div className="flex items-center gap-2 font-medium"><AlertTriangle size={16} /> Invalid JSON</div>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{jsonError}</pre>
          </div>
        );
      }
      const formatted = content.trim() ? JSON.stringify(JSON.parse(content), null, 2) : '';
      return <pre className="min-h-[64vh] p-4 overflow-auto whitespace-pre-wrap text-xs font-mono border rounded-md dark:border-neutral-700">{formatted}</pre>;
    }

    return <pre className="min-h-[64vh] p-4 overflow-auto whitespace-pre-wrap text-sm border rounded-md dark:border-neutral-700">{content}</pre>;
  };

  return (
    <>
      <PageHeader
        title="Site Content"
        description="Manage Tayoca public content through the guarded canonical Forgejo workflow"
        actions={
          <div className="flex gap-2">
            <button onClick={newFile} disabled={busy} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50">
              <FilePlus2 size={15} className="inline mr-2" />New
            </button>
            <button onClick={() => reload()} disabled={busy} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50">
              <RefreshCw size={15} className={`inline mr-2 ${busy ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="border rounded-lg bg-white dark:bg-neutral-900 dark:border-neutral-800 overflow-hidden">
          <div className="p-3 border-b dark:border-neutral-800">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search content..."
              className="w-full px-3 py-2 text-sm border rounded-md bg-transparent dark:border-neutral-700"
            />
            <div className="mt-2 text-xs text-neutral-500">{filtered.length} of {files.length} managed files</div>
          </div>
          <div className="max-h-[72vh] overflow-auto">
            {filtered.map((file) => (
              <button
                key={file.path}
                onClick={() => open(file)}
                disabled={busy}
                className={`block w-full text-left px-3 py-2 border-b dark:border-neutral-800 disabled:opacity-60 ${selected?.path === file.path && !creating ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
              >
                <div className="font-medium text-sm truncate">{file.path.replace(/^public\//, '')}</div>
                <div className="text-xs text-neutral-500">{formatBytes(file.size)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-lg bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              disabled={!creating || busy}
              className="flex-1 min-w-64 px-3 py-2 text-sm font-mono border rounded-md bg-transparent dark:border-neutral-700 disabled:opacity-70"
              aria-label="Content path"
            />
            <button
              disabled={!canSave}
              onClick={save}
              className="px-3 py-2 text-sm rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-40"
            >
              <Save size={15} className="inline mr-2" />{creating ? 'Create & Publish' : 'Save & Publish'}
            </button>
            <button disabled={!dirty || busy} onClick={revert} className="px-3 py-2 text-sm rounded-md border disabled:opacity-40">
              <RotateCcw size={15} className="inline mr-2" />Revert
            </button>
            {selected && (
              <button disabled={busy} onClick={remove} className="px-3 py-2 text-sm rounded-md border text-red-600 disabled:opacity-40">
                <Trash2 size={15} className="inline mr-2" />Delete
              </button>
            )}
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="px-3 py-2 text-sm rounded-md border">
                <ExternalLink size={15} className="inline mr-2" />Live
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-y py-2 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              {dirty && <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Unsaved changes</span>}
              {!dirty && (selected || creating) && <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Saved</span>}
              <span>{lineCount} lines</span>
              <span>{content.length.toLocaleString()} chars</span>
              {selected && <span>{formatBytes(selected.size)}</span>}
              {selected && <span title={selected.sha}>SHA {selected.sha.slice(0, 10)}</span>}
            </div>
            <div className="flex rounded-md border overflow-hidden dark:border-neutral-700">
              <button
                onClick={() => setMode('source')}
                className={`px-3 py-1.5 text-xs ${mode === 'source' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
              >
                <Code2 size={14} className="inline mr-1.5" />Source
              </button>
              <button
                onClick={() => setMode('preview')}
                className={`px-3 py-1.5 text-xs ${mode === 'preview' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
              >
                <Eye size={14} className="inline mr-1.5" />Preview
              </button>
            </div>
          </div>

          {(pathError || jsonError) && (
            <div className="p-3 text-sm rounded-md border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              <AlertTriangle size={15} className="inline mr-2" />{pathError || `JSON is invalid: ${jsonError}`}
            </div>
          )}

          {mode === 'source' ? (
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={busy || (!creating && !selected)}
              spellCheck={false}
              className="w-full min-h-[64vh] p-4 text-xs leading-5 font-mono border rounded-md bg-neutral-950 text-neutral-100 dark:border-neutral-700 disabled:opacity-50"
              placeholder="Select a file or create a new public/*.html, .md, .txt, or .json file."
            />
          ) : renderPreview()}

          <p className="text-xs text-neutral-500">
            HTML preview is sandboxed with script execution disabled. Saving writes through the protected Tayoca gateway and is verified against canonical Forgejo before success is reported.
          </p>
        </div>
      </div>
    </>
  );
};

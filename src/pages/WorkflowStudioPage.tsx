import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Play, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { n8nApi } from '../services/n8n';
import type { Workflow } from '../types';
import { useToast } from '../components/Toast';

const draftOf = (w: Workflow) => ({ name: w.name, nodes: w.nodes || [], connections: w.connections || {}, settings: w.settings || {}, ...(w.description ? { description: w.description } : {}) });
const blank = { name: 'New workflow', nodes: [], connections: {}, settings: {} };

export const WorkflowStudioPage: React.FC = () => {
  const toast = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [editor, setEditor] = useState(JSON.stringify(blank, null, 2));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(()=>workflows.filter(w=>w.name.toLowerCase().includes(search.toLowerCase())),[workflows,search]);
  const reload = async () => { const r=await n8nApi.getAllWorkflows(); setWorkflows(r.data || []); };
  useEffect(()=>{ reload().catch(e=>toast.error('Failed to load workflows',e.message)); },[toast]);
  const select = async (w: Workflow) => { setBusy(true); try { const full=await n8nApi.getWorkflow(w.id); setSelected(full); setEditor(JSON.stringify(draftOf(full),null,2)); setCreating(false); } finally { setBusy(false); } };
  const createNew=()=>{setSelected(null);setCreating(true);setEditor(JSON.stringify(blank,null,2));};
  const parse=()=>{ const d=JSON.parse(editor); if(!d.name||!Array.isArray(d.nodes)||!d.connections) throw new Error('Workflow must contain name, nodes[], and connections.'); return d; };
  const save=async()=>{setBusy(true);try{const d=parse();const saved=creating?await n8nApi.createWorkflow(d):await n8nApi.updateWorkflow(selected!.id,d);toast.success(creating?'Workflow created':'Draft saved and verified',saved.name);await reload();await select(saved);}catch(e){toast.error('Save failed',e instanceof Error?e.message:'Unknown error');}finally{setBusy(false);}};
  const publish=async()=>{if(!selected)return;setBusy(true);try{const w=selected.active?await n8nApi.unpublishWorkflow(selected.id):await n8nApi.publishWorkflow(selected.id);toast.success(w.active?'Workflow published':'Workflow unpublished',w.name);await reload();await select(w);}catch(e){toast.error('Publish action failed',e instanceof Error?e.message:'Unknown error');}finally{setBusy(false);}};
  const run=async()=>{if(!selected)return;try{await n8nApi.triggerWorkflow(selected.id);toast.success('Workflow run requested',selected.name);}catch(e){toast.error('Run failed',e instanceof Error?e.message:'This workflow may require its production trigger instead.');}};
  const remove=async()=>{if(!selected||!window.confirm(`Permanently delete ${selected.name}?`))return;setBusy(true);try{await n8nApi.deleteWorkflow(selected.id);toast.success('Workflow deleted',selected.name);setSelected(null);await reload();}catch(e){toast.error('Delete failed',e instanceof Error?e.message:'Unknown error');}finally{setBusy(false);}};

  return (
    <>
      <PageHeader
        title="Workflow Studio"
        description="Create, edit, verify, publish and operate n8n workflows without exposing an n8n API key"
        actions={
          <div className="flex gap-2">
            <button onClick={createNew} className="app-btn app-btn-primary">
              <FilePlus2 size={15} /> New
            </button>
            <button onClick={()=>reload()} className="app-btn app-btn-secondary">
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        {/* Workflow List */}
        <div className="app-card overflow-hidden">
          <div className="border-b border-neutral-200 dark:border-neutral-800 p-3">
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Search workflows..."
              className="app-input"
            />
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {filtered.map(w => (
              <button
                key={w.id}
                onClick={()=>select(w)}
                className={`block w-full border-b border-neutral-100 px-4 py-3 text-left transition-colors dark:border-neutral-800 ${
                  selected?.id===w.id
                    ? 'bg-brand-50 dark:bg-brand-500/10 border-l-2 border-l-brand-500'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{w.name}</span>
                  <span className={`app-badge ${w.active ? 'app-badge-success' : 'app-badge-neutral'}`}>{w.active ? 'LIVE' : 'DRAFT'}</span>
                </div>
                <div className="mt-1 truncate text-xs font-mono text-neutral-400 dark:text-neutral-500">{w.id}</div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                No workflows found
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="app-card space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy||(!creating&&!selected)}
              onClick={save}
              className="app-btn app-btn-primary disabled:opacity-50"
            >
              <Save size={15} /> Save Draft
            </button>
            {selected && (
              <>
                <button disabled={busy} onClick={publish} className="app-btn app-btn-secondary disabled:opacity-50">
                  <Send size={15} /> {selected.active ? 'Unpublish' : 'Publish'}
                </button>
                <button disabled={busy} onClick={run} className="app-btn app-btn-secondary disabled:opacity-50">
                  <Play size={15} /> Run
                </button>
                <button disabled={busy} onClick={remove} className="app-btn app-btn-danger disabled:opacity-50">
                  <Trash2 size={15} /> Delete
                </button>
              </>
            )}
          </div>

          <div className="app-panel p-3.5">
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">Save is fail-closed.</span> The control center reads the workflow back from n8n and verifies the persisted definition before reporting success. Publishing is always a separate action.
            </p>
          </div>

          <textarea
            value={editor}
            onChange={e=>setEditor(e.target.value)}
            disabled={busy}
            spellCheck={false}
            className="min-h-[62vh] w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#24201b] dark:bg-[#14110d] p-4 font-mono text-xs leading-5 text-[#f5efe4] outline-none focus:border-brand-500 dark:focus:border-brand-400"
          />
        </div>
      </div>
    </>
  );
};

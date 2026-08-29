import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import {
  createPageSection,
  duplicatePageSection,
  type CmsPageSection,
  type CmsSectionAction,
  type CmsSectionItem,
  type CmsSectionType,
} from '../../lib/cmsSections';

const inputClass = 'app-input';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500';

const typeLabel: Record<CmsSectionType, string> = {
  cards: 'Card grid', steps: 'Steps / process', cta: 'Call to action', content: 'Text section', custom: 'Custom layout',
};

const itemSeed = (type: CmsSectionType): CmsSectionItem => type === 'steps'
  ? { label: '', title: 'New step', body: 'Describe what happens in this step.', href: '', cta: '' }
  : { label: 'Category', title: 'New card', body: 'Describe this item clearly.', href: '#', cta: 'Learn more' };

const actionSeed: CmsSectionAction = { label: 'Learn more', href: '#' };

export const PageSectionsEditor: React.FC<{
  sections: CmsPageSection[];
  onChange: (sections: CmsPageSection[]) => void;
  disabled?: boolean;
}> = ({ sections, onChange, disabled }) => {
  const [expanded, setExpanded] = useState<string | null>(sections[0]?.id || null);

  const replace = (id: string, patch: Partial<CmsPageSection>) => onChange(sections.map((section) => section.id === id ? { ...section, ...patch } : section));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = (type: Exclude<CmsSectionType, 'custom'>) => {
    const next = createPageSection(type);
    onChange([...sections, next]);
    setExpanded(next.id);
  };
  const duplicate = (section: CmsPageSection, index: number) => {
    const copy = duplicatePageSection(section);
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setExpanded(copy.id);
  };
  const remove = (section: CmsPageSection) => {
    if (!window.confirm(`Remove “${section.heading || typeLabel[section.type]}” from this page? The change is not published until you click Publish changes.`)) return;
    onChange(sections.filter((item) => item.id !== section.id));
    if (expanded === section.id) setExpanded(null);
  };
  const updateItem = (section: CmsPageSection, index: number, patch: Partial<CmsSectionItem>) => {
    const items = section.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    replace(section.id, { items });
  };
  const updateAction = (section: CmsPageSection, index: number, patch: Partial<CmsSectionAction>) => {
    const actions = section.actions.map((action, actionIndex) => actionIndex === index ? { ...action, ...patch } : action);
    replace(section.id, { actions });
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Page sections</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">Reorder and edit the blocks below without touching HTML. Your header, footer, analytics and site scripts stay outside this editor.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {([['content', 'Text'], ['cards', 'Cards'], ['steps', 'Steps'], ['cta', 'CTA']] as Array<[Exclude<CmsSectionType, 'custom'>, string]>).map(([type, label]) =>
          <button key={type} type="button" disabled={disabled} onClick={() => add(type)} className="app-btn app-btn-secondary !py-1.5 !text-xs disabled:opacity-40"><Plus size={13} /> {label}</button>
        )}
      </div>
    </div>

    {!sections.length ? <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-neutral-700"><div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">No editable sections yet</div><p className="mt-1 text-sm text-neutral-500">Add a text, card, steps or CTA section. The page hero remains managed in the Content tab.</p></div> : null}

    <div className="space-y-3">
      {sections.map((section, index) => {
        const open = expanded === section.id;
        return <article key={section.id} className="overflow-hidden app-card">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => setExpanded(open ? null : section.id)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{section.heading || `Untitled ${typeLabel[section.type]}`}</div>
              <div className="mt-0.5 text-xs text-neutral-500">{typeLabel[section.type]} · Section {index + 1}</div>
            </button>
            <div className="flex items-center gap-1">
              <button type="button" title="Move up" disabled={disabled || index === 0} onClick={() => move(index, -1)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-25 dark:hover:bg-neutral-800"><ArrowUp size={15} /></button>
              <button type="button" title="Move down" disabled={disabled || index === sections.length - 1} onClick={() => move(index, 1)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-25 dark:hover:bg-neutral-800"><ArrowDown size={15} /></button>
              <button type="button" title="Duplicate" disabled={disabled} onClick={() => duplicate(section, index)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-25 dark:hover:bg-neutral-800"><Copy size={15} /></button>
              <button type="button" title="Remove" disabled={disabled} onClick={() => remove(section)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-25 dark:hover:bg-red-950/30"><Trash2 size={15} /></button>
            </div>
          </div>

          {open && <div className="border-t border-neutral-200 p-4 dark:border-neutral-800 lg:p-5">
            {section.type === 'custom' && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">This block uses a custom Tayoca layout. You can safely reorder, duplicate or remove it here. Use Advanced only if its internal layout needs changing.</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <label><span className={labelClass}>Eyebrow / category</span><input disabled={disabled} value={section.eyebrow} onChange={(event) => replace(section.id, { eyebrow: event.target.value })} className={inputClass} /></label>
              <label><span className={labelClass}>Section heading</span><input disabled={disabled} value={section.heading} onChange={(event) => replace(section.id, { heading: event.target.value })} className={inputClass} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Introduction</span><textarea disabled={disabled} value={section.intro} onChange={(event) => replace(section.id, { intro: event.target.value })} rows={3} className={`${inputClass} resize-y`} /></label>
            </div>

            {(section.type === 'cards' || section.type === 'steps') && <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between"><div><h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{section.type === 'cards' ? 'Cards' : 'Steps'}</h4><p className="mt-0.5 text-xs text-neutral-500">Add, remove or rewrite individual items.</p></div><button type="button" disabled={disabled} onClick={() => replace(section.id, { items: [...section.items, itemSeed(section.type)] })} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-neutral-700"><Plus size={12} /> Add item</button></div>
              {section.items.map((item, itemIndex) => <div key={`${section.id}-item-${itemIndex}`} className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
                <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{section.type === 'cards' ? `Card ${itemIndex + 1}` : `Step ${itemIndex + 1}`}</span><button type="button" disabled={disabled || section.items.length <= 1} onClick={() => replace(section.id, { items: section.items.filter((_, i) => i !== itemIndex) })} className="text-xs font-medium text-red-500 disabled:opacity-30">Remove</button></div>
                <div className="grid gap-3 md:grid-cols-2">
                  {section.type === 'cards' && <label><span className={labelClass}>Label</span><input disabled={disabled} value={item.label} onChange={(e) => updateItem(section, itemIndex, { label: e.target.value })} className={inputClass} /></label>}
                  <label className={section.type === 'steps' ? 'md:col-span-2' : ''}><span className={labelClass}>Title</span><input disabled={disabled} value={item.title} onChange={(e) => updateItem(section, itemIndex, { title: e.target.value })} className={inputClass} /></label>
                  <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea disabled={disabled} value={item.body} onChange={(e) => updateItem(section, itemIndex, { body: e.target.value })} rows={2} className={`${inputClass} resize-y`} /></label>
                  {section.type === 'cards' && <><label><span className={labelClass}>Link</span><input disabled={disabled} value={item.href} onChange={(e) => updateItem(section, itemIndex, { href: e.target.value })} className={inputClass} /></label><label><span className={labelClass}>Link text</span><input disabled={disabled} value={item.cta} onChange={(e) => updateItem(section, itemIndex, { cta: e.target.value })} className={inputClass} /></label></>}
                </div>
              </div>)}
            </div>}

            {section.actions.length > 0 && <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between"><div><h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Buttons</h4><p className="mt-0.5 text-xs text-neutral-500">Manage the calls to action in this section.</p></div><button type="button" disabled={disabled} onClick={() => replace(section.id, { actions: [...section.actions, { ...actionSeed }] })} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-neutral-700"><Plus size={12} /> Add button</button></div>
              {section.actions.map((action, actionIndex) => <div key={`${section.id}-action-${actionIndex}`} className="grid gap-3 rounded-xl bg-neutral-50 p-4 md:grid-cols-[1fr_1fr_auto] dark:bg-neutral-800/50"><label><span className={labelClass}>Button text</span><input disabled={disabled} value={action.label} onChange={(e) => updateAction(section, actionIndex, { label: e.target.value })} className={inputClass} /></label><label><span className={labelClass}>Destination</span><input disabled={disabled} value={action.href} onChange={(e) => updateAction(section, actionIndex, { href: e.target.value })} className={inputClass} /></label><button type="button" disabled={disabled || section.actions.length <= 1} onClick={() => replace(section.id, { actions: section.actions.filter((_, i) => i !== actionIndex) })} className="self-end rounded-lg px-3 py-2.5 text-xs font-semibold text-red-500 disabled:opacity-30">Remove</button></div>)}
            </div>}
          </div>}
        </article>;
      })}
    </div>
  </div>;
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, History, Plus, RefreshCw, RotateCcw, Save, Settings2, Trash2 } from 'lucide-react';
import { cmsApi, type ContentDocument, type ContentRevision } from '../../services/cms';
import { useToast } from '../Toast';

type SiteLink = { label: string; href: string; visible?: boolean };
type SiteSettings = {
  schemaVersion: 1;
  brand: { name: string; homeHref: string };
  navigation: SiteLink[];
  headerCta: { label: string; href: string; visible: boolean };
  footer: { description: string; location: string; copyrightName: string; explore: SiteLink[]; connect: SiteLink[] };
  contact: { supportEmail: string; bookingUrl: string; whatsappUrl: string };
};

const SETTINGS_PATH = 'public/data/site-settings.json';
const inputClass = 'w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-neutral-500 dark:focus:ring-neutral-800';
const labelClass = 'mb-1.5 block text-sm font-medium text-neutral-800 dark:text-neutral-200';

const parseSettings = (document: ContentDocument): SiteSettings => {
  const parsed = JSON.parse(document.content) as Partial<SiteSettings>;
  if (parsed.schemaVersion !== 1 || !parsed.brand || !Array.isArray(parsed.navigation) || !parsed.headerCta || !parsed.footer || !parsed.contact) throw new Error('The site settings file is not using the supported schema.');
  return parsed as SiteSettings;
};

const isSafeHref = (value: string): boolean => /^\/(?!\/)|^https?:\/\/|^mailto:/.test(value.trim());

const LinkListEditor: React.FC<{
  title: string;
  description: string;
  value: SiteLink[];
  onChange: (value: SiteLink[]) => void;
  showVisibility?: boolean;
  disabled?: boolean;
}> = ({ title, description, value, onChange, showVisibility = false, disabled = false }) => {
  const update = (index: number, patch: Partial<SiteLink>) => onChange(value.map((item, i) => i === index ? { ...item, ...patch } : item));
  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= value.length) return;
    const rows = [...value];
    [rows[index], rows[next]] = [rows[next], rows[index]];
    onChange(rows);
  };
  return (
    <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3><p className="mt-1 text-sm text-neutral-500">{description}</p></div>
        <button type="button" onClick={() => onChange([...value, { label: 'New link', href: '/', ...(showVisibility ? { visible: true } : {}) }])} disabled={disabled || value.length >= 12} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"><Plus size={14} /> Add link</button>
      </div>
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={`${index}-${item.label}`} className="grid gap-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60 md:grid-cols-[1fr_1.4fr_auto]">
            <input aria-label={`${title} label ${index + 1}`} value={item.label} onChange={(e) => update(index, { label: e.target.value })} disabled={disabled} className={inputClass} placeholder="Label" />
            <div><input aria-label={`${title} destination ${index + 1}`} value={item.href} onChange={(e) => update(index, { href: e.target.value })} disabled={disabled} className={`${inputClass} ${item.href && !isSafeHref(item.href) ? 'border-red-400' : ''}`} placeholder="/page.html or https://…" />{item.href && !isSafeHref(item.href) && <div className="mt-1 text-xs text-red-600">Use an internal /path, https:// URL or mailto: link.</div>}</div>
            <div className="flex items-center justify-end gap-1">
              {showVisibility && <label className="mr-2 inline-flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"><input type="checkbox" checked={item.visible !== false} onChange={(e) => update(index, { visible: e.target.checked })} disabled={disabled} /> Visible</label>}
              <button type="button" title="Move up" onClick={() => move(index, -1)} disabled={disabled || index === 0} className="rounded-lg border border-neutral-200 p-2 disabled:opacity-30 dark:border-neutral-700"><ArrowUp size={14} /></button>
              <button type="button" title="Move down" onClick={() => move(index, 1)} disabled={disabled || index === value.length - 1} className="rounded-lg border border-neutral-200 p-2 disabled:opacity-30 dark:border-neutral-700"><ArrowDown size={14} /></button>
              <button type="button" title="Remove" onClick={() => onChange(value.filter((_, i) => i !== index))} disabled={disabled} className="rounded-lg border border-red-200 p-2 text-red-600 disabled:opacity-30 dark:border-red-900/60 dark:text-red-300"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const GlobalSiteSettingsEditor: React.FC = () => {
  const toast = useToast();
  const [document, setDocument] = useState<ContentDocument | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [original, setOriginal] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);

  const fingerprint = useMemo(() => settings ? JSON.stringify(settings) : '', [settings]);
  const dirty = Boolean(settings && fingerprint !== original);

  const load = useCallback(async (quiet = false) => {
    setBusy(true);
    try {
      const nextDocument = await cmsApi.get(SETTINGS_PATH);
      const next = parseSettings(nextDocument);
      setDocument(nextDocument);
      setSettings(next);
      setOriginal(JSON.stringify(next));
      if (!quiet) toast.success('Global site settings refreshed');
    } catch (error) {
      toast.error('Could not load global site settings', error instanceof Error ? error.message : 'Unknown error');
    } finally { setBusy(false); }
  }, [toast]);

  useEffect(() => { void load(true); }, [load]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!dirty) return; event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const loadHistory = useCallback(async (quiet = false) => {
    setHistoryBusy(true);
    try {
      const rows = await cmsApi.history(SETTINGS_PATH, 20);
      setRevisions(rows);
      if (!quiet) toast.success('Settings history refreshed');
    } catch (error) {
      toast.error('Could not load settings history', error instanceof Error ? error.message : 'Unknown error');
    } finally { setHistoryBusy(false); }
  }, [toast]);

  useEffect(() => { if (document) void loadHistory(true); }, [document?.sha, loadHistory]);

  const restoreRevision = async (revision: ContentRevision) => {
    if (!document || busy || historyBusy) return;
    if (dirty && !window.confirm('Restore this version and discard your unsaved settings?')) return;
    if (!window.confirm(`Restore settings from ${revision.sha.slice(0, 10)}? This creates a new revision, so the restore can be undone.`)) return;
    setHistoryBusy(true);
    try {
      const historical = await cmsApi.getRevision(SETTINGS_PATH, revision.sha);
      const parsed = parseSettings(historical);
      const content = `${JSON.stringify(parsed, null, 2)}\n`;
      await cmsApi.update(SETTINGS_PATH, document.sha, content);
      const refreshed = await cmsApi.get(SETTINGS_PATH);
      const next = parseSettings(refreshed);
      setDocument(refreshed);
      setSettings(next);
      setOriginal(JSON.stringify(next));
      toast.success('Global site settings restored', `Restored ${revision.sha.slice(0, 10)} as a new revision.`);
      await loadHistory(true);
    } catch (error) {
      toast.error('Could not restore settings', error instanceof Error ? error.message : 'Unknown error');
    } finally { setHistoryBusy(false); }
  };

  const publish = async () => {
    if (!document || !settings || !dirty || busy) return;
    const invalid = [...settings.navigation, ...settings.footer.explore, ...settings.footer.connect].find((item) => !item.label.trim() || !isSafeHref(item.href));
    if (invalid || !isSafeHref(settings.brand.homeHref) || !isSafeHref(settings.headerCta.href) || !isSafeHref(settings.contact.bookingUrl) || !isSafeHref(settings.contact.whatsappUrl)) {
      toast.error('Fix invalid links before publishing', 'Links must use an internal /path, https:// URL or mailto: where applicable.');
      return;
    }
    setBusy(true);
    try {
      const content = `${JSON.stringify(settings, null, 2)}\n`;
      const result = await cmsApi.update(SETTINGS_PATH, document.sha, content);
      const refreshed = await cmsApi.get(SETTINGS_PATH);
      const next = parseSettings(refreshed);
      setDocument(refreshed);
      setSettings(next);
      setOriginal(JSON.stringify(next));
      toast.success('Global site settings published', result.sha ? `Revision ${result.sha.slice(0, 10)}` : 'The shared site shell will use the new settings.');
    } catch (error) { toast.error('Could not publish global site settings', error instanceof Error ? error.message : 'Unknown error'); }
    finally { setBusy(false); }
  };

  if (!settings) return <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-900"><RefreshCw size={22} className={`mx-auto mb-3 ${busy ? 'animate-spin' : ''}`} /><div className="text-sm text-neutral-500">Loading global site settings…</div><button type="button" onClick={() => void load()} disabled={busy} className="mt-4 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium dark:border-neutral-700">Retry</button></div>;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3"><div className="rounded-xl bg-neutral-100 p-2.5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"><Settings2 size={20} /></div><div><h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Global Site Settings</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">Change navigation, the site-wide call to action, footer and contact destinations once. Existing static HTML remains the fallback if this settings file cannot be loaded.</p></div></div>
          <div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Refresh</button><button type="button" onClick={() => { if (!dirty || window.confirm('Discard unsaved global settings?')) void load(true); }} disabled={!dirty || busy} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"><RotateCcw size={14} /> Revert</button><button type="button" onClick={() => void publish()} disabled={!dirty || busy} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"><Save size={14} /> {busy ? 'Publishing…' : 'Publish settings'}</button></div>
        </div>
      </div>

      <section className="grid gap-5 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-2">
        <label><span className={labelClass}>Brand name</span><input value={settings.brand.name} onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, name: e.target.value } })} disabled={busy} className={inputClass} /></label>
        <label><span className={labelClass}>Brand home link</span><input value={settings.brand.homeHref} onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, homeHref: e.target.value } })} disabled={busy} className={inputClass} /></label>
        <label><span className={labelClass}>Header button text</span><input value={settings.headerCta.label} onChange={(e) => setSettings({ ...settings, headerCta: { ...settings.headerCta, label: e.target.value } })} disabled={busy} className={inputClass} /></label>
        <label><span className={labelClass}>Header button destination</span><input value={settings.headerCta.href} onChange={(e) => setSettings({ ...settings, headerCta: { ...settings.headerCta, href: e.target.value } })} disabled={busy} className={inputClass} /></label>
        <label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200"><input type="checkbox" checked={settings.headerCta.visible} onChange={(e) => setSettings({ ...settings, headerCta: { ...settings.headerCta, visible: e.target.checked } })} disabled={busy} /> Show the header call-to-action</label>
      </section>

      <LinkListEditor title="Primary navigation" description="Reorder, rename, hide or add links in the shared Tayoca navigation." value={settings.navigation} onChange={(navigation) => setSettings({ ...settings, navigation })} showVisibility disabled={busy} />

      <section className="grid gap-5 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-2">
        <div className="md:col-span-2"><h3 className="text-base font-semibold text-neutral-900 dark:text-white">Footer identity</h3><p className="mt-1 text-sm text-neutral-500">The shared footer copy and company location.</p></div>
        <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea rows={3} value={settings.footer.description} onChange={(e) => setSettings({ ...settings, footer: { ...settings.footer, description: e.target.value } })} disabled={busy} className={inputClass} /></label>
        <label><span className={labelClass}>Location</span><input value={settings.footer.location} onChange={(e) => setSettings({ ...settings, footer: { ...settings.footer, location: e.target.value } })} disabled={busy} className={inputClass} /></label>
        <label><span className={labelClass}>Copyright name</span><input value={settings.footer.copyrightName} onChange={(e) => setSettings({ ...settings, footer: { ...settings.footer, copyrightName: e.target.value } })} disabled={busy} className={inputClass} /></label>
      </section>

      <LinkListEditor title="Footer — Explore" description="Main site destinations shown in the Explore column." value={settings.footer.explore} onChange={(explore) => setSettings({ ...settings, footer: { ...settings.footer, explore } })} disabled={busy} />
      <LinkListEditor title="Footer — Connect" description="Contact and trust destinations shown in the Connect column." value={settings.footer.connect} onChange={(connect) => setSettings({ ...settings, footer: { ...settings.footer, connect } })} disabled={busy} />

      <section className="grid gap-5 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-2">
        <div className="md:col-span-2"><h3 className="text-base font-semibold text-neutral-900 dark:text-white">Contact destinations</h3><p className="mt-1 text-sm text-neutral-500">Canonical contact values available to the shared site runtime and future CMS-managed calls to action.</p></div>
        <label><span className={labelClass}>Support email</span><input type="email" value={settings.contact.supportEmail} onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, supportEmail: e.target.value } })} disabled={busy} className={inputClass} /></label>
        <label><span className={labelClass}>Booking URL</span><input value={settings.contact.bookingUrl} onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, bookingUrl: e.target.value } })} disabled={busy} className={inputClass} /></label>
        <label className="md:col-span-2"><span className={labelClass}>WhatsApp URL</span><input value={settings.contact.whatsappUrl} onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, whatsappUrl: e.target.value } })} disabled={busy} className={inputClass} /></label>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white"><History size={17} /> Settings history</h3><p className="mt-1 text-sm text-neutral-500">Every publish is preserved. Restore an earlier configuration without opening Git or the raw data editor.</p></div>
          <button type="button" onClick={() => void loadHistory()} disabled={historyBusy || busy} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"><RefreshCw size={14} className={historyBusy ? 'animate-spin' : ''} /> Refresh history</button>
        </div>
        {historyBusy && revisions.length === 0 ? <div className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-800/60">Loading previous settings…</div> : revisions.length === 0 ? <div className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-800/60">No settings history is available yet.</div> : <div className="space-y-2">{revisions.map((revision, index) => <div key={revision.sha} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-neutral-900 dark:text-white">{index === 0 ? 'Current publish' : `Previous version ${index}`}</span><code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{revision.sha.slice(0, 10)}</code></div><div className="mt-1 truncate text-xs text-neutral-500">{revision.message || 'Settings update'} · {revision.author || 'Tayoca'} · {revision.created ? new Date(revision.created).toLocaleString() : 'Date unavailable'}</div></div><button type="button" onClick={() => void restoreRevision(revision)} disabled={index === 0 || historyBusy || busy} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"><RotateCcw size={14} /> Restore</button></div>)}</div>}
      </section>

      <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500 dark:bg-neutral-800/60">Canonical file: <code>{SETTINGS_PATH}</code>{document ? ` · ${document.sha.slice(0, 10)}` : ''}</div>
    </div>
  );
};

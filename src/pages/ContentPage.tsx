import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  ChevronRight,
  Database,
  FileText,
  Globe2,
  History,
  Eye,
  LayoutGrid,
  Images,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/layout';
import { RichTextEditor } from '../components/cms/RichTextEditor';
import { MediaLibrary, MediaSelect } from '../components/cms/MediaLibrary';
import { PageSectionsEditor } from '../components/cms/PageSectionsEditor';
import { GlobalSiteSettingsEditor } from '../components/cms/GlobalSiteSettingsEditor';
import { cmsApi, type ContentDocument, type ContentEntry, type ContentRevision } from '../services/cms';
import { useToast } from '../components/Toast';
import {
  applyCmsFields,
  classifyContent,
  contentSectionLabel,
  extractCmsFields,
  friendlyContentName,
  liveUrlForPath,
  type CmsContentKind,
  type CmsEditableFields,
} from '../lib/cmsDocument';
import {
  applyPageSections,
  extractPageSections,
  pageSectionsFingerprint,
  type CmsPageSection,
} from '../lib/cmsSections';

type CmsCategory = 'all' | 'page' | 'blog' | 'product' | 'media' | 'data' | 'settings';
type EditorTab = 'content' | 'sections' | 'seo' | 'preview' | 'history' | 'advanced';

const categoryConfig: Array<{ id: CmsCategory; label: string; description: string; icon: React.ElementType }> = [
  { id: 'all', label: 'All content', description: 'Everything published on Tayoca', icon: LayoutGrid },
  { id: 'page', label: 'Pages', description: 'Main website pages', icon: FileText },
  { id: 'blog', label: 'Blog', description: 'Insights and articles', icon: BookOpen },
  { id: 'product', label: 'Products', description: 'Product landing pages', icon: Boxes },
  { id: 'media', label: 'Media', description: 'Images and visual assets', icon: Images },
  { id: 'data', label: 'Site data', description: 'Structured site content', icon: Database },
  { id: 'settings', label: 'Site settings', description: 'Navigation, footer and contact', icon: Settings2 },
];

const emptyFields: CmsEditableFields = {
  browserTitle: '', metaDescription: '', socialTitle: '', socialDescription: '', eyebrow: '', headline: '', accent: '',
  intro: '', articleHtml: '', price: '', purchaseUrl: '', purchaseLabel: '', coverImage: '',
};

const slugify = (value: string): string => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const starterDocument = (kind: CmsContentKind, title = 'New Tayoca Page'): string => {
  const safeTitle = title.replace(/[<>]/g, '').trim() || 'New Tayoca Page';
  const isProduct = kind === 'product';
  const isBlog = kind === 'blog';
  const description = `Learn more about ${safeTitle} from Tayoca.`;
  const stylesheet = isProduct ? '/assets/css/product-detail.css' : '/assets/css/growth-os.css';
  const body = isBlog
    ? `<main id="main"><section class="hero"><div class="hero-inner"><p class="eyebrow">Insights</p><h1>${safeTitle}</h1><p class="lede">Add a short introduction for this article.</p></div></section><section class="section"><article class="container article"><h2>Start writing</h2><p>Add your article content here.</p></article></section></main>`
    : isProduct
      ? `<main id="main"><section class="hero"><div><p class="eyebrow">Tayoca product</p><h1>${safeTitle}</h1><p class="lede">Describe what this product helps the customer achieve.</p><div class="price">$29</div><div class="cta-row"><a class="btn" href="https://tayoca.gumroad.com/" target="_blank" rel="noopener noreferrer" data-event="product_purchase_click">Buy securely</a></div></div><div class="cover-frame"><img class="cover" src="/assets/og-image.png" alt="${safeTitle}"></div></section></main>`
      : `<main id="main"><section class="hero"><div class="hero-inner"><p class="eyebrow">Tayoca</p><h1>${safeTitle}</h1><p class="lede">Add a clear introduction for this page.</p></div></section><section class="section"><div class="container"><h2>Page content</h2><p>Add the information visitors need here.</p></div></section></main>`;

  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${safeTitle} | Tayoca</title>\n<meta name="description" content="${description}">\n<meta property="og:title" content="${safeTitle} | Tayoca">\n<meta property="og:description" content="${description}">\n<meta property="og:type" content="${isBlog ? 'article' : 'website'}">\n<link rel="icon" href="/favicon.ico">\n<link rel="stylesheet" href="${stylesheet}">\n${isProduct ? '<link rel="stylesheet" href="/assets/css/site-shell.css">' : ''}\n</head>\n<body>\n<a class="skip-link" href="#main">Skip to content</a>\n<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="Tayoca home">TAYOCA</a><nav class="primary-nav" aria-label="Primary navigation"><a href="/services.html">Services</a><a href="/assessments.html">Assessments</a><a href="/results.html">Results</a><a href="/products.html">Products</a><a href="/insights.html">Insights</a><a href="/about.html">About</a></nav></div></header>\n${body}\n<footer><strong>TAYOCA</strong><br>Ontario, Canada.</footer>\n<script defer src="/tayoca-site.js"></script>\n</body>\n</html>\n`;
};

const inputClass = 'app-input';
const labelClass = 'mb-1.5 block text-sm font-medium text-neutral-800 dark:text-neutral-200';

export const ContentPage: React.FC = () => {
  const toast = useToast();
  const [files, setFiles] = useState<ContentEntry[]>([]);
  const [selected, setSelected] = useState<ContentDocument | null>(null);
  const [source, setSource] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [path, setPath] = useState('');
  const [fields, setFields] = useState<CmsEditableFields>(emptyFields);
  const [originalFields, setOriginalFields] = useState<CmsEditableFields>(emptyFields);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CmsCategory>('all');
  const [tab, setTab] = useState<EditorTab>('content');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creationKind, setCreationKind] = useState<CmsContentKind>('page');
  const [autoSlug, setAutoSlug] = useState(true);
  const [mediaCount, setMediaCount] = useState<number | null>(null);
  const [sections, setSections] = useState<CmsPageSection[]>([]);
  const [originalSections, setOriginalSections] = useState<CmsPageSection[]>([]);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [revisionPreview, setRevisionPreview] = useState<{ revision: ContentRevision; document: ContentDocument } | null>(null);

  const currentKind = creating ? creationKind : classifyContent(path || selected?.path || '');
  const isManagedHtml = ['page', 'blog', 'product'].includes(currentKind);
  const renderedContent = useMemo(() => {
    if (!isManagedHtml) return source;
    const withFields = applyCmsFields(source, path, fields);
    return currentKind === 'page' ? applyPageSections(withFields, sections) : withFields;
  }, [currentKind, fields, isManagedHtml, path, sections, source]);
  const sectionsDirty = currentKind === 'page' && pageSectionsFingerprint(sections) !== pageSectionsFingerprint(originalSections);
  const structuredDirty = JSON.stringify(fields) !== JSON.stringify(originalFields) || sectionsDirty;
  const dirty = creating ? Boolean(renderedContent.trim()) : Boolean(selected && (source !== originalContent || structuredDirty));
  const liveUrl = liveUrlForPath(path);

  const entries = useMemo(() => files
    .filter((file) => file.path !== 'public/data/site-settings.json')
    .map((file) => ({
      ...file,
      kind: classifyContent(file.path),
      name: friendlyContentName(file.path),
    })), [files]);

  const counts = useMemo(() => ({
    all: entries.length,
    page: entries.filter((item) => item.kind === 'page').length,
    blog: entries.filter((item) => item.kind === 'blog').length,
    product: entries.filter((item) => item.kind === 'product').length,
    media: mediaCount,
    data: entries.filter((item) => item.kind === 'data').length,
    settings: 1,
  }), [entries, mediaCount]);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const categoryMatch = category === 'all' || entry.kind === category;
      const searchMatch = !query || entry.name.toLowerCase().includes(query) || entry.path.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }, [category, entries, search]);

  const loadFiles = useCallback(async (quiet = false) => {
    setBusy(true);
    try {
      setFiles(await cmsApi.list());
      if (!quiet) toast.success('Website content refreshed');
    } catch (error) {
      toast.error('Could not load website content', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }, [toast]);

  useEffect(() => { void loadFiles(true); }, [loadFiles]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const confirmDiscard = (): boolean => !dirty || window.confirm('Discard your unsaved changes?');

  const openEntry = async (entry: ContentEntry) => {
    if (selected?.path === entry.path && !creating) return;
    if (!confirmDiscard()) return;
    setBusy(true);
    try {
      const document = await cmsApi.get(entry.path);
      setSelected(document);
      setPath(document.path);
      setSource(document.content);
      setOriginalContent(document.content);
      const nextFields = extractCmsFields(document.content, document.path);
      const nextSections = classifyContent(document.path) === 'page' ? extractPageSections(document.content) : [];
      setFields(nextFields);
      setOriginalFields(nextFields);
      setSections(nextSections);
      setOriginalSections(nextSections);
      setRevisions([]);
      setRevisionPreview(null);
      setCreating(false);
      setTab('content');
      setAutoSlug(false);
    } catch (error) {
      toast.error('Could not open content', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const beginCreate = () => {
    if (!confirmDiscard()) return;
    const kind: CmsContentKind = category === 'blog' || category === 'product' ? category : 'page';
    const starter = starterDocument(kind);
    const folder = kind === 'blog' ? 'blog/' : kind === 'product' ? 'products/' : '';
    const nextPath = `public/${folder}new-page.html`;
    setSelected(null);
    setCreating(true);
    setCreationKind(kind);
    setPath(nextPath);
    setSource(starter);
    setOriginalContent('');
    const nextFields = extractCmsFields(starter, nextPath);
    const nextSections = kind === 'page' ? extractPageSections(starter) : [];
    setFields(nextFields);
    setOriginalFields(emptyFields);
    setSections(nextSections);
    setOriginalSections([]);
    setRevisions([]);
    setRevisionPreview(null);
    setTab('content');
    setAutoSlug(true);
  };

  const changeCreationKind = (kind: CmsContentKind) => {
    if (!creating || !['page', 'blog', 'product'].includes(kind)) return;
    const title = fields.headline || 'New Tayoca Page';
    const starter = starterDocument(kind, title);
    const folder = kind === 'blog' ? 'blog/' : kind === 'product' ? 'products/' : '';
    const slug = slugify(title) || 'new-page';
    const nextPath = `public/${folder}${slug}.html`;
    setCreationKind(kind);
    setPath(nextPath);
    setSource(starter);
    setFields(extractCmsFields(starter, nextPath));
    setOriginalFields(emptyFields);
    setSections(kind === 'page' ? extractPageSections(starter) : []);
    setOriginalSections([]);
    setRevisions([]);
    setRevisionPreview(null);
    setTab('content');
  };

  const updateField = <K extends keyof CmsEditableFields>(key: K, value: CmsEditableFields[K]) => {
    setFields((previous) => ({ ...previous, [key]: value }));
    if (creating && key === 'headline' && autoSlug && typeof value === 'string') {
      const slug = slugify(value) || 'new-page';
      const folder = creationKind === 'blog' ? 'blog/' : creationKind === 'product' ? 'products/' : '';
      setPath(`public/${folder}${slug}.html`);
    }
  };

  const handleAdvancedSource = (value: string) => {
    setSource(value);
    if (isManagedHtml) setFields(extractCmsFields(value, path));
    setSections(classifyContent(path) === 'page' ? extractPageSections(value) : []);
  };

  const loadHistory = async () => {
    if (!selected || creating || historyBusy) return;
    setHistoryBusy(true);
    try {
      setRevisions(await cmsApi.history(selected.path, 20));
    } catch (error) {
      toast.error('Could not load version history', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setHistoryBusy(false);
    }
  };

  const previewRevision = async (revision: ContentRevision) => {
    if (!selected || historyBusy) return;
    setHistoryBusy(true);
    try {
      const document = await cmsApi.getRevision(selected.path, revision.sha);
      setRevisionPreview({ revision, document });
    } catch (error) {
      toast.error('Could not open this version', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setHistoryBusy(false);
    }
  };

  const restoreRevision = async (revision: ContentRevision) => {
    if (!selected || busy || historyBusy) return;
    const created = revision.created ? new Date(revision.created).toLocaleString() : revision.sha.slice(0, 10);
    if (!window.confirm(`Restore the version from ${created}? The current version will remain in history so you can undo this restore.`)) return;
    setBusy(true);
    setHistoryBusy(true);
    try {
      const historical = revisionPreview?.revision.sha === revision.sha
        ? revisionPreview.document
        : await cmsApi.getRevision(selected.path, revision.sha);
      await cmsApi.update(selected.path, selected.sha, historical.content);
      const document = await cmsApi.get(selected.path);
      setSelected(document);
      setSource(document.content);
      setOriginalContent(document.content);
      const nextFields = extractCmsFields(document.content, document.path);
      const nextSections = classifyContent(document.path) === 'page' ? extractPageSections(document.content) : [];
      setFields(nextFields);
      setOriginalFields(nextFields);
      setSections(nextSections);
      setOriginalSections(nextSections);
      setRevisionPreview(null);
      setRevisions(await cmsApi.history(selected.path, 20));
      toast.success('Previous version restored', friendlyContentName(selected.path));
    } catch (error) {
      toast.error('Restore failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
      setHistoryBusy(false);
    }
  };

  const save = async () => {
    if (!dirty || busy) return;
    if (!path.startsWith('public/') || path.includes('..')) {
      toast.error('Invalid publishing path', 'Content must stay inside the Tayoca public/ directory.');
      return;
    }
    setBusy(true);
    try {
      if (creating) {
        await cmsApi.create(path, renderedContent);
        toast.success('Published', `${friendlyContentName(path)} is now in the Tayoca content repository.`);
      } else if (selected) {
        if (path !== selected.path) throw new Error('Renaming published files is disabled. Create the new page first, then remove the old one.');
        await cmsApi.update(selected.path, selected.sha, renderedContent);
        toast.success('Changes published', friendlyContentName(selected.path));
      }

      const document = await cmsApi.get(path);
      setSelected(document);
      setSource(document.content);
      setOriginalContent(document.content);
      const nextFields = extractCmsFields(document.content, document.path);
      const nextSections = classifyContent(document.path) === 'page' ? extractPageSections(document.content) : [];
      setFields(nextFields);
      setOriginalFields(nextFields);
      setSections(nextSections);
      setOriginalSections(nextSections);
      setRevisions([]);
      setRevisionPreview(null);
      setCreating(false);
      setAutoSlug(false);
      setRevisions([]);
      setRevisionPreview(null);
      setFiles(await cmsApi.list());
    } catch (error) {
      toast.error('Publish failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const revert = () => {
    if (!dirty || !window.confirm('Revert all unsaved changes?')) return;
    if (creating) {
      setCreating(false);
      setSelected(null);
      setSource('');
      setOriginalContent('');
      setPath('');
      setFields(emptyFields);
      setOriginalFields(emptyFields);
      setSections([]);
      setOriginalSections([]);
      return;
    }
    setSource(originalContent);
    setFields(originalFields);
    setSections(originalSections);
  };

  const remove = async () => {
    if (!selected || busy) return;
    if (!window.confirm(`Delete “${friendlyContentName(selected.path)}”? This publishes the deletion to Tayoca's canonical content repository.`)) return;
    setBusy(true);
    try {
      await cmsApi.delete(selected.path, selected.sha);
      toast.success('Content deleted', friendlyContentName(selected.path));
      setSelected(null);
      setSource('');
      setOriginalContent('');
      setPath('');
      setFields(emptyFields);
      setOriginalFields(emptyFields);
      setSections([]);
      setOriginalSections([]);
      setFiles(await cmsApi.list());
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof CmsEditableFields, label: string, placeholder?: string, multiline = false) => (
    <label>
      <span className={labelClass}>{label}</span>
      {multiline ? (
        <textarea
          value={fields[key]}
          onChange={(event) => updateField(key, event.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          value={fields[key]}
          onChange={(event) => updateField(key, event.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </label>
  );

  const renderContentEditor = () => {
    if (!isManagedHtml) {
      return (
        <div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Content</h3>
          <p className="mb-4 mt-1 text-sm text-neutral-500">This item uses a structured or text format. Edit it directly here.</p>
          <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={24} spellCheck={false} className={`${inputClass} font-mono text-xs leading-5`} />
        </div>
      );
    }

    return (
      <div className="space-y-7">
        {creating && (
          <div className="app-inset p-4">
            <div className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">What are you creating?</div>
            <div className="flex flex-wrap gap-2">
              {(['page', 'blog', 'product'] as CmsContentKind[]).map((kind) => (
                <button key={kind} type="button" onClick={() => changeCreationKind(kind)} className={`app-btn ${creationKind === kind ? 'app-btn-primary' : 'app-btn-secondary'}`}>
                  {kind === 'page' ? 'Page' : kind === 'blog' ? 'Blog article' : 'Product'}
                </button>
              ))}
            </div>
          </div>
        )}

        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Page essentials</h3>
            <p className="mt-1 text-sm text-neutral-500">The words visitors see first. No HTML required.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {field('eyebrow', 'Eyebrow / category', 'e.g. Platform Reliability')}
            <div className="hidden md:block" />
            {field('headline', 'Main headline', 'What should this page say?')}
            {field('accent', 'Highlighted words', 'Optional highlighted part of the headline')}
            <div className="md:col-span-2">{field('intro', 'Introduction', 'A short explanation for visitors', true)}</div>
          </div>
        </section>

        {currentKind === 'blog' && (
          <section>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Article</h3>
              <p className="mt-1 text-sm text-neutral-500">Write and format the article visually. The site template, navigation and tracking code stay untouched.</p>
            </div>
            <RichTextEditor value={fields.articleHtml} onChange={(value) => updateField('articleHtml', value)} disabled={busy} />
          </section>
        )}

        {currentKind === 'product' && (
          <section>
            <div className="mb-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Product and checkout</h3>
              <p className="mt-1 text-sm text-neutral-500">Update the offer customers see without editing the page source.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {field('price', 'Price', '29')}
              <MediaSelect label="Cover image" value={fields.coverImage} onChange={(value) => updateField('coverImage', value)} disabled={busy} />
              <div className="md:col-span-2">{field('purchaseUrl', 'Checkout link', 'https://tayoca.gumroad.com/...')}</div>
              <div className="md:col-span-2">{field('purchaseLabel', 'Buy button text', 'Buy securely on Gumroad')}</div>
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Website CMS"
        description="Manage Tayoca pages, sections, articles, products, media and global site settings without editing code"
        actions={(
          <div className="flex gap-2">
            <button onClick={() => void loadFiles()} disabled={busy} className="app-btn app-btn-secondary disabled:opacity-50">
              <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Refresh
            </button>
            {category !== 'media' && category !== 'settings' && <button onClick={beginCreate} disabled={busy} className="app-btn app-btn-primary disabled:opacity-50">
              <Plus size={15} /> New content
            </button>}
          </div>
        )}
      />

      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {categoryConfig.map(({ id, label, description, icon: Icon }) => (
            <button key={id} onClick={() => setCategory(id)} className={`app-card app-card-hover p-4 text-left transition ${category === id ? 'border-brand-500 dark:border-brand-400 ring-2 ring-brand-200 dark:ring-brand-500/20' : ''}`}>
              <div className="flex items-center justify-between">
                <Icon size={18} />
                <span className="text-xl font-semibold">{counts[id] ?? '—'}</span>
              </div>
              <div className="mt-4 text-sm font-semibold">{label}</div>
              <div className={`mt-1 text-xs ${category === id ? 'opacity-70' : 'text-neutral-500'}`}>{description}</div>
            </button>
          ))}
        </div>

        {category === 'media' ? (
          <MediaLibrary onCount={setMediaCount} />
        ) : category === 'settings' ? (
          <GlobalSiteSettingsEditor />
        ) : (
        <div className="grid min-h-[680px] grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
          <aside className="app-card overflow-hidden">
            <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search content…" className={`${inputClass} pl-9`} />
              </div>
              <div className="mt-2 text-xs text-neutral-500">{visibleEntries.length} item{visibleEntries.length === 1 ? '' : 's'}</div>
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-2">
              {visibleEntries.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-neutral-500">No content matches this view.</div>
              ) : visibleEntries.map((entry) => {
                const active = !creating && selected?.path === entry.path;
                const Icon = entry.kind === 'blog' ? BookOpen : entry.kind === 'product' ? Boxes : entry.kind === 'data' ? Database : FileText;
                return (
                  <button key={entry.path} onClick={() => void openEntry(entry)} disabled={busy} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition disabled:opacity-50 ${active ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'}`}>
                    <div className="rounded-lg bg-neutral-100 p-2 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"><Icon size={16} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-neutral-900 dark:text-white">{entry.name}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">{contentSectionLabel(entry.kind)}</div>
                    </div>
                    <ChevronRight size={15} className="text-neutral-300" />
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="app-card overflow-hidden">
            {!selected && !creating ? (
              <div className="flex h-full min-h-[620px] items-center justify-center p-8">
                <div className="max-w-lg text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"><Globe2 size={24} /></div>
                  <h2 className="mt-5 text-xl font-semibold text-neutral-900 dark:text-white">Choose something to manage</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">Select a page, article or product from the left. Edit hero content, reusable page sections, SEO and media in simple controls; technical source details stay out of the way.</p>
                  <button onClick={beginCreate} className="app-btn app-btn-primary mt-5"><Plus size={16} /> Create new content</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{creating ? 'New draft' : 'Published'}</span>
                        <span>{contentSectionLabel(currentKind)}</span>
                      </div>
                      <h2 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white">{fields.headline || friendlyContentName(path) || 'New content'}</h2>
                      {creating && <p className="mt-1 text-xs text-neutral-500">URL: /{path.replace(/^public\//, '')}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {liveUrl && !creating && <a href={liveUrl} target="_blank" rel="noreferrer" className="app-btn app-btn-secondary"><ArrowUpRight size={15} /> Live page</a>}
                      <button onClick={revert} disabled={!dirty || busy} className="app-btn app-btn-secondary disabled:opacity-40"><RotateCcw size={15} /> Revert</button>
                      {!creating && selected && <button onClick={() => void remove()} disabled={busy} className="app-btn app-btn-danger disabled:opacity-40"><Trash2 size={15} /> Delete</button>}
                      <button onClick={() => void save()} disabled={!dirty || busy} className="app-btn app-btn-primary disabled:opacity-40"><Save size={15} /> {busy ? 'Publishing…' : 'Publish changes'}</button>
                    </div>
                  </div>
                </div>

                <div className="flex overflow-x-auto border-b border-neutral-200 px-5 dark:border-neutral-800">
                  {((currentKind === 'page'
                    ? [['content', 'Content'], ['sections', 'Sections'], ['seo', 'SEO & social'], ['preview', 'Preview'], ['history', 'History'], ['advanced', 'Advanced']]
                    : [['content', 'Content'], ['seo', 'SEO & social'], ['preview', 'Preview'], ['history', 'History'], ['advanced', 'Advanced']]
                  ) as Array<[EditorTab, string]>).map(([id, label]) => (
                    <button key={id} onClick={() => { setTab(id); if (id === 'history') void loadHistory(); }} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === id ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>{label}</button>
                  ))}
                </div>

                <div className="p-5 lg:p-7">
                  {tab === 'content' && renderContentEditor()}

                  {tab === 'sections' && currentKind === 'page' && (
                    <PageSectionsEditor sections={sections} onChange={setSections} disabled={busy} />
                  )}

                  {tab === 'seo' && isManagedHtml && (
                    <div className="max-w-3xl space-y-7">
                      <section>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Search appearance</h3>
                        <p className="mb-4 mt-1 text-sm text-neutral-500">Control how this page is described in search engines.</p>
                        <div className="space-y-4">
                          {field('browserTitle', 'Browser and search title', 'Page title | Tayoca')}
                          <div>{field('metaDescription', 'Search description', 'A concise description of this page', true)}<div className="mt-1 text-right text-xs text-neutral-400">{fields.metaDescription.length} characters</div></div>
                        </div>
                      </section>
                      <section>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Social sharing</h3>
                        <p className="mb-4 mt-1 text-sm text-neutral-500">The headline and description used when this page is shared.</p>
                        <div className="space-y-4">
                          {field('socialTitle', 'Social title', 'Tayoca')}
                          {field('socialDescription', 'Social description', 'A short social preview', true)}
                        </div>
                      </section>
                    </div>
                  )}

                  {tab === 'seo' && !isManagedHtml && <div className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500 dark:bg-neutral-800/60">SEO fields apply to website pages, articles and products.</div>}

                  {tab === 'preview' && (
                    <div>
                      {isManagedHtml ? (
                        <>
                          <div className="mb-3 flex items-center justify-between"><div><h3 className="text-base font-semibold text-neutral-900 dark:text-white">Safe preview</h3><p className="mt-1 text-sm text-neutral-500">Scripts are disabled in this preview.</p></div></div>
                          <iframe title={`Preview of ${friendlyContentName(path)}`} sandbox="" referrerPolicy="no-referrer" srcDoc={renderedContent} className="min-h-[680px] w-full rounded-xl border border-neutral-200 bg-white dark:border-neutral-700" />
                        </>
                      ) : <pre className="min-h-[500px] overflow-auto whitespace-pre-wrap rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-700">{renderedContent}</pre>}
                    </div>
                  )}


                  {tab === 'history' && (
                    <div className="max-w-5xl space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><h3 className="text-base font-semibold text-neutral-900 dark:text-white">Version history</h3><p className="mt-1 text-sm text-neutral-500">Every publish is preserved. Preview an older version or restore it without using Git.</p></div>
                        {!creating && <button onClick={() => void loadHistory()} disabled={historyBusy} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"><History size={15} /> {historyBusy ? 'Loading…' : 'Refresh history'}</button>}
                      </div>
                      {creating ? (
                        <div className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500 dark:bg-neutral-800/60">Version history becomes available after this content is published for the first time.</div>
                      ) : historyBusy && revisions.length === 0 ? (
                        <div className="rounded-xl bg-neutral-50 p-8 text-center text-sm text-neutral-500 dark:bg-neutral-800/60">Loading previous versions…</div>
                      ) : revisions.length === 0 ? (
                        <div className="rounded-xl bg-neutral-50 p-8 text-center text-sm text-neutral-500 dark:bg-neutral-800/60">No earlier versions were returned for this content.</div>
                      ) : (
                        <div className="space-y-3">
                          {revisions.map((revision, index) => (
                            <div key={revision.sha} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-neutral-900 dark:text-white">{index === 0 ? 'Latest change' : `Version ${revisions.length - index}`}</span><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">{revision.sha.slice(0, 10)}</span></div>
                                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{revision.message || 'Content update'}</p>
                                  <p className="mt-1 text-xs text-neutral-500">{revision.author || 'Tayoca'} · {revision.created ? new Date(revision.created).toLocaleString() : 'Date unavailable'}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => void previewRevision(revision)} disabled={historyBusy || busy} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"><Eye size={14} /> Preview</button>
                                  <button onClick={() => void restoreRevision(revision)} disabled={historyBusy || busy} className="app-btn app-btn-primary disabled:opacity-50"><RotateCcw size={14} /> Restore</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {revisionPreview && (
                        <div className="app-inset p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold text-neutral-900 dark:text-white">Previewing {revisionPreview.revision.sha.slice(0, 10)}</div><div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">This preview does not change the live page.</div></div><button onClick={() => setRevisionPreview(null)} className="text-sm font-medium text-brand-700 dark:text-brand-300">Close preview</button></div>
                          {isManagedHtml ? <iframe title="Historical content preview" sandbox="" referrerPolicy="no-referrer" srcDoc={revisionPreview.document.content} className="min-h-[560px] w-full rounded-xl border border-neutral-200 bg-white dark:border-neutral-800" /> : <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-xs dark:bg-neutral-950">{revisionPreview.document.content}</pre>}
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'advanced' && (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                        <div className="flex gap-3"><Settings2 size={18} className="mt-0.5 text-amber-700 dark:text-amber-300" /><div><div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Advanced editing</div><p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80">This is the underlying source. Most website changes should be made in Content or SEO instead.</p></div></div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                        <label><span className={labelClass}>Repository path</span><input value={path} onChange={(event) => { setPath(event.target.value); setAutoSlug(false); }} disabled={!creating} className={`${inputClass} font-mono text-xs`} /></label>
                        {!creating && selected && <div className="self-end rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500 dark:bg-neutral-800">Revision {selected.sha.slice(0, 10)}</div>}
                      </div>
                      <textarea value={source} onChange={(event) => handleAdvancedSource(event.target.value)} rows={30} spellCheck={false} className={`${inputClass} font-mono text-xs leading-5`} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
        )}
      </div>
    </>
  );
};

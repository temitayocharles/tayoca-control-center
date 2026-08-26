export type CmsSectionType = 'cards' | 'steps' | 'cta' | 'content' | 'custom';

export interface CmsSectionItem {
  label: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}

export interface CmsSectionAction {
  label: string;
  href: string;
}

export interface CmsPageSection {
  id: string;
  sourceIndex: number;
  type: CmsSectionType;
  eyebrow: string;
  heading: string;
  intro: string;
  items: CmsSectionItem[];
  actions: CmsSectionAction[];
  originalHtml: string;
}

type SectionRange = { start: number; end: number; html: string; hero: boolean };

type MainRange = { contentStart: number; contentEnd: number };

const parse = (html: string): Document | null => {
  if (typeof DOMParser === 'undefined') return null;
  return new DOMParser().parseFromString(html, 'text/html');
};

const cleanText = (node: Element | null): string => node?.textContent?.replace(/\s+/g, ' ').trim() || '';
const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeHref = (value: string): string => { const v = value.trim(); return /^(?:https:\/\/|mailto:|#|\/(?!\/))/i.test(v) ? v : '#'; };

const mainRange = (source: string): MainRange | null => {
  const open = /<main\b[^>]*\bid=["']main["'][^>]*>/i.exec(source);
  if (!open || open.index === undefined) return null;
  const contentStart = open.index + open[0].length;
  const close = source.indexOf('</main>', contentStart);
  if (close < 0) return null;
  return { contentStart, contentEnd: close };
};

const sectionRanges = (source: string): SectionRange[] => {
  const main = mainRange(source);
  if (!main) return [];
  const body = source.slice(main.contentStart, main.contentEnd);
  const token = /<section\b[^>]*>|<\/section\s*>/gi;
  const ranges: SectionRange[] = [];
  let depth = 0;
  let start = -1;
  let opening = '';
  let match: RegExpExecArray | null;
  while ((match = token.exec(body))) {
    const closing = /^<\/section/i.test(match[0]);
    if (!closing) {
      if (depth === 0) {
        start = match.index;
        opening = match[0];
      }
      depth += 1;
      continue;
    }
    if (depth <= 0) continue;
    depth -= 1;
    if (depth === 0 && start >= 0) {
      const end = token.lastIndex;
      const html = body.slice(start, end);
      const hero = /\bclass=["'][^"']*\bhero\b/i.test(opening);
      ranges.push({ start: main.contentStart + start, end: main.contentStart + end, html, hero });
      start = -1;
      opening = '';
    }
  }
  return ranges;
};

const detectType = (root: Element): CmsSectionType => {
  if (root.querySelector('.grid .card')) return 'cards';
  if (root.querySelector('.steps .step')) return 'steps';
  if (root.querySelector('.actions a')) return 'cta';
  if (root.querySelector('.section-heading') || root.querySelector('h2')) return 'content';
  return 'custom';
};

const readItems = (root: Element, type: CmsSectionType): CmsSectionItem[] => {
  if (type === 'cards') {
    return Array.from(root.querySelectorAll('.grid > .card')).map((card) => ({
      label: cleanText(card.querySelector('.tag')),
      title: cleanText(card.querySelector('h3')),
      body: cleanText(card.querySelector('p')),
      href: card instanceof HTMLAnchorElement ? card.getAttribute('href') || '' : '',
      cta: cleanText(card.querySelector('.card-cta')),
    }));
  }
  if (type === 'steps') {
    return Array.from(root.querySelectorAll('.steps > .step')).map((step) => ({
      label: '', title: cleanText(step.querySelector('h3')), body: cleanText(step.querySelector('p')), href: '', cta: '',
    }));
  }
  return [];
};

const readActions = (root: Element): CmsSectionAction[] => Array.from(root.querySelectorAll('.actions > a')).map((link) => ({
  label: cleanText(link), href: link.getAttribute('href') || '',
}));

const fromHtml = (html: string, sourceIndex: number): CmsPageSection => {
  const doc = parse(html);
  const root = doc?.body.firstElementChild;
  if (!root) {
    return { id: `section-${sourceIndex}`, sourceIndex, type: 'custom', eyebrow: '', heading: '', intro: '', items: [], actions: [], originalHtml: html };
  }
  const type = detectType(root);
  const headingRoot = root.querySelector('.section-heading');
  const eyebrow = cleanText(headingRoot?.querySelector('.eyebrow') || root.querySelector('.eyebrow'));
  const heading = cleanText(headingRoot?.querySelector('h2, h3') || root.querySelector('h2, h3'));
  const intro = cleanText(headingRoot?.querySelector('p:not(.eyebrow)'));
  return {
    id: `section-${sourceIndex}`,
    sourceIndex,
    type,
    eyebrow,
    heading,
    intro,
    items: readItems(root, type),
    actions: readActions(root),
    originalHtml: html,
  };
};

export const extractPageSections = (source: string): CmsPageSection[] => sectionRanges(source)
  .filter((range) => !range.hero)
  .map((range, index) => fromHtml(range.html, index));

const state = (section: CmsPageSection) => ({
  type: section.type,
  eyebrow: section.eyebrow,
  heading: section.heading,
  intro: section.intro,
  items: section.items,
  actions: section.actions,
});

export const pageSectionsFingerprint = (sections: CmsPageSection[]): string => JSON.stringify(sections.map(state));

const mutateText = (root: Element, selector: string, value: string) => {
  const node = root.querySelector(selector);
  if (node) node.textContent = value;
};

const syncElements = (container: Element, selector: string, count: number) => {
  let nodes = Array.from(container.querySelectorAll(`:scope > ${selector}`));
  while (nodes.length < count && nodes.length > 0) {
    const clone = nodes[nodes.length - 1].cloneNode(true) as Element;
    container.appendChild(clone);
    nodes = Array.from(container.querySelectorAll(`:scope > ${selector}`));
  }
  while (nodes.length > count) {
    nodes[nodes.length - 1].remove();
    nodes.pop();
  }
  return nodes;
};

const renderEdited = (section: CmsPageSection): string => {
  const doc = parse(section.originalHtml);
  const root = doc?.body.firstElementChild;
  if (!root) return section.originalHtml;
  const headingRoot = root.querySelector('.section-heading') || root;
  mutateText(headingRoot, '.eyebrow', section.eyebrow);
  mutateText(headingRoot, 'h2, h3', section.heading);
  const introNode = headingRoot.querySelector('p:not(.eyebrow)');
  if (introNode) introNode.textContent = section.intro;

  if (section.type === 'cards') {
    const grid = root.querySelector('.grid');
    if (grid) {
      const cards = syncElements(grid, '.card', section.items.length);
      cards.forEach((card, index) => {
        const item = section.items[index];
        mutateText(card, '.tag', item.label);
        mutateText(card, 'h3', item.title);
        mutateText(card, 'p', item.body);
        mutateText(card, '.card-cta', item.cta);
        if (card.tagName.toLowerCase() === 'a' && item.href) card.setAttribute('href', safeHref(item.href));
      });
    }
  }
  if (section.type === 'steps') {
    const steps = root.querySelector('.steps');
    if (steps) {
      const nodes = syncElements(steps, '.step', section.items.length);
      nodes.forEach((step, index) => {
        mutateText(step, 'h3', section.items[index].title);
        mutateText(step, 'p', section.items[index].body);
      });
    }
  }
  const actions = root.querySelector('.actions');
  if (actions && section.actions.length) {
    const links = syncElements(actions, 'a', section.actions.length);
    links.forEach((link, index) => {
      link.textContent = section.actions[index].label;
      if (section.actions[index].href) link.setAttribute('href', safeHref(section.actions[index].href));
    });
  }
  return root.outerHTML;
};

const currentStateForOriginal = (section: CmsPageSection): string => pageSectionsFingerprint([fromHtml(section.originalHtml, section.sourceIndex)]);

const renderSection = (section: CmsPageSection, currentRanges: SectionRange[]): string => {
  if (section.sourceIndex >= 0) {
    const unchanged = pageSectionsFingerprint([section]) === currentStateForOriginal(section);
    const current = currentRanges.filter((range) => !range.hero)[section.sourceIndex];
    if (unchanged && current) return current.html;
  }
  return renderEdited(section);
};

export const applyPageSections = (source: string, sections: CmsPageSection[]): string => {
  const main = mainRange(source);
  if (!main) return source;
  const allRanges = sectionRanges(source);
  const editable = allRanges.filter((range) => !range.hero);
  if (!editable.length) {
    if (!sections.length) return source;
    const insertion = `\n${sections.map((section) => renderSection(section, allRanges)).join('\n')}\n`;
    return source.slice(0, main.contentEnd) + insertion + source.slice(main.contentEnd);
  }

  const prefix = source.slice(0, editable[0].start);
  const suffix = source.slice(editable[editable.length - 1].end);
  const gaps: string[] = [];
  for (let i = 0; i < editable.length - 1; i += 1) gaps.push(source.slice(editable[i].end, editable[i + 1].start));
  const defaultGap = gaps.find((gap) => gap.includes('\n')) || '\n';
  const output: string[] = [];
  sections.forEach((section, index) => {
    output.push(renderSection(section, allRanges));
    if (index < sections.length - 1) output.push(gaps[index] ?? defaultGap);
  });
  return prefix + output.join('') + suffix;
};

const newSectionHtml = (type: CmsSectionType): string => {
  if (type === 'cards') return `<section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">New section</p><h2>Section heading</h2><p>Explain what visitors should know.</p></div><div class="grid"><a class="card interactive" href="#"><span class="tag">Category</span><h3>Card title</h3><p>Describe this item clearly.</p><span class="card-cta">Learn more</span></a></div></div></section>`;
  if (type === 'steps') return `<section class="section band"><div class="container"><div class="section-heading"><p class="eyebrow">How it works</p><h2>Simple process</h2><p>Explain the process in clear steps.</p></div><div class="steps"><div class="step"><h3>First step</h3><p>Describe what happens here.</p></div></div></div></section>`;
  if (type === 'cta') return `<section class="section band"><div class="container"><div class="section-heading"><p class="eyebrow">Next step</p><h2>Ready to continue?</h2><p>Give visitors one clear next action.</p></div><div class="actions"><a class="button" href="/assessments.html">Start an Assessment</a></div></div></section>`;
  return `<section class="section"><div class="container"><div class="section-heading"><p class="eyebrow">New section</p><h2>Section heading</h2><p>Add the information visitors need here.</p></div></div></section>`;
};

export const createPageSection = (type: Exclude<CmsSectionType, 'custom'>): CmsPageSection => {
  const html = newSectionHtml(type);
  const section = fromHtml(html, -1);
  return { ...section, id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, sourceIndex: -1 };
};

export const duplicatePageSection = (section: CmsPageSection): CmsPageSection => ({
  ...section,
  id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  sourceIndex: -1,
  originalHtml: renderEdited(section),
  items: section.items.map((item) => ({ ...item })),
  actions: section.actions.map((action) => ({ ...action })),
});

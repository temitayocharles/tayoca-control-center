export type CmsContentKind = 'page' | 'blog' | 'product' | 'data' | 'text' | 'other';

export interface CmsEditableFields {
  browserTitle: string;
  metaDescription: string;
  socialTitle: string;
  socialDescription: string;
  eyebrow: string;
  headline: string;
  accent: string;
  intro: string;
  articleHtml: string;
  price: string;
  purchaseUrl: string;
  purchaseLabel: string;
  coverImage: string;
}

export const classifyContent = (path: string): CmsContentKind => {
  const clean = path.toLowerCase();
  if (clean.startsWith('public/blog/') && /\.html?$/.test(clean)) return 'blog';
  if (clean.startsWith('public/products/') && /\.html?$/.test(clean)) return 'product';
  if (/\.json$/.test(clean)) return 'data';
  if (/\.(md|txt)$/.test(clean)) return 'text';
  if (/\.html?$/.test(clean)) return 'page';
  return 'other';
};

const titleCase = (value: string) => value
  .replace(/\.[^.]+$/, '')
  .replace(/^index$/i, 'Home')
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const friendlyContentName = (path: string): string => {
  const clean = path.replace(/^public\//, '').replace(/\/$/, '');
  if (clean === 'index.html') return 'Home';
  const name = clean.split('/').pop() || clean;
  return titleCase(name);
};

export const contentSectionLabel = (kind: CmsContentKind): string => {
  switch (kind) {
    case 'blog': return 'Blog article';
    case 'product': return 'Product';
    case 'page': return 'Page';
    case 'data': return 'Site data';
    case 'text': return 'Text content';
    default: return 'Content';
  }
};

export const liveUrlForPath = (path: string): string => {
  if (!path.startsWith('public/') || !/\.html?$/.test(path.toLowerCase())) return '';
  const relative = path.slice('public/'.length);
  if (relative === 'index.html') return 'https://tayoca.com/';
  const normalized = relative.replace(/(^|\/)index\.html?$/i, '$1');
  return `https://tayoca.com/${normalized}`;
};

const parseHtml = (source: string): Document | null => {
  if (typeof DOMParser === 'undefined') return null;
  return new DOMParser().parseFromString(source, 'text/html');
};

const textOf = (element: Element | null): string => element?.textContent?.trim() || '';

export const extractCmsFields = (source: string, path: string): CmsEditableFields => {
  const kind = classifyContent(path);
  const doc = parseHtml(source);
  if (!doc || !['page', 'blog', 'product'].includes(kind)) {
    return {
      browserTitle: '', metaDescription: '', socialTitle: '', socialDescription: '', eyebrow: '',
      headline: '', accent: '', intro: '', articleHtml: '', price: '', purchaseUrl: '', purchaseLabel: '', coverImage: '',
    };
  }

  const h1 = doc.querySelector('h1');
  const accentNode = h1?.querySelector('.accent') || null;
  let headline = textOf(h1);
  const accent = textOf(accentNode);
  if (h1 && accentNode) {
    const clone = h1.cloneNode(true) as HTMLElement;
    clone.querySelector('.accent')?.remove();
    headline = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  const purchase = doc.querySelector('a[data-event="product_purchase_click"]');
  const article = doc.querySelector('article.article');

  return {
    browserTitle: textOf(doc.querySelector('title')),
    metaDescription: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    socialTitle: doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
    socialDescription: doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
    eyebrow: textOf(doc.querySelector('.hero .eyebrow')) || textOf(doc.querySelector('.eyebrow')),
    headline,
    accent,
    intro: textOf(doc.querySelector('.hero .lede')) || textOf(doc.querySelector('.lede')),
    articleHtml: article?.innerHTML.trim() || '',
    price: textOf(doc.querySelector('.price')).replace(/^\$/, ''),
    purchaseUrl: purchase?.getAttribute('href') || '',
    purchaseLabel: textOf(purchase),
    coverImage: doc.querySelector('img.cover')?.getAttribute('src') || '',
  };
};

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceTagInner = (source: string, tag: string, inner: string): string => {
  const regex = new RegExp(`(<${tag}\\b[^>]*>)[\\s\\S]*?(<\\/${tag}>)`, 'i');
  return regex.test(source) ? source.replace(regex, `$1${inner}$2`) : source;
};

const replaceClassInner = (source: string, className: string, inner: string): string => {
  const regex = new RegExp(`(<([a-z0-9:-]+)\\b[^>]*class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'][^>]*>)[\\s\\S]*?(<\\/\\2>)`, 'i');
  return regex.test(source) ? source.replace(regex, `$1${inner}$3`) : source;
};

const replaceAttribute = (tag: string, attribute: string, value: string): string => {
  const attr = new RegExp(`\\s${attribute}=(['"])[\\s\\S]*?\\1`, 'i');
  const escaped = escapeHtml(value);
  if (attr.test(tag)) return tag.replace(attr, ` ${attribute}="${escaped}"`);
  return tag.replace(/>$/, ` ${attribute}="${escaped}">`);
};

const replaceMeta = (source: string, key: 'name' | 'property', identifier: string, value: string): string => {
  const regex = new RegExp(`<meta\\b[^>]*\\b${key}=["']${escapeRegExp(identifier)}["'][^>]*>`, 'i');
  return source.replace(regex, (tag) => replaceAttribute(tag, 'content', value));
};

const replaceProductPurchaseLink = (source: string, url: string, label: string): string => {
  const regex = /(<a\b[^>]*data-event=["']product_purchase_click["'][^>]*>)[\s\S]*?(<\/a>)/i;
  return source.replace(regex, (full, open: string, close: string) => {
    const nextOpen = replaceAttribute(open, 'href', url);
    return `${nextOpen}${escapeHtml(label)}${close}`;
  });
};

const replaceCoverImage = (source: string, image: string): string => {
  const regex = /<img\b[^>]*class=["'][^"']*\bcover\b[^"']*["'][^>]*>/i;
  return source.replace(regex, (tag) => replaceAttribute(tag, 'src', image));
};

const sanitizeArticleHtml = (value: string): string => value
  .replace(/<script\b[\s\S]*?<\/script>/gi, '')
  .replace(/<(iframe|object|embed)\b[\s\S]*?<\/\1>/gi, '')
  .replace(/\son[a-z]+=(['"])[\s\S]*?\1/gi, '');

const replaceArticle = (source: string, articleHtml: string): string => {
  const regex = /(<article\b[^>]*class=["'][^"']*\barticle\b[^"']*["'][^>]*>)[\s\S]*?(<\/article>)/i;
  return regex.test(source) ? source.replace(regex, `$1\n${sanitizeArticleHtml(articleHtml)}\n$2`) : source;
};

const updateProductStructuredData = (source: string, fields: CmsEditableFields): string => {
  const regex = /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
  return source.replace(regex, (full, open: string, jsonText: string, close: string) => {
    try {
      const value = JSON.parse(jsonText);
      if (value?.['@type'] !== 'Product') return full;
      if (fields.headline) value.name = fields.headline;
      if (fields.metaDescription) value.description = fields.metaDescription;
      if (fields.coverImage) {
        const absolute = fields.coverImage.startsWith('http') ? fields.coverImage : `https://tayoca.com${fields.coverImage.startsWith('/') ? '' : '/'}${fields.coverImage}`;
        value.image = [absolute];
      }
      if (value.offers && typeof value.offers === 'object') {
        if (fields.price) value.offers.price = fields.price;
        if (fields.purchaseUrl) value.offers.url = fields.purchaseUrl;
      }
      return `${open}\n${JSON.stringify(value, null, 2)}\n${close}`;
    } catch {
      return full;
    }
  });
};

export const applyCmsFields = (source: string, path: string, fields: CmsEditableFields): string => {
  const kind = classifyContent(path);
  if (!['page', 'blog', 'product'].includes(kind)) return source;

  let next = source;
  if (fields.browserTitle) next = replaceTagInner(next, 'title', escapeHtml(fields.browserTitle));
  if (fields.metaDescription) next = replaceMeta(next, 'name', 'description', fields.metaDescription);
  if (fields.socialTitle) {
    next = replaceMeta(next, 'property', 'og:title', fields.socialTitle);
    next = replaceMeta(next, 'name', 'twitter:title', fields.socialTitle);
  }
  if (fields.socialDescription) {
    next = replaceMeta(next, 'property', 'og:description', fields.socialDescription);
    next = replaceMeta(next, 'name', 'twitter:description', fields.socialDescription);
  }
  if (fields.eyebrow) next = replaceClassInner(next, 'eyebrow', escapeHtml(fields.eyebrow));
  if (fields.headline) {
    const headlineHtml = fields.accent
      ? `${escapeHtml(fields.headline)} <span class="accent">${escapeHtml(fields.accent)}</span>`
      : escapeHtml(fields.headline);
    next = replaceTagInner(next, 'h1', headlineHtml);
  }
  if (fields.intro) next = replaceClassInner(next, 'lede', escapeHtml(fields.intro));

  if (kind === 'blog' && fields.articleHtml) next = replaceArticle(next, fields.articleHtml);

  if (kind === 'product') {
    if (fields.price) next = replaceClassInner(next, 'price', `$${escapeHtml(fields.price.replace(/^\$/, ''))}`);
    if (fields.purchaseUrl && fields.purchaseLabel) next = replaceProductPurchaseLink(next, fields.purchaseUrl, fields.purchaseLabel);
    if (fields.coverImage) next = replaceCoverImage(next, fields.coverImage);
    next = updateProductStructuredData(next, fields);
  }

  return next;
};

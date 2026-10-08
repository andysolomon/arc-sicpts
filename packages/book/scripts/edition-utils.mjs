import { JSDOM } from 'jsdom';
import { strToU8, zipSync } from 'fflate';

export const TITLE = 'Structure and Interpretation of Computer Programs';
export const SUBTITLE = 'An interactive Source edition';
export const ATTRIBUTION = `<h2>Attribution and license</h2><p>This edition by Andrew Solomon adapts <em>Structure and Interpretation of Computer Programs, JavaScript Edition</em> by Harold Abelson, Gerald Jay Sussman, Martin Henz, and Tobias Wrigstad (MIT Press), available at <a href="https://sicp.sourceacademy.org">sicp.sourceacademy.org</a>. The original authors retain copyright in their work. Copyright in additions and adaptations: Andrew Solomon, 2026.</p><p>The manuscript, teaching programs, illustrations, and narration scripts are shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0</a>. Changes include additional explanations, editable examples, visualizations, and exercise starters and solutions. This adaptation is not endorsed by the original authors or MIT Press. Companion software is separately MIT licensed.</p>`;
export const xml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
export const slug = (id) => id.replaceAll('/', '-');
export const filename = (id) => `section-${slug(id)}.xhtml`;
export const xhtml = (title, body) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><title>${xml(title)}</title><meta charset="utf-8"/><link rel="stylesheet" type="text/css" href="styles.css"/></head><body>${body}</body></html>`;

export function portableSection(html, section, links, print = false) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const article = document.querySelector('article');
  for (const el of article.querySelectorAll('svg, button, input, script')) el.remove();
  article.id = `section-${slug(section.id)}`;
  for (const element of article.querySelectorAll('*')) {
    for (const attr of [...element.attributes]) {
      if (!['href', 'src', 'alt', 'colspan', 'rowspan', 'class', 'id'].includes(attr.name)) element.removeAttribute(attr.name);
    }
    if (element.id) element.id = `${slug(section.id)}-${element.id}`;
    // Tailwind utility names have no meaning in the portable edition.
    if (element.hasAttribute('class')) {
      const names = element.getAttribute('class').split(/\s+/).filter((name) => name.startsWith('edition-'));
      if (names.length) element.className = names.join(' '); else element.removeAttribute('class');
    }
  }
  for (const link of article.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    const [path, hash] = href.split('#');
    const target = links.get(path);
    if (target) link.setAttribute('href', print ? `#section-${slug(target)}` : filename(target));
    else if (href.startsWith('#')) link.setAttribute('href', `#${slug(section.id)}-${hash}`);
    else if (href.startsWith('/')) link.setAttribute('href', `https://sicp.sourceacademy.org${href}`);
  }
  return new dom.window.XMLSerializer().serializeToString(article);
}

export function narration(html) {
  const document = new JSDOM(html).window.document;
  for (const listing of document.querySelectorAll('.edition-listing')) {
    const label = listing.querySelector('.edition-listing-label')?.textContent ?? 'Example';
    listing.replaceWith(document.createTextNode(`\nCode listing: ${label}. Follow this program in the companion illustrated edition.\n`));
  }
  for (const pre of document.querySelectorAll('pre')) pre.replaceWith(document.createTextNode('\nA code listing appears here in the illustrated edition.\n'));
  for (const img of document.querySelectorAll('img')) img.replaceWith(document.createTextNode(`\nIllustration: ${img.alt}.\n`));
  for (const table of document.querySelectorAll('table')) table.replaceWith(document.createTextNode('\nA data table appears here in the illustrated edition.\n'));
  for (const block of document.querySelectorAll('p, h1, h2, h3, li, figcaption, aside')) block.append(document.createTextNode('\n\n'));
  return document.body.textContent.replaceAll('_', ' ').replaceAll('λ', 'lambda').replaceAll('π', 'pi').replaceAll('§', 'section ').replace(/[^\S\n]+/g, ' ').replace(/\n\s*\n(?:\s*\n)*/g, '\n\n').trim() + '\n';
}

export function makeEpub(sections, images, css, cover, modified) {
  const entries = { mimetype: [strToU8('application/epub+zip'), { level: 0 }] };
  entries['META-INF/container.xml'] = strToU8('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  const nav = `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${sections.map((s) => `<li><a href="${filename(s.id)}">${xml(s.label)}</a></li>`).join('')}</ol></nav><nav epub:type="landmarks" hidden="hidden"><ol><li><a epub:type="cover" href="cover.xhtml">Cover</a></li><li><a epub:type="bodymatter" href="${filename(sections[0].id)}">Start reading</a></li></ol></nav>`;
  entries['OEBPS/nav.xhtml'] = strToU8(xhtml('Contents', nav));
  entries['OEBPS/styles.css'] = strToU8(css);
  entries['OEBPS/images/cover.png'] = cover;
  entries['OEBPS/cover.xhtml'] = strToU8(xhtml(TITLE, '<div class="cover"><img src="images/cover.png" alt="Structure and Interpretation of Computer Programs, an interactive Source edition by Andrew Solomon"/></div>'));
  for (const section of sections) entries[`OEBPS/${filename(section.id)}`] = strToU8(xhtml(section.label, section.html));
  for (const [name, data] of images) entries[`OEBPS/images/${name}`] = data;
  entries['OEBPS/toc.ncx'] = strToU8(`<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="urn:arc-sicpts:source-edition"/></head><docTitle><text>${xml(TITLE)}</text></docTitle><navMap>${sections.map((s, i) => `<navPoint id="n${i}" playOrder="${i + 1}"><navLabel><text>${xml(s.label)}</text></navLabel><content src="${filename(s.id)}"/></navPoint>`).join('')}</navMap></ncx>`);
  const items = sections.map((s, i) => `<item id="s${i}" href="${filename(s.id)}" media-type="application/xhtml+xml"/>`).join('');
  const imageItems = [...images.keys()].map((name, i) => `<item id="img${i}" href="images/${name}" media-type="image/png"/>`).join('');
  entries['OEBPS/book.opf'] = strToU8(`<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="en"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:arc-sicpts:source-edition</dc:identifier><dc:title>${xml(TITLE)} — ${xml(SUBTITLE)}</dc:title><dc:creator>Andrew Solomon</dc:creator><dc:language>en</dc:language><dc:rights>Creative Commons Attribution-ShareAlike 4.0</dc:rights><meta property="dcterms:modified">${modified}</meta><meta property="rendition:layout">reflowable</meta><meta property="schema:accessMode">textual</meta><meta property="schema:accessMode">visual</meta><meta property="schema:accessibilityFeature">tableOfContents</meta><meta property="schema:accessibilityFeature">alternativeText</meta><meta name="cover" content="cover-image"/></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="styles.css" media-type="text/css"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/>${items}${imageItems}</manifest><spine toc="ncx"><itemref idref="cover" linear="no"/>${sections.map((_, i) => `<itemref idref="s${i}"/>`).join('')}</spine></package>`);
  return zipSync(entries, { level: 6 });
}

import { rm, cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { strToU8, zipSync } from 'fflate';
import { pages } from '../src/toc.ts';
import { ATTRIBUTION, TITLE, SUBTITLE, makeEpub, narration, portableSection, slug, xml } from './edition-utils.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist/downloads');
const publicOutput = join(root, 'public/downloads');
const css = await readFile(new URL('./edition.css', import.meta.url), 'utf8');
const manuscript = new Set();
for (const path of await readdir(join(root, 'content'), { recursive: true })) {
  if (path.endsWith('.mdx')) manuscript.add(path.startsWith('appendix/') ? path.slice(0, -4) : path.split('/').at(-1).slice(0, -4));
}
const sections = pages.filter((p) => p.kind !== 'front').map((p) => ({
  id: p.kind === 'chapter' ? p.chapter.id : p.kind === 'appendix' ? `appendix/${p.appendix.slug}` : p.crumb,
  path: p.path,
  label: `${p.crumb} ${p.title}`,
  blurb: p.kind === 'chapter' ? p.chapter.blurb : p.kind === 'section' ? p.section.blurb : '',
  kind: p.kind,
}));
if (sections.filter((s) => manuscript.has(s.id)).length !== manuscript.size) throw new Error('Every manuscript must be in the reading order');
const links = new Map(sections.map((s) => [s.path, s.id]));
links.set('/front', 'front');
const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
await mkdir(join(output, 'images'), { recursive: true });
await mkdir(join(output, 'narration'), { recursive: true });
const server = await preview({ root, preview: { host: '127.0.0.1', port: 0, strictPort: false, open: false } });
const address = server.httpServer.address();
const url = `http://127.0.0.1:${address.port}`;
// Chromium is used here to typeset export artifacts, independently of browser verification.
const executablePath = [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => p && existsSync(p));
try {
  if (!executablePath && !existsSync(chromium.executablePath())) {
    console.log('Installing Chromium for edition typesetting…');
    execFileSync(process.execPath, [fileURLToPath(new URL('./cli.js', import.meta.resolve('playwright'))), 'install', 'chromium'], { stdio: 'inherit' });
  }
} catch (error) {
  await new Promise((resolve) => server.httpServer.close(resolve));
  throw error;
}
let browser;
try {
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}) });
} catch (error) {
  await new Promise((resolve) => server.httpServer.close(resolve));
  throw new Error('Chromium could not start. Install its system libraries (on CI: npx playwright install --with-deps chromium).', { cause: error });
}
const page = await browser.newPage({ viewport: { width: 800, height: 1000 }, deviceScaleFactor: 3, reducedMotion: 'reduce', colorScheme: 'light' });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const images = new Map();
const collected = [{ id: 'front', label: 'About this edition', html: `<article id="section-front"><h1>${TITLE}</h1><p>${SUBTITLE}</p><p>Adapted by Andrew Solomon</p><p>This offline edition includes the current manuscript across all five chapters and appendices, examples, exercise starters and explained solutions. Static illustrations show the supplied programs. Use the online companion to run programs or explore other points in an animation.</p><p>The audiobook is a listening companion: code listings and tables are referenced, and illustrations are described by their captions. Keep the PDF or EPUB nearby.</p>${ATTRIBUTION}</article>` }];
try {
  for (const section of sections) {
    if (!manuscript.has(section.id)) {
      const html = `<article id="section-${slug(section.id)}" class="${section.kind === 'chapter' ? 'edition-chapter' : 'edition-section'}"><h1>${xml(section.label)}</h1><p>${xml(section.blurb)}</p></article>`;
      collected.push({ ...section, html, printHtml: html });
      continue;
    }
    errors.length = 0;
    await page.goto(`${url}/edition?section=${encodeURIComponent(section.id)}`);
    await page.waitForSelector('.edition-render');
    // Settling twice covers lazy imports that start more worker jobs after MDX resolves.
    for (let pass = 0; pass < 2; pass++) {
      await page.waitForFunction(() => window.editionPending?.() === 0 && !document.querySelector('[data-edition-loading]') && ![...document.querySelectorAll('[role="status"]')].some((el) => /^Loading/.test(el.textContent)), null, { timeout: 120000 });
      await page.waitForTimeout(450);
    }
    await page.evaluate(() => document.fonts.ready);
    if (errors.length) throw new Error(`${section.id}: ${errors.join('; ')}`);
    const figures = page.locator('.edition-render figure, .edition-render [data-testid="animation"], .edition-render [data-testid="process-shape"]');
    const count = await figures.count();
    for (let i = 0; i < count; i++) {
      const figure = figures.nth(i);
      const info = await figure.evaluate((el) => ({
        title: el.querySelector('h3, :scope > div > span')?.textContent ?? 'Illustration',
        caption: el.querySelector('figcaption, [data-testid="caption"]')?.textContent ?? '',
        labels: [...el.querySelectorAll('svg[aria-label]')].map((svg) => svg.getAttribute('aria-label')).join('; '),
      }));
      if (/Tracing the program|Measuring the program|Compiling…|Laying out memory…/.test(info.caption)) throw new Error(`Unfinished illustration in ${section.id}: ${info.title}`);
      await figure.evaluate((el) => { const caption = el.querySelector('figcaption, [data-testid="caption"]'); if (caption) caption.style.display = 'none'; });
      await figure.scrollIntoViewIfNeeded();
      await page.waitForTimeout(50);
      const name = `${slug(section.id)}-${i + 1}.png`;
      const data = await figure.screenshot({ animations: 'disabled' });
      images.set(name, data);
      await writeFile(join(output, 'images', name), data);
      await figure.evaluate((el, replacement) => { el.setAttribute('data-edition-image', replacement.name); el.setAttribute('data-edition-caption', replacement.caption); }, { name, caption: info.caption });
    }
    const html = await page.locator('.edition-render').evaluate((article) => {
      const clone = article.cloneNode(true);
      for (const el of clone.querySelectorAll('[data-edition-image]')) {
        const figure = document.createElement('figure');
        const image = document.createElement('img');
        image.src = `images/${el.getAttribute('data-edition-image')}`;
        image.alt = [...el.querySelectorAll('svg[aria-label]')].map((svg) => svg.getAttribute('aria-label')).join('; ') || el.querySelector('h3, :scope > div > span')?.textContent || 'Program illustration';
        figure.append(image);
        const caption = document.createElement('figcaption');
        caption.textContent = el.getAttribute('data-edition-caption');
        if (caption.textContent) figure.append(caption);
        el.replaceWith(figure);
      }
      return clone.outerHTML;
    });
    collected.push({ ...section, html: portableSection(html, section, links), printHtml: portableSection(html, section, links, true) });
    console.log(`Exported ${section.id} (${count} illustrations)`);
  }
  // A bitmap cover is accepted by Kindle conversion and EPUB readers.
  const coverPage = await browser.newPage({ viewport: { width: 800, height: 1200 }, deviceScaleFactor: 2 });
  await coverPage.setContent(`<html><body style="margin:0;background:#f6f1e8;color:#201c17;font-family:Georgia,serif"><div style="box-sizing:border-box;height:1200px;padding:100px 75px;border-top:18px solid #245b66"><p style="font-size:80px;color:#245b66;margin:0 0 75px">λ</p><h1 style="font-size:72px;line-height:1.08;font-weight:normal">Structure and Interpretation of Computer Programs</h1><p style="font-size:32px;color:#625a4f">An interactive Source edition</p><p style="font-size:27px;margin-top:150px">Adapted by Andrew Solomon</p><p style="font-size:21px">From the JavaScript edition by<br/>Abelson · Sussman · Henz · Wrigstad</p></div></body></html>`);
  const cover = await coverPage.screenshot();
  await writeFile(join(output, 'sicp-source.epub'), makeEpub(collected, images, css, cover, generatedAt));
  await writeFile(join(output, 'styles.css'), css);
  const contents = `<nav><h1>Contents</h1><ol>${collected.map((s) => `<li><a href="#section-${slug(s.id)}">${xml(s.label)}</a></li>`).join('')}</ol></nav>`;
  const printHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${TITLE}</title><link rel="stylesheet" href="styles.css"/></head><body><div class="title-page"><h1>${TITLE}</h1><p>${SUBTITLE}</p><p>Adapted by Andrew Solomon</p></div>${contents}${collected.map((s) => s.printHtml ?? s.html).join('')}</body></html>`;
  await writeFile(join(output, 'print.html'), printHtml);
  await page.goto(`${url}/downloads/print.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(output, 'sicp-source.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true, outline: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;text-align:center;font-size:9px;color:#555"><span class="pageNumber"></span></div>' });
  const scripts = {};
  const tracks = collected.map((s) => {
    const name = `${slug(s.id)}.txt`;
    const text = narration(s.html);
    scripts[name] = strToU8(text);
    return { id: s.id, title: s.label, file: name, characters: text.length };
  });
  const narrationManifest = { title: TITLE, subtitle: SUBTITLE, author: 'Andrew Solomon', license: 'CC BY-SA 4.0', generatedAt, note: 'Listening companion. Code and tables are referenced; follow them in the illustrated edition.', tracks };
  scripts['manifest.json'] = strToU8(JSON.stringify(narrationManifest, null, 2));
  scripts['README.txt'] = strToU8('Narration scripts for the interactive Source edition of SICP.\nCode listings and tables are referenced rather than spoken verbatim. Review narration before publishing.\nVoxtype transcribes speech; use Piper for synthetic speech or record your own WAV files.\nLicense: CC BY-SA 4.0. Attribution is included in front.txt.\n');
  for (const [name, data] of Object.entries(scripts)) await writeFile(join(output, 'narration', name), data);
  await writeFile(join(output, 'sicp-narration-scripts.zip'), zipSync(scripts));
  const files = await Promise.all([['pdf', 'sicp-source.pdf'], ['epub', 'sicp-source.epub'], ['scripts', 'sicp-narration-scripts.zip']].map(async ([format, name]) => ({ format, name, bytes: (await stat(join(output, name))).size })));
  // Audio is optional and deliberately not copied from an older manuscript build.
  await writeFile(join(output, 'manifest.json'), JSON.stringify({ generatedAt, sections: manuscript.size, illustrations: images.size, files }, null, 2));
  await rm(join(output, 'audio-status.json'), { force: true });
  await rm(join(publicOutput, 'audio-status.json'), { force: true });
  await mkdir(publicOutput, { recursive: true });
  await cp(output, publicOutput, { recursive: true });
  console.log(`Built PDF, EPUB, and narration scripts: ${manuscript.size} manuscript sections, ${images.size} illustrations.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { unzipSync, strFromU8 } from 'fflate';
import { makeEpub, narration, portableSection } from './edition-utils.mjs';

test('portable sections preserve code, text and images, and resolve reading links', () => {
  const result = portableSection('<article><h1>A &amp; B</h1><aside>Engine details<svg><path/></svg></aside><pre><code>x &lt; 2;</code></pre><figure><img src="images/chart.png" alt="Calls against n"/><figcaption>Measured costs</figcaption></figure><a href="/2/2.1.1">Next</a><p id="note">Note</p><a href="#note">Note</a></article>', { id: '1.1.1' }, new Map([['/2/2.1.1', '2.1.1']]));
  const document = new JSDOM(result, { contentType: 'application/xhtml+xml' }).window.document;
  assert.equal(document.querySelector('code').textContent, 'x < 2;');
  assert.equal(document.querySelector('aside').textContent, 'Engine details');
  assert.equal(document.querySelector('svg'), null);
  assert.equal(document.querySelector('img').getAttribute('alt'), 'Calls against n');
  assert.equal(document.querySelector('a').getAttribute('href'), 'section-2.1.1.xhtml');
  assert.equal(document.querySelectorAll('a')[1].getAttribute('href'), '#1.1.1-note');
  const print = portableSection('<article><a href="/2/2.1.1">Next</a></article>', { id: '1.1.1' }, new Map([['/2/2.1.1', '2.1.1']]), true);
  assert.match(print, /href="#section-2.1.1"/);
});

test('narration retains explanations and diagram descriptions without speaking code', () => {
  const text = narration('<article><h1>Recursion</h1><p>Calls grow with n.</p><div class="edition-listing"><p class="edition-listing-label">fib.src</p><pre>function fib(n) { return n; }</pre></div><figure><img alt="Fibonacci call tree"/><figcaption>Repeated calls are marked.</figcaption></figure><table><tr><td>42</td></tr></table></article>');
  assert.match(text, /Calls grow with n/);
  assert.match(text, /fib.src/);
  assert.match(text, /Fibonacci call tree/);
  assert.match(text, /Repeated calls are marked/);
  assert.doesNotMatch(text, /function fib|42/);
});

test('EPUB stores mimetype first and includes valid navigation, spine and embedded images', () => {
  const epub = makeEpub([{ id: 'front', label: 'Front & attribution', html: '<article><h1>Front</h1></article>' }, { id: '1.1.1', label: 'Expressions', html: '<article><img src="images/chart.png" alt="Chart"/></article>' }], new Map([['chart.png', new Uint8Array([1, 2, 3])]]), 'pre { white-space: pre-wrap; }', new Uint8Array([4, 5]), '2026-10-07T12:00:00Z');
  const view = new DataView(epub.buffer, epub.byteOffset, epub.byteLength);
  assert.equal(view.getUint16(8, true), 0); // First ZIP entry is uncompressed.
  assert.equal(strFromU8(epub.slice(30, 38)), 'mimetype');
  const entries = unzipSync(epub);
  assert.equal(strFromU8(entries.mimetype), 'application/epub+zip');
  for (const [name, bytes] of Object.entries(entries)) {
    if (!/\.(xml|xhtml|opf|ncx)$/.test(name)) continue;
    const document = new JSDOM(strFromU8(bytes), { contentType: 'application/xml' }).window.document;
    assert.equal(document.querySelector('parsererror'), null, name);
  }
  const opf = new JSDOM(strFromU8(entries['OEBPS/book.opf']), { contentType: 'application/xml' }).window.document;
  const items = new Map([...opf.getElementsByTagName('item')].map((item) => [item.getAttribute('id'), item.getAttribute('href')]));
  for (const path of items.values()) assert.ok(entries[`OEBPS/${path}`], path);
  for (const ref of opf.getElementsByTagName('itemref')) assert.ok(items.has(ref.getAttribute('idref')));
  const nav = strFromU8(entries['OEBPS/nav.xhtml']);
  assert.match(nav, /epub:type="toc"/);
  assert.match(nav, /section-1.1.1.xhtml/);
  assert.match(strFromU8(entries['OEBPS/styles.css']), /pre-wrap/);
});

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { EditionFile, EditionManifest } from '../editions/catalog.ts';
import { PageHeader } from './parts.tsx';

const FORMATS = {
  pdf: { title: 'Print & PDF', description: 'The complete manuscript, code listings, exercises, diagrams, and charts. A paginated edition for reading offline or printing.', label: 'Download PDF' },
  epub: { title: 'EPUB & Kindle', description: 'Adjustable text, a linked table of contents, and embedded illustrations. Send the EPUB to Kindle using Amazon’s Send to Kindle.', label: 'Download EPUB' },
  scripts: { title: 'Narration scripts', description: 'Section-by-section scripts and a chapter manifest for making an audiobook. Code listings are referenced rather than read aloud.', label: 'Download scripts' },
  audio: { title: 'Audiobook', description: 'A local synthetic narration with chapter markers. Keep the illustrated PDF or EPUB beside you for programs and diagrams.', label: 'Download audiobook' },
};

function size(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export function DownloadsPage() {
  const [manifest, setManifest] = useState<EditionManifest | null>(null);
  const [audioStatus, setAudioStatus] = useState<{ state: string; completed: number; total: number; current?: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}downloads/manifest.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Editions unavailable'); return response.json() as Promise<EditionManifest>; })
      .then(setManifest)
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      void fetch(`${import.meta.env.BASE_URL}downloads/audio-status.json`, { signal: controller.signal, cache: 'no-store' })
        .then((response) => response.ok ? response.json() : null)
        .then((status) => {
          setAudioStatus(status);
          if (status?.state === 'complete') {
            void fetch(`${import.meta.env.BASE_URL}downloads/manifest.json`, { signal: controller.signal, cache: 'no-store' }).then((response) => response.json()).then(setManifest).catch(() => {});
          }
        }).catch(() => {});
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  const fileFor = (format: EditionFile['format']) => manifest?.files.find((file) => file.format === format);
  return <>
    <PageHeader eyebrow="Take the book with you" title="Read offline. Print. Listen." />
    <p className="m-0 max-w-[65ch] text-lg leading-[1.65] text-ink-2">
      All five chapters and the appendices, in editions you can keep. The PDF and EPUB include static illustrations from the interactive examples.
      Return to the <Link to="/front">online book</Link> to run and edit the programs.
    </p>
    {manifest && <p className="m-0 text-sm text-ink-3">{manifest.sections} sections · {manifest.illustrations} illustrations · Built {new Date(manifest.generatedAt).toLocaleDateString()}</p>}
    {!manifest && <p role="status">{failed ? 'Download files have not been built for this copy of the book yet.' : 'Loading editions…'}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      {(['pdf', 'epub', 'audio', 'scripts'] as const).map((format) => {
        const info = FORMATS[format];
        const file = fileFor(format);
        const sample = format === 'audio' ? fileFor('sample') : undefined;
        return <section key={format} className="flex flex-col items-start gap-3 rounded-[10px] border border-line bg-paper-2 p-6">
          <h2 className="m-0 text-2xl font-medium">{info.title}</h2>
          <p className="m-0 flex-1 text-base leading-[1.6] text-ink-2">{info.description}</p>
          {file ? <a download href={`${import.meta.env.BASE_URL}downloads/${file.name}`} className="pressable inline-flex min-h-11 items-center gap-3 rounded-lg bg-accent px-4 py-2 font-semibold text-paper">{info.label}<span className="text-xs font-normal">{size(file.bytes)}</span></a> :
            <span className="text-sm text-ink-3">{format === 'audio' ? audioStatus?.state === 'assembling' ? 'Narration complete. Preparing the audiobook download…' : audioStatus?.state === 'building' ? `Narrating the book: ${audioStatus.completed} of ${audioStatus.total} sections ready.` : audioStatus?.state === 'failed' ? 'Narration paused. The illustrated editions and scripts are available.' : 'Audiobook not yet available.' : 'Available after the editions are built.'}</span>}
          {sample && <div className="flex w-full flex-col gap-2"><span className="text-sm text-ink-2">Listen to a sample · §1.1.1 Expressions</span><audio controls preload="none" className="w-full" aria-label="Audiobook narration sample"><source src={`${import.meta.env.BASE_URL}downloads/${sample.name}`} type="audio/mp4" /></audio></div>}
        </section>;
      })}
    </div>
    <section className="flex flex-col gap-3 text-base leading-[1.6]">
      <h2 className="m-0 text-2xl font-medium">Reading on Kindle</h2>
      <p className="m-0">Download the EPUB, then upload it to <a href="https://www.amazon.com/sendtokindle" target="_blank" rel="noreferrer">Send to Kindle</a>. Amazon converts it for your Kindle library. Text reflows with your font settings; diagrams can be enlarged. Use the PDF when you want fixed pages.</p>
      <p className="m-0 text-ink-2">This adaptation by Andrew Solomon follows Abelson, Sussman, Henz, and Wrigstad’s JavaScript edition. Book content and narration scripts are shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p>
    </section>
  </>;
}

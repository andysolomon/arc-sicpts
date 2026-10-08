The book’s offline editions are generated from the same MDX manuscript and supplied Source programs as the website. Readers reach them at `/downloads` through the front page or the download button in the header.

Run `npm ci`, then `npm run build` from the repository root. This builds the website, an illustrated PDF, a reflowable EPUB, and a ZIP of narration scripts. A system Chromium is used when available; otherwise install Playwright’s browser with `npx playwright install chromium` (on CI Linux, use `npx playwright install --with-deps chromium`). `CHROMIUM_PATH` can select a system executable. `npm run editions` rebuilds the editions from an existing web build. `npm run build:web -w @sicp/book` builds just the web app.

Generated files live in `packages/book/dist/downloads/` and are also copied to the ignored `packages/book/public/downloads/` directory so the development server can serve them. They are build artifacts, not committed binaries. Export requires a Node environment with Chromium and its libraries; a static deployment then needs only the finished `dist` directory. The export renderer starts a temporary server bound to 127.0.0.1 and closes it after typesetting.

The PDF has A4 pages, page numbers, linked contents, bookmarks, selectable prose and code, and illustrations captured at three times the rendering resolution. Code wraps rather than clipping. The EPUB has EPUB 3 navigation, an NCX fallback, a cover image, self-contained PNG illustrations, and relative internal links. It uses reflowable typography, explicit heading alignment, and wrapping code listings. Readers upload the EPUB to [Send to Kindle](https://www.amazon.com/sendtokindle); Amazon converts it for Kindle. This is not a KPF or a directly USB-sideloadable Kindle file. A physical Kindle or Kindle Previewer review remains useful before publishing a retail edition. Amazon’s [reflowable guidelines](https://kdp.amazon.com/en_US/help/topic/GPNJPYK298J8TRRV) explain the format.

The export view at `/edition?section=1.2.3` renders a single manuscript section with static code and exercise starters instead of editors. It uses the same Laboratory jobs and diagrams as the website, waits for the jobs to finish, and captures the final animation frame. Figure captions remain text in the EPUB and PDF. Export does not read the reader’s stored edits or exercise progress. Attribution and the CC BY-SA 4.0 notice are included in every edition.

To build local synthetic narration, run:

```sh
npm run audiobook -- --setup
```

This installs Piper 1.8.0 in `packages/book/.audiobook/venv`, downloads `en_US-lessac-medium`, then narrates every script. The environment, voice, and cached section tracks stay in the ignored `.audiobook/` directory. After setup, `npm run audiobook` works offline. FFmpeg and FFprobe must be installed. The result is `sicp-source.m4b`, with section markers, plus `sicp-audio-tracks.zip` containing individual M4A tracks. The complete M4B appears on the downloads page. Four sections are synthesized in parallel by default; use `--jobs 1` to reduce CPU use. Synthesis resumes from cached sections after an interruption; changed text or voice settings invalidate the affected tracks.

A shorter voice check can be made with:

```sh
npm run audiobook -- --setup --only 1.1.1
npm run audiobook -- --voice /path/to/voice.onnx --length-scale 1.1 --threads 2
```

Samples appear in the audiobook card as a separate listening sample, and are never advertised as a complete audiobook. Use `--voice` to choose a different voice model; keep its `.onnx.json` configuration next to the model and check that voice’s license before distributing recordings.

Voxtype is speech-to-text, so it is used for reviewing narration, rather than synthesis. Add `--verify-with-voxtype` to transcribe section audio at 16 kHz mono, using the locally configured Voxtype model. Transcripts are saved beside cached WAVs for manual comparison against scripts. This does not automatically certify pronunciation or fidelity.

For a human narrator, provide WAV files named after script IDs (`front.wav`, `1.1.1.wav`, `appendix-grammar.wav`, and so on) and run:

```sh
npm run audiobook -- --engine recorded --recordings /path/to/recordings --verify-with-voxtype
```

The audiobook is a listening companion, not a verbatim performance of program syntax: block code and tables are referenced, while the surrounding explanation and diagram captions are narrated. Keep the illustrated edition nearby. Review the synthetic reading of mathematical notation, identifiers, and technical terms before public distribution. The builder normalizes speech and assembles chapters; it does not claim retail audiobook mastering certification. Rebuilding the book editions removes the advertised audio entry until narration has been rebuilt against the new scripts.

Verification commands: `npm test`, `npm run typecheck`, and `python packages/book/scripts/audiobook_test.py`. The audio integration test uses short generated tones and verifies the M4B chapter metadata without downloading a voice.

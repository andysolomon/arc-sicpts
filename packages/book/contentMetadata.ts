import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/** Small catalogs generated from the manuscript, without importing executable examples. */
export function contentMetadata(): Plugin {
  const root = fileURLToPath(new URL('./content/', import.meta.url));
  const catalogs = ['virtual:exercise-catalog', 'virtual:manuscript-index'];
  return {
    name: 'book-content-metadata',
    resolveId(id) { return catalogs.includes(id) ? `\0${id}` : null; },
    load(id) {
      if (!catalogs.some((catalog) => id === `\0${catalog}`)) return null;
      const exerciseModules: Record<string, string> = {};
      const exerciseSections: Record<string, string> = {};
      const manuscript: Record<string, { terms: string; exercises: string[] }> = {};
      for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const file = join(entry.parentPath, entry.name);
        if (!file.endsWith('.mdx') && !file.includes(`${join(root, 'exercises')}/`)) continue;
        this.addWatchFile(file);
        const source = readFileSync(file, 'utf8');
        if (file.endsWith('.mdx')) {
          const pageId = file.includes('/appendix/') ? `appendix/${entry.name.slice(0, -4)}` : entry.name.slice(0, -4);
          // Keep terms, rather than all prose and repeated markup, out of the entry bundle.
          const terms = [...new Set(source.toLowerCase().match(/[\p{L}\p{N}_$]+(?:\.[\p{L}\p{N}_$]+)*/gu) ?? [])].join(' ');
          const exercises = [...source.matchAll(/<Exercise\s+id="([\d.]+)"/g)].map((match) => match[1]!);
          for (const exerciseId of exercises) exerciseSections[exerciseId] = pageId;
          manuscript[pageId] = { terms, exercises };
        } else {
          for (const match of source.matchAll(/^\s*id:\s*['"]([\d.]+)['"]/gm)) {
            const exerciseId = match[1]!;
            if (exerciseModules[exerciseId] !== undefined) throw new Error(`Duplicate exercise ${exerciseId}`);
            exerciseModules[exerciseId] = `../../content/exercises/${entry.name}`;
          }
        }
      }
      // Separate virtual modules keep the full text index in the search chunk.
      return id === '\0virtual:manuscript-index'
        ? `export const manuscript = ${JSON.stringify(manuscript)};`
        : `export const exerciseModules = ${JSON.stringify(exerciseModules)};\nexport const exerciseSections = ${JSON.stringify(exerciseSections)};`;
    },
    handleHotUpdate(context) {
      if (!context.file.startsWith(root)) return;
      for (const catalog of catalogs) {
        const module = context.server.moduleGraph.getModuleById(`\0${catalog}`);
        if (module !== undefined) context.server.moduleGraph.invalidateModule(module);
      }
      context.server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

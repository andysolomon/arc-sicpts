import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { useCallback, useState } from 'react';
import { readStored, removeStored, writeStored } from '../storage.ts';

/** `sicp.editor.<sectionId>.<editorIndex>` */
export const editorKey = (sectionId: string, editorId: string): string => `sicp.editor.${sectionId}.${editorId}`;

const CODE_PARAM = 'code';
/** Which editor on the page a shared `code` belongs to; absent means the first. */
const EDITOR_PARAM = 'ed';
const FIRST_EDITOR = '0';

function sharedSource(editorId: string): string | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get(CODE_PARAM);
  if (code === null || (params.get(EDITOR_PARAM) ?? FIRST_EDITOR) !== editorId) return null;
  const source = decompressFromEncodedURIComponent(code);
  // lz-string answers null or '' for input it cannot decode.
  return source === null || source === '' ? null : source;
}

/** The address of the current page with one editor's contents encoded into it. */
export function shareUrl(editorId: string, source: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set(CODE_PARAM, compressToEncodedURIComponent(source));
  if (editorId !== FIRST_EDITOR) url.searchParams.set(EDITOR_PARAM, editorId);
  return url.toString();
}

/**
 * An editor's text. A shared link wins over what the reader last typed, which
 * wins over the source the page supplies.
 */
export function usePersistentSource(
  sectionId: string,
  editorId: string,
  supplied: string,
): { source: string; setSource: (source: string) => void; reset: () => void } {
  const key = editorKey(sectionId, editorId);
  const [source, setState] = useState(() => sharedSource(editorId) ?? readStored(key) ?? supplied);

  const setSource = useCallback(
    (next: string) => {
      setState(next);
      if (next === supplied) removeStored(key);
      else writeStored(key, next);
    },
    [key, supplied],
  );

  const reset = useCallback(() => {
    setState(supplied);
    removeStored(key);
    const url = new URL(window.location.href);
    if ((url.searchParams.get(EDITOR_PARAM) ?? FIRST_EDITOR) === editorId) {
      url.searchParams.delete(CODE_PARAM);
      url.searchParams.delete(EDITOR_PARAM);
      window.history.replaceState(window.history.state, '', url);
    }
  }, [editorId, key, supplied]);

  return { source, setSource, reset };
}

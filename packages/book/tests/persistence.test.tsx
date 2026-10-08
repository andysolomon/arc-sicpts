import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { editorKey, shareUrl, usePersistentSource } from '../src/editor/persistence.ts';

describe('resetting shared editors', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/1/1.2.1');
  });

  it.each(['0', '1'])('removes editor %s from the URL and stays reset on reload', (id) => {
    const url = new URL(shareUrl(id, '999;'));
    url.searchParams.set('view', 'notes');
    url.hash = '#example';
    window.history.replaceState(null, '', url);
    window.localStorage.setItem(editorKey('1.2.1', id), '888;');
    const { result, unmount } = renderHook(() => usePersistentSource('1.2.1', id, '100;'));
    expect(result.current.source).toBe('999;');
    act(() => result.current.reset());
    expect(result.current.source).toBe('100;');
    expect(window.location.search).toBe('?view=notes');
    expect(window.location.hash).toBe('#example');
    expect(window.localStorage.getItem(editorKey('1.2.1', id))).toBeNull();
    unmount();
    expect(renderHook(() => usePersistentSource('1.2.1', id, '100;')).result.current.source).toBe('100;');
  });

  it('preserves a link belonging to another editor', () => {
    window.history.replaceState(null, '', shareUrl('1', '999;'));
    const before = window.location.href;
    const { result } = renderHook(() => usePersistentSource('1.2.1', '0', '100;'));
    act(() => result.current.reset());
    expect(window.location.href).toBe(before);
    expect(renderHook(() => usePersistentSource('1.2.1', '1', '100;')).result.current.source).toBe('999;');
  });
});

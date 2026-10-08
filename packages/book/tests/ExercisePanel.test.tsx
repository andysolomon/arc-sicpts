import type { JobHandle, TerminalEvent } from '@sicp/lab';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseSpec } from '../content/exercises/spec.ts';
import { editorKey } from '../src/editor/persistence.ts';
import { ExercisePanel } from '../src/mdx/ExercisePanel.tsx';
import { SectionContext } from '../src/mdx/SectionContext.ts';
import { readExercise, recordExercise } from '../src/progress.ts';

const { submit } = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock('../src/lab/client.ts', () => ({ labClient: () => ({ submit }) }));
vi.mock('../src/editor/CodeEditor.tsx', () => ({
  CodeEditor: ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) =>
    <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />,
}));

const spec: ExerciseSpec = {
  id: '1.9', starter: '0;', solution: '1;', tests: [
    { name: 'hidden value', kind: 'value', expr: 'secret(12345)', expected: 67890 },
    { name: 'hidden work', kind: 'calls', call: 'secret(12345)', fn: 'secret', atMost: 5 },
  ],
};

function panel() {
  return render(<SectionContext value="1.2.1"><ExercisePanel id="1.9" spec={spec}>Statement</ExercisePanel></SectionContext>);
}

function pendingCheck() {
  let resolve!: (event: TerminalEvent) => void;
  const handle: JobHandle = { id: 1, cancel: vi.fn(), finished: new Promise((done) => { resolve = done; }) };
  submit.mockReturnValueOnce(handle);
  return { handle, finish: async (passed = 2) => act(async () => {
    resolve({ type: 'check-done', id: 1, passed, total: 2, results: spec.tests.map((test, i) => ({
      name: test.name, pass: i < passed, detail: i < passed ? null : 'secret(12345) expected 67890',
    })) });
  }) };
}

describe('exercise checks', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/1/1.2.1');
    submit.mockReset();
  });

  it('marks a passing result stale after edits and restores it only for the checked source', async () => {
    panel();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1;' } });
    const check = pendingCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    await check.finish();
    expect(screen.getByTestId('check-status')).toHaveTextContent('2 / 2 hidden tests pass');
    expect(readExercise('1.9')).toEqual({ passed: 2, total: 2, source: '1;' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2;' } });
    expect(screen.getByTestId('check-status')).toHaveTextContent('edited since last check');
    expect(screen.getByTestId('check-status')).not.toHaveTextContent('2 / 2');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1;' } });
    expect(screen.getByTestId('check-status')).toHaveTextContent('2 / 2 hidden tests pass');
  });

  it('cancels an in-flight check after an edit and ignores a late successful response', async () => {
    panel();
    const check = pendingCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2;' } });
    expect(check.handle.cancel).toHaveBeenCalledOnce();
    await check.finish();
    expect(readExercise('1.9')).toBeNull();
    expect(screen.getByTestId('check-status')).toHaveTextContent('not checked yet');
    expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
  });

  it('keeps stale history on remount and treats legacy results as needing another check', () => {
    recordExercise('1.9', { passed: 2, total: 2, source: '1;' });
    window.localStorage.setItem(editorKey('1.2.1', 'ex-1.9'), '2;');
    const view = panel();
    expect(screen.getByTestId('check-status')).toHaveTextContent('edited since last check');
    view.unmount();
    recordExercise('1.9', { passed: 2, total: 2 });
    panel();
    expect(screen.getByTestId('check-status')).toHaveTextContent('check again');
  });

  it.each([0, 1])('gives actionable feedback for %i passing tests without exposing hidden data', async (passed) => {
    panel();
    const check = pendingCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    await check.finish(passed);
    const feedback = screen.getByRole('list', { name: 'Check feedback' });
    expect(feedback).toHaveTextContent('Efficiency: check how much work is repeated');
    if (passed === 0) expect(feedback).toHaveTextContent('Values: check your base cases');
    expect(feedback).not.toHaveTextContent('secret');
    expect(feedback).not.toHaveTextContent('12345');
    expect(feedback).not.toHaveTextContent('67890');
    expect(feedback).not.toHaveTextContent('hidden work');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '3;' } });
    expect(screen.queryByRole('list', { name: 'Check feedback' })).toBeNull();
  });
});

import { createHeapInspector, prepare, type Environment, type HeapSnapshot, type Session } from '@sicp/lab';
import { useMemo, type ReactNode } from 'react';
import { layoutBoxPointer } from '../../anim/model/boxPointer.ts';
import { BoxPointerDrawing } from '../../anim/scenes/BoxPointerScene.tsx';
import { Figure } from '../Figure.tsx';

/**
 * A still box-and-pointer diagram of the pairs a small program leaves behind,
 * for figures and solutions. The program runs here, on the page's own thread,
 * so keep it to a few statements.
 */

export interface BoxPointerDiagramProps {
  source: string;
  title?: string;
  caption?: ReactNode;
  /** Draw only these bindings (and what they reach); defaults to all of them. */
  names?: readonly string[];
}

const DIAGRAM_BUDGET = 20_000;

/** The program frame after the last statement, or `null` when the program does not run to the end. */
export function finalHeap(source: string): HeapSnapshot | null {
  let session: Session | null = null;
  const env = (): Environment | null => session?.machine.programEnv ?? null;
  try {
    const inspector = createHeapInspector(source, env);
    session = prepare(source, { hooks: [inspector.hooks], budget: DIAGRAM_BUDGET });
    session.machine.run();
    if (session.machine.status !== 'done') return null;
    inspector.finish();
    return inspector.snapshots.at(-1) ?? null;
  } catch {
    return null;
  }
}

export function BoxPointerDiagram({ source, title = 'Box-and-pointer diagram', caption, names }: BoxPointerDiagramProps) {
  const snapshot = useMemo(() => finalHeap(source), [source]);
  const layout = useMemo(() => {
    if (snapshot === null) return null;
    const bindings = names === undefined ? snapshot.bindings : snapshot.bindings.filter((b) => names.includes(b.name));
    return layoutBoxPointer({ bindings, pairs: snapshot.pairs });
  }, [names, snapshot]);
  return (
    <Figure title={title} provenance="drawn from the evaluated program" caption={caption}>
      {layout === null ? (
        <div className="text-sm text-ink-3">The program did not run to its end.</div>
      ) : (
        <BoxPointerDrawing layout={layout} label={`${layout.boxes.length} pairs`} maxHeight={320} enter={false} />
      )}
    </Figure>
  );
}

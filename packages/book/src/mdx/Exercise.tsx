import { lazy, Suspense, type LazyExoticComponent, type ComponentType, type ReactNode } from 'react';
import { exerciseFor } from './exerciseCatalog.ts';

/** Kept outside the lazy panel so MDX and the panel identify the same element type. */
export function Solution({ children }: { children: ReactNode }) { return <>{children}</>; }

export interface ExerciseProps { id: string; children: ReactNode }

const panels = new Map<string, LazyExoticComponent<ComponentType<ExerciseProps>>>();

export function Exercise(props: ExerciseProps) {
  let Panel = panels.get(props.id);
  if (Panel === undefined) {
    const id = props.id;
    Panel = lazy(async () => {
      const [spec, { ExercisePanel }] = await Promise.all([exerciseFor(id), import('./ExercisePanel.tsx')]);
      return { default: (props: ExerciseProps) => <ExercisePanel {...props} spec={spec} /> };
    });
    panels.set(id, Panel);
  }
  return <Suspense fallback={<p role="status">Loading exercise {props.id}…</p>}><Panel {...props} /></Suspense>;
}

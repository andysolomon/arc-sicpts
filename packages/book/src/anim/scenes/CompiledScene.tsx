import { useMemo } from 'react';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode } from '../svg.tsx';
import { useLabJob } from '../useLabJob.ts';

/**
 * The code the compiler of §5.5 produces for the program in the editor, with
 * the stack operations that `preserving` inserted picked out.
 */

export interface CompiledSceneProps {
  source: string;
  title?: string;
  target?: string;
  linkage?: string;
}

const KIND: Readonly<Record<string, string>> = {
  label: 'text-str',
  save: 'bg-warn-soft text-warn',
  restore: 'bg-warn-soft text-warn',
  push_marker_to_stack: 'text-accent-ink',
  revert_stack_to_marker: 'text-accent-ink',
  go_to: 'text-accent-ink',
  branch: 'text-accent-ink',
  test: 'text-ink',
};

export function CompiledScene({ source, title = 'What the compiler produces', target = 'val', linkage = 'next' }: CompiledSceneProps) {
  const { result, pending } = useLabJob({ type: 'compile', source, target, linkage }, 'compile-done');
  const counts = useMemo(() => {
    const lines = result?.lines ?? [];
    const count = (kind: string) => lines.filter((line) => line.kind === kind).length;
    return {
      instructions: lines.filter((line) => line.kind !== 'label').length,
      labels: count('label'),
      saves: count('save'),
      restores: count('restore'),
      tests: count('test'),
    };
  }, [result]);

  if (result === null || result.error !== null) {
    const why = result === null ? (pending ? 'Compiling…' : 'Nothing compiled yet.') : `The compiler stopped: ${result.error}`;
    return (
      <SceneFrame title={title} provenance="compiler" caption={inlineCode(why)} empty="No code yet">
        <div />
      </SceneFrame>
    );
  }

  const caption =
    `${counts.instructions} instructions and ${counts.labels} labels, compiled with target \`${target}\` and linkage \`${linkage}\`. ` +
    `The stack operations are highlighted: ${counts.saves} saves and ${counts.restores} restores. ` +
    `The code needs ${result.needs.length === 0 ? 'no register' : result.needs.map((r) => `\`${r}\``).join(', ')} and modifies ${result.modifies.length === 0 ? 'none' : result.modifies.map((r) => `\`${r}\``).join(', ')}.`;

  return (
    <SceneFrame title={title} provenance="compiler" caption={inlineCode(caption)}>
      <ol aria-label="Compiled code" className="m-0 max-h-[420px] list-none overflow-auto rounded-lg border border-line bg-paper-2 p-2 font-mono text-[11.5px] leading-[1.55]">
        {result.lines.map((line, i) => (
          <li
            key={i}
            data-testid="compiled-line"
            data-kind={line.kind}
            className={`rounded px-1 whitespace-pre ${line.kind === 'label' ? '' : 'pl-4'} ${KIND[line.kind] ?? 'text-ink-2'}`}
          >
            {line.kind === 'label' ? `"${line.text}",` : `${line.text},`}
          </li>
        ))}
      </ol>
    </SceneFrame>
  );
}

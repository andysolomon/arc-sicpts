import type { GcRun, GcStep } from '@sicp/lab';
import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode } from '../svg.tsx';
import { useLabJob } from '../useLabJob.ts';

/**
 * List structure as the two vectors of §5.3.1, laid out from the pairs the
 * program allocated, and then, keyframe by keyframe, the stop-and-copy
 * collector of §5.3.2 moving what the program's names can reach into new
 * memory, leaving broken hearts behind.
 */

export interface MemorySceneProps {
  source: string;
  title?: string;
  /** Index of the first pair; exercise 5.19 starts at 1. */
  start?: number;
  /** Only lay the memory out; do not collect. */
  layoutOnly?: boolean;
}

interface Keyframe {
  caption: string;
  heads: string[];
  tails: string[];
  newHeads: string[] | null;
  newTails: string[] | null;
  scan: number | null;
  free: number;
  /** Cells to highlight: [space, index]. */
  focus: ['old' | 'new', number][];
  names: { name: string; pointer: string }[];
  rootFrom: number | null;
}

const cellOf = (pointer: string): number | null => (/^p\d+$/.test(pointer) ? Number(pointer.slice(1)) : null);

function describeStep(step: GcStep): { caption: string; focus: Keyframe['focus'] } {
  const old = cellOf(step.old);
  const moved = cellOf(step.new);
  switch (step.label) {
    case 'begin_garbage_collection':
    case 'reassign_root':
      return { caption: `Start with \`root\`, which points at \`${step.old}\`: relocate it first, so that \`root\` can point into new memory.`, focus: old === null ? [] : [['old', old]] };
    case 'gc_loop':
      return step.scan === step.free
        ? { caption: '`scan` has caught up with `free`: every pair in new memory has been scanned.', focus: [] }
        : { caption: `Scan the pair at \`p${step.scan}\` in new memory: its head and tail may still point into old memory.`, focus: [['new', step.scan]] };
    case 'update_head':
    case 'update_tail':
      return { caption: `The ${step.label === 'update_head' ? 'head' : 'tail'} of \`p${step.scan}\` now holds \`${step.new}\`, its new address.`, focus: [['new', step.scan]] };
    case 'relocate_old_result_in_new':
      return old === null
        ? { caption: `\`${step.old}\` is not a pointer to a pair, so it stays as it is.`, focus: [] }
        : { caption: `Relocate \`${step.old}\`.`, focus: [['old', old]] };
    case 'pair':
      return moved === null || old === null
        ? { caption: `Relocate \`${step.old}\`.`, focus: old === null ? [] : [['old', old]] }
        : {
            caption: `\`${step.old}\` has not moved yet: copy it to \`p${moved}\` at \`free\`, and leave a broken heart that forwards to \`p${moved}\`.`,
            focus: [
              ['old', old],
              ['new', moved],
            ],
          };
    case 'already_moved':
      return { caption: `\`${step.old}\` holds a broken heart: it has already moved, to \`${step.new}\`. Shared structure stays shared.`, focus: old === null ? [] : [['old', old]] };
    case 'gc_flip':
      return { caption: 'Flip: new memory becomes working memory, and the old memory is free for the next collection.', focus: [] };
    default:
      return { caption: step.instruction, focus: [] };
  }
}

function keyframes(run: GcRun, layoutOnly: boolean, start: number): Keyframe[] {
  const { before } = run;
  // Where the program's own pairs end: the root list comes after them.
  const programCells = before.free - before.names.length;
  const allocated = programCells - start;
  const frames: Keyframe[] = [
    {
      caption: `The program allocated ${allocated} pair${allocated === 1 ? '' : 's'}, at \`p${start}\` onwards in the order it made them. ${before.names.map((n) => `\`${n.name}\` is \`${n.pointer}\``).join(', ')}.`,
      heads: before.heads.slice(0, programCells),
      tails: before.tails.slice(0, programCells),
      newHeads: null,
      newTails: null,
      scan: null,
      free: programCells,
      focus: [],
      names: before.names,
      rootFrom: null,
    },
  ];
  if (layoutOnly) return frames;
  frames.push({
    caption: `To collect, put the values of all the names in a list at \`free\` and point \`root\` at it: \`${before.root ?? 'e0'}\`. Whatever the root list cannot reach is garbage.`,
    heads: before.heads,
    tails: before.tails,
    newHeads: null,
    newTails: null,
    scan: null,
    free: before.free,
    focus: [],
    names: before.names,
    rootFrom: programCells,
  });
  // One keyframe per block of the collector entered, and the last state.
  run.steps.forEach((step, i) => {
    const next = run.steps[i + 1];
    const entersBlock = next === undefined || next.label !== step.label;
    if (!entersBlock) return;
    const { caption, focus } = describeStep(step);
    const flipped = step.flipped;
    frames.push({
      caption,
      heads: flipped ? step.newHeads : step.heads,
      tails: flipped ? step.newTails : step.tails,
      newHeads: flipped ? step.heads : step.newHeads,
      newTails: flipped ? step.tails : step.newTails,
      scan: step.scan,
      free: step.free,
      focus,
      names: before.names,
      rootFrom: programCells,
    });
  });
  const last = frames[frames.length - 1];
  if (last !== undefined) {
    frames.push({
      ...last,
      caption: `Done. ${run.after.free} pair${run.after.free === 1 ? ' is' : 's are'} live, the root list included; ${before.free - run.after.free} were garbage. Now ${run.after.names.map((n) => `\`${n.name}\` is \`${n.pointer}\``).join(', ')}.`,
      heads: run.after.heads,
      tails: run.after.tails,
      newHeads: null,
      newTails: null,
      scan: null,
      free: run.after.free,
      focus: [],
      names: run.after.names,
      rootFrom: null,
    });
  }
  return frames;
}

const tone = (pointer: string): string =>
  pointer === 'broken_heart'
    ? 'bg-bad-soft text-bad'
    : pointer.startsWith('p')
      ? 'text-accent-ink'
      : pointer.startsWith('n')
        ? 'text-num'
        : pointer.startsWith('s')
          ? 'text-str'
          : 'text-ink-3';

function Vectors({ label, heads, tails, focus, from = 0, markers, root }: { label: string; heads: string[]; tails: string[]; focus: number[]; from?: number; markers?: { scan: number | null; free: number }; root?: number | null }) {
  const size = Math.max(heads.length, from + 1);
  const indices = Array.from({ length: size - from }, (_, k) => from + k);
  return (
    <div className="flex flex-col gap-1" aria-label={label}>
      <span className="font-mono text-[11px] text-ink-3">{label}</span>
      <div className="overflow-x-auto">
        <table className="border-collapse font-mono text-[11.5px] tabular-nums [&_td]:min-w-[46px] [&_td]:border [&_td]:border-line [&_td]:px-1.5 [&_td]:py-0.5 [&_td]:text-center [&_th]:px-1.5 [&_th]:text-left [&_th]:font-normal [&_th]:text-ink-3">
          <tbody>
            <tr>
              <th />
              {indices.map((i) => (
                <td key={i} className={`border-none! text-ink-3 ${root !== null && root !== undefined && i >= root ? 'italic' : ''}`}>
                  {i}
                </td>
              ))}
            </tr>
            {(['heads', 'tails'] as const).map((row) => (
              <tr key={row}>
                <th>{row}</th>
                {indices.map((i) => {
                  const pointer = (row === 'heads' ? heads : tails)[i] ?? '';
                  const focused = focus.includes(i);
                  return (
                    <motion.td
                      key={`${i}-${pointer}`}
                      data-testid="memory-cell"
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                      className={`${tone(pointer)} ${focused ? 'outline-2 outline-accent' : ''}`}
                    >
                      {pointer === 'broken_heart' ? '♡ broken' : pointer}
                    </motion.td>
                  );
                })}
              </tr>
            ))}
            {markers !== undefined && (
              <tr>
                <th />
                {indices.map((i) => (
                  <td key={i} className="border-none! text-[10.5px] text-accent-ink">
                    {[markers.scan === i ? 'scan' : '', markers.free === i ? 'free' : ''].filter(Boolean).join(' ')}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MemoryScene({ source, title = 'Memory as two vectors', start = 0, layoutOnly = false }: MemorySceneProps) {
  const { result, pending } = useLabJob({ type: 'memory', source, start }, 'memory-done');
  const frames = useMemo(() => (result?.run === null || result?.run === undefined ? [] : keyframes(result.run, layoutOnly, start)), [layoutOnly, result, start]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames.length, { stage, resetKey: result, msPerStep: 1500 });
  const frame = frames[player.index];

  if (frame === undefined) {
    const why = result === null ? (pending ? 'Laying out memory…' : 'Nothing to lay out yet.') : `The program could not be laid out: ${result.error ?? 'no pairs'}`;
    return (
      <SceneFrame title={title} provenance="memory" caption={inlineCode(why)} empty="No memory to draw">
        <div />
      </SceneFrame>
    );
  }

  return (
    <SceneFrame title={title} provenance="memory" player={frames.length > 1 ? player : undefined} caption={inlineCode(frame.caption)} step={player.index}>
      <div ref={stage} className="flex flex-col gap-3">
        <Vectors
          label={frame.newHeads === null ? 'working memory: the_heads and the_tails' : 'old memory'}
          heads={frame.heads}
          tails={frame.tails}
          from={start}
          root={frame.rootFrom}
          focus={frame.focus.filter(([space]) => space === 'old').map(([, i]) => i)}
        />
        {frame.newHeads !== null && frame.newTails !== null && (
          <Vectors
            label="new memory"
            heads={frame.newHeads}
            tails={frame.newTails}
            focus={frame.focus.filter(([space]) => space === 'new').map(([, i]) => i)}
            markers={{ scan: frame.scan, free: frame.free }}
          />
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px]" aria-label="Names">
          {frame.names.map((n) => (
            <span key={n.name} data-testid="memory-name">
              <span className="text-ink-3">{n.name}</span> <span className={tone(n.pointer)}>{n.pointer}</span>
            </span>
          ))}
          {frame.newHeads === null && <span className="text-ink-3">free p{frame.free}</span>}
        </div>
      </div>
    </SceneFrame>
  );
}

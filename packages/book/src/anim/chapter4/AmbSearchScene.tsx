import { ambProbeNames, withSearchProbe } from '@sicp/lab';
import { AnimatePresence } from 'motion/react';
import { useMemo, useRef } from 'react';
import { clip, monoWidth, tidy, type TreeInput } from '../model/layout.ts';
import { searchTree, type SearchNode, type SearchStep } from '../model/ambSearch.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Edge, FONT, inlineCode, NODE_HEIGHT, Pill, Stage, type Tone } from '../svg.tsx';
import { useCalls } from '../useCalls.ts';

/**
 * The depth-first search of the amb evaluator, drawn as the tree of choices it
 * makes. The program runs in the Laboratory under the amb evaluator of the
 * editor's prelude, with `analyze_amb` replaced by a version that reports each
 * alternative it tries, each value an alternative produces, and each choice
 * point that runs out; one keyframe per event.
 */

export interface AmbSearchSceneProps {
  source: string;
  prelude?: string | undefined;
}

const MAX_CALLS = 400;
const MAX_NODES = 64;
const LABEL = 16;
const LEVEL = 50;
const GAP = 10;
const PAD = 18;

const labelOf = (step: SearchStep, node: SearchNode): string => clip(step.labels.get(node.id) ?? node.text, LABEL);

export function AmbSearchScene({ source, prelude }: AmbSearchSceneProps) {
  const probed = useMemo(() => (prelude === undefined ? null : withSearchProbe(prelude)), [prelude]);
  const { log, pending } = useCalls(source, ambProbeNames, {
    prelude: probed ?? prelude,
    maxCalls: MAX_CALLS,
    budget: 4_000_000,
  });
  const tree = useMemo(() => (log === null ? null : searchTree(log.calls, { maxNodes: MAX_NODES })), [log]);
  const steps = tree?.steps ?? [];
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(steps.length, { stage, resetKey: log, msPerStep: 850 });

  // Lay out the whole tree once, so that nodes keep their places as it grows.
  const last = steps[steps.length - 1];
  const layout = useMemo(() => {
    if (tree === null || last === undefined) return null;
    const input = (id: number): TreeInput<SearchNode> => {
      const node = tree.nodes[id] as SearchNode;
      return { data: node, children: node.children.map(input) };
    };
    const width = (node: SearchNode) => Math.max(26, monoWidth(clip(last.labels.get(node.id) ?? node.text, LABEL), FONT) + 16);
    return tidy(input(0), { nodeWidth: width, gap: GAP, level: LEVEL });
  }, [last, tree]);

  const title = 'The search tree';
  const step = steps[player.index];
  if (probed === null || tree === null || layout === null || step === undefined) {
    const why =
      probed === null
        ? 'This animation needs the amb evaluator as the prelude.'
        : log === null || pending
          ? 'Running the program under the amb evaluator…'
          : log.status === 'error'
            ? `The program stopped with an error: ${log.result ?? ''}`
            : 'The program reached no `amb`: give `amb_solutions` a program that makes choices.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No choices made yet">
        <div />
      </SceneFrame>
    );
  }

  const atEnd = player.index === steps.length - 1;
  const cutShort = tree.truncated || log?.truncated === true || log?.status === 'budget-exhausted';
  const summary = atEnd
    ? cutShort
      ? ` The search went on beyond what is drawn here: only its first ${MAX_NODES} nodes are shown.`
      : step.kind === 'exhausted' || step.kind === 'solution'
        ? ` ${tree.solutions === 0 ? 'No values were found.' : tree.solutions === 1 ? 'One value was found.' : `${tree.solutions} values were found.`}`
        : ''
    : '';
  const onPath = new Set(step.path);
  const toneOf = (node: SearchNode): Tone => {
    if (node.id === step.focus) return node.kind === 'dead' ? 'bad' : node.kind === 'solution' ? 'ok' : 'focus';
    if (node.kind === 'dead') return 'bad';
    if (node.kind === 'solution' || step.succeeded.has(node.id)) return 'ok';
    if (step.abandoned.has(node.id)) return 'dim';
    return 'plain';
  };
  const width = layout.width + PAD * 2;
  const height = layout.height + NODE_HEIGHT + PAD * 2;
  const at = (node: { x: number; y: number }) => ({ x: node.x + PAD, y: node.y + PAD + NODE_HEIGHT / 2 });

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(step.caption + summary)}>
      <div ref={stage} className="flex flex-col gap-2">
        <Stage width={width} height={height} label="Search tree of the amb program" maxHeight={380}>
          {layout.nodes.map((placed) =>
            placed.parent === null || placed.data.id >= step.visible ? null : (
              <Edge
                key={`e${placed.data.id}`}
                x1={at(placed.parent).x}
                y1={at(placed.parent).y + NODE_HEIGHT / 2}
                x2={at(placed).x}
                y2={at(placed).y - NODE_HEIGHT / 2}
                tone={onPath.has(placed.data.id) || placed.data.id === step.focus ? 'accent' : 'line'}
                dashed={step.abandoned.has(placed.data.id) && !step.succeeded.has(placed.data.id)}
              />
            ),
          )}
          <AnimatePresence>
            {layout.nodes.map((placed) => {
              if (placed.data.id >= step.visible) return null;
              const { x, y } = at(placed);
              const label = labelOf(step, placed.data);
              return (
                <Pill
                  key={placed.data.id}
                  testId={`search-node-${placed.data.kind}`}
                  x={x}
                  y={y}
                  width={Math.max(26, monoWidth(label, FONT) + 16)}
                  text={label}
                  tone={toneOf(placed.data)}
                />
              );
            })}
          </AnimatePresence>
        </Stage>
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-3">
          <span>
            <span className="text-accent-ink">━</span> current path
          </span>
          <span>
            <span className="text-ink-3">┅</span> abandoned on backtracking
          </span>
          <span>
            <span className="text-bad">✗</span> dead end
          </span>
          <span>
            <span className="text-ok">■</span> led to a value
          </span>
        </div>
      </div>
    </SceneFrame>
  );
}

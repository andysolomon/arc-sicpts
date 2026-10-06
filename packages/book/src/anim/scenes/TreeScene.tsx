import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { monoWidth, tidy, type Placed } from '../model/layout.ts';
import { keyframeAt, statementTrees, treeKeyframes, type ExprNode, type StatementTree, type TreeKeyframe } from '../model/tree.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Edge, FONT, inlineCode, NODE_HEIGHT, Pill, Stage, useEase, type Tone } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * An expression statement drawn as the tree the parser built, then evaluated
 * the way §1.1.3 describes: values appear at the leaves and climb to the root.
 * The text of the statement first morphs into the tree, so the shape of
 * precedence is visible before any value moves.
 */

export interface TreeSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
  /** Follow the stepper at this record index instead of running a player. */
  stepIndex?: number;
}

type Frame = { kind: 'flat'; tree: StatementTree } | { kind: 'tree'; tree: StatementTree; keyframe: TreeKeyframe };

const LEVEL = 56;
const GAP = 16;
/** Horizontal distance per character of the flat text; wider than the glyphs so pills do not touch. */
const PITCH = 14;
const PAD = 24;

const nodeWidth = (node: ExprNode): number => Math.max(30, monoWidth(node.label, FONT) + 18);

function frameList(trees: StatementTree[], keyframes: TreeKeyframe[]): Frame[] {
  const frames: Frame[] = [];
  const byIndex = new Map(trees.map((tree) => [tree.index, tree]));
  let statement = -1;
  for (const keyframe of keyframes) {
    const tree = byIndex.get(keyframe.statement);
    if (tree === undefined) continue;
    if (keyframe.statement !== statement) {
      statement = keyframe.statement;
      frames.push({ kind: 'flat', tree });
    }
    frames.push({ kind: 'tree', tree, keyframe });
  }
  if (frames.length === 0 && trees[0] !== undefined) frames.push({ kind: 'flat', tree: trees[0] });
  return frames;
}

export function TreeScene({ source, trace, title = 'The expression as a tree', stepIndex }: TreeSceneProps) {
  const ease = useEase();
  const trees = useMemo(() => statementTrees(source), [source]);
  const keyframes = useMemo(() => treeKeyframes(trees, trace, source), [source, trace, trees]);
  const frames = useMemo(() => frameList(trees, keyframes), [keyframes, trees]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames.length, { stage, resetKey: trace, autoplay: stepIndex === undefined });

  let index = player.index;
  if (stepIndex !== undefined) {
    // The stepper's record index picks the keyframe; before the first step the text is flat.
    const treeFrames = frames.map((frame, i) => ({ frame, i })).filter(({ frame }) => frame.kind === 'tree');
    const ats = treeFrames.map(({ frame }) => (frame.kind === 'tree' ? frame.keyframe.at : 0));
    const k = keyframeAt(ats.map((at) => ({ at })), stepIndex);
    const chosen = treeFrames[k];
    index = stepIndex === 0 || chosen === undefined ? 0 : chosen.i;
    if (stepIndex > 0 && chosen !== undefined && (chosen.frame.kind === 'tree' ? chosen.frame.keyframe.at : 0) > stepIndex) index = 0;
  }
  const frame = frames[index];

  const layout = useMemo(() => (frame === undefined ? null : tidy(frame.tree.root, { nodeWidth, gap: GAP, level: LEVEL })), [frame]);

  if (frame === undefined || layout === null) {
    return (
      <SceneFrame title={title} provenance={stepIndex === undefined ? 'trace' : 'stepper'} caption="Write an expression statement to see its tree." empty="No expression statement in the program">
        <div />
      </SceneFrame>
    );
  }

  const flat = frame.kind === 'flat';
  const text = frame.tree.text;
  const textWidth = text.length * PITCH;
  const width = Math.max(layout.width, textWidth) + PAD * 2;
  const height = (flat ? 0 : layout.height) + NODE_HEIGHT + PAD * 2 + 10;
  const treeOffset = (width - layout.width) / 2;
  const textOffset = (width - textWidth) / 2;
  const top = PAD + NODE_HEIGHT / 2;
  const statementStart = frame.tree.loc.start;

  const position = (node: Placed<ExprNode>): { x: number; y: number } =>
    flat
      ? { x: textOffset + (node.data.tokenStart - statementStart) * PITCH + (node.data.flatLabel.length * PITCH) / 2, y: top }
      : { x: treeOffset + node.x, y: top + node.y };

  const values = frame.kind === 'tree' ? frame.keyframe.values : new Map<string, string>();
  const focus = frame.kind === 'tree' ? frame.keyframe.focus : null;
  const caption =
    frame.kind === 'flat'
      ? stepIndex !== undefined && stepIndex === 0
        ? `Press step above. The text \`${text}\` is about to become a tree.`
        : `\`${text}\` as written. Parentheses and precedence decide the tree it becomes.`
      : frame.keyframe.caption;

  // Literal text other than node labels: parentheses and commas, shown only while flat.
  const punctuation = [...text].flatMap((ch, i) => ('(),'.includes(ch) ? [{ ch, i }] : []));

  return (
    <SceneFrame title={title} provenance={stepIndex === undefined ? 'trace' : 'stepper'} player={stepIndex === undefined ? player : undefined} caption={inlineCode(caption)} step={index}>
      <div ref={stage}>
        <Stage width={width} height={height} label={`Tree for ${text}`}>
          {layout.nodes.map((node) =>
            node.parent === null ? null : (
              <Edge
                key={`e-${node.data.id}`}
                x1={position(node.parent).x}
                y1={position(node.parent).y + NODE_HEIGHT / 2}
                x2={position(node).x}
                y2={position(node).y - NODE_HEIGHT / 2}
                opacity={flat ? 0 : 1}
                tone={focus === node.data.id ? 'accent' : 'line'}
              />
            ),
          )}
          <AnimatePresence>
            {flat &&
              punctuation.map(({ ch, i }) => (
                <motion.text
                  key={`p${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  x={textOffset + i * PITCH + PITCH / 2}
                  y={top}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={FONT}
                  className="fill-ink-3"
                >
                  {ch}
                </motion.text>
              ))}
          </AnimatePresence>
          {layout.nodes.map((node) => {
            const { x, y } = position(node);
            const value = values.get(node.data.id);
            const parentHasValue = node.parent !== null && values.has(node.parent.data.id);
            const isLeafLiteral = node.data.kind === 'number' || node.data.kind === 'string' || node.data.kind === 'boolean';
            const hasValue = value !== undefined && !isLeafLiteral;
            const tone: Tone = focus === node.data.id ? 'focus' : isLeafLiteral || hasValue ? 'value' : 'plain';
            const label = flat ? node.data.flatLabel : hasValue ? value : node.data.label;
            // Flat pills span the characters they stand for, so the line reads as text.
            const width_ = flat ? Math.max(22, node.data.flatLabel.length * PITCH - 4) : hasValue ? Math.max(30, monoWidth(value, FONT) + 18) : nodeWidth(node.data);
            return (
              <g key={node.data.id}>
                <Pill x={x} y={y} width={width_} text={label} tone={tone} enter={false} opacity={parentHasValue ? 0.45 : 1} testId={hasValue ? 'value' : `node-${node.data.kind}`} />
                <AnimatePresence>
                  {hasValue && (
                    <motion.text
                      key={`l-${node.data.id}`}
                      initial={{ opacity: 0, x, y: y - 6 }}
                      animate={{ opacity: parentHasValue ? 0.4 : 0.8, x, y: y - NODE_HEIGHT / 2 - 5 }}
                      exit={{ opacity: 0 }}
                      transition={ease}
                      textAnchor="middle"
                      fontSize={9.5}
                      className="fill-ink-3"
                    >
                      {node.data.label}
                    </motion.text>
                  )}
                </AnimatePresence>
              </g>
            );
          })}
        </Stage>
      </div>
    </SceneFrame>
  );
}

import type { Segment } from '@sicp/lab';
import { useMemo, useRef } from 'react';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { Drawing } from '../../viz/Drawing.tsx';

/**
 * The picture language (§2.2.4): the lines `draw_line` drew, revealed in the
 * order the painters drew them, so a combined painter is seen filling its
 * frames one after another.
 */

export interface PictureSceneProps {
  trace: Trace | null;
  title?: string;
}

/** Keyframes at most; each one adds an equal share of the lines. */
const MAX_FRAMES = 16;

export function PictureScene({ trace, title = 'Painting, line by line' }: PictureSceneProps) {
  const segments: readonly Segment[] = trace?.drawing ?? [];
  const frames = Math.min(MAX_FRAMES, segments.length);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames, { stage, resetKey: trace, msPerStep: 450 });
  const shown = useMemo(
    () => (frames === 0 ? [] : segments.slice(0, Math.ceil(((player.index + 1) * segments.length) / frames))),
    [frames, player.index, segments],
  );

  if (frames === 0) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : trace.outcome.status === 'error'
          ? `The program stopped with an error: ${trace.outcome.error.message}`
          : 'Nothing was drawn: apply a painter to a frame, for example `paint(wave)`.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No lines yet">
        <div />
      </SceneFrame>
    );
  }

  const caption = player.atEnd
    ? `All ${segments.length} lines. Each painter drew into the frame it was handed; it never knew where on the canvas that frame was.`
    : `${shown.length} of ${segments.length} lines drawn.`;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage} className="flex justify-center">
        <Drawing segments={shown} label={`${shown.length} lines drawn by the painter`} />
      </div>
    </SceneFrame>
  );
}

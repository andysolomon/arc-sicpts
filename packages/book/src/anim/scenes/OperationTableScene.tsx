import { AnimatePresence } from 'motion/react';
import { useMemo, useRef } from 'react';
import { monoWidth } from '../model/layout.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { FONT, inlineCode, Pill, Stage, type Tone } from '../svg.tsx';
import { useTrace, type Trace } from '../useTrace.ts';
import { captionOf, entriesAt, operationTable } from '../model/operationTable.ts';

/**
 * Figure 2.22 assembled by the program: operations down the side, types
 * across the top. Each installation fills its cells, and each lookup lights
 * the cell `get` found, or marks the empty place where it found nothing.
 */

export interface OperationTableSceneProps {
  source: string;
  prelude?: string | undefined;
  title?: string;
}

/** Traces the program and draws its table. */
export function OperationTableScene({ source, prelude, title }: OperationTableSceneProps) {
  const { trace } = useTrace(source, { prelude, maxRecords: 6000, budget: 200_000 });
  return <OperationTable source={source} trace={trace} {...(title !== undefined && { title })} />;
}

export interface OperationTableProps {
  source: string;
  trace: Trace | null;
  title?: string;
}

const ROW = 34;
const PAD = 14;
const CELL_PAD = 22;

export function OperationTable({ source, trace, title = 'The operation-and-type table' }: OperationTableProps) {
  const table = useMemo(() => operationTable(source, trace), [source, trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(table.keyframes.length, { stage, resetKey: trace, msPerStep: 1700 });

  // A fixed layout from every entry the program makes, so that cells appear in place.
  const layout = useMemo(() => {
    const all = entriesAt(table, table.keyframes.length - 1);
    const opWidth = Math.max(60, ...table.ops.map((op) => monoWidth(op, FONT) + CELL_PAD));
    const widths = table.columns.map((column) =>
      Math.max(70, monoWidth(column, FONT) + CELL_PAD, ...all.filter((e) => e.column === column).map((e) => monoWidth(e.item, FONT) + CELL_PAD)),
    );
    const xs: number[] = [];
    let x = PAD + opWidth + 10;
    for (const w of widths) {
      xs.push(x + w / 2);
      x += w + 8;
    }
    return { opWidth, widths, xs, width: x - 8 + PAD, height: PAD * 2 + ROW * (table.ops.length + 1) };
  }, [table]);

  const frame = table.keyframes[player.index];
  if (frame === undefined) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : trace.outcome.status === 'error' && trace.records.length === 0
          ? `The program stopped with an error: ${trace.outcome.error.message}`
          : 'Nothing to draw: the table fills when the program calls `put(op, type, item)`.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="The table is empty">
        <div />
      </SceneFrame>
    );
  }

  const entries = entriesAt(table, player.index);
  const fresh = frame.kind === 'put' ? new Set(frame.entries) : new Set();
  const rowY = (op: string) => PAD + ROW * (table.ops.indexOf(op) + 1) + ROW / 2;
  const colX = (column: string) => layout.xs[table.columns.indexOf(column)] ?? 0;
  const colW = (column: string) => (layout.widths[table.columns.indexOf(column)] ?? 70) - 6;
  const shownOps = table.ops.filter((op) => entries.some((e) => e.op === op) || (frame.kind === 'get' && frame.op === op && table.ops.includes(op)));
  const shownColumns = table.columns.filter((c) => entries.some((e) => e.column === c));
  const lookedUp = frame.kind === 'get' ? frame : null;
  // The newest entry under each key is the one `get` finds.
  const cells = new Map<string, (typeof entries)[number]>();
  for (const e of entries) cells.set(`${e.op}\u0000${e.column}`, e);

  const tone = (e: (typeof entries)[number]): Tone =>
    lookedUp !== null && lookedUp.found && lookedUp.op === e.op && lookedUp.column === e.column ? 'focus' : fresh.has(e) ? 'ok' : 'plain';
  const missing =
    lookedUp !== null && !lookedUp.found && table.ops.includes(lookedUp.op) && table.columns.includes(lookedUp.column) ? lookedUp : null;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(captionOf(table, player.index))}>
      <div ref={stage}>
        <Stage width={layout.width} height={layout.height} label={`Operation table with ${cells.size} entries`} maxHeight={420}>
          <AnimatePresence>
            {shownColumns.map((column) => (
              <Pill
                key={`col-${column}`}
                testId="table-column"
                x={colX(column)}
                y={PAD + ROW / 2}
                width={colW(column)}
                text={column}
                tone={lookedUp?.column === column ? 'focus' : 'dim'}
                dashed
              />
            ))}
            {shownOps.map((op) => (
              <Pill
                key={`op-${op}`}
                testId="table-op"
                x={PAD + layout.opWidth / 2}
                y={rowY(op)}
                width={layout.opWidth}
                text={op}
                tone={lookedUp?.op === op ? 'focus' : 'dim'}
                dashed
              />
            ))}
            {[...cells.values()].map((e) => (
              <Pill key={`cell-${e.op}-${e.column}`} testId="table-cell" x={colX(e.column)} y={rowY(e.op)} width={colW(e.column)} text={e.item} tone={tone(e)} />
            ))}
            {missing !== null && !cells.has(`${missing.op}\u0000${missing.column}`) && (
              <Pill key={`miss-${missing.op}-${missing.column}`} testId="table-miss" x={colX(missing.column)} y={rowY(missing.op)} width={colW(missing.column)} text="undefined" tone="bad" dashed />
            )}
          </AnimatePresence>
        </Stage>
      </div>
    </SceneFrame>
  );
}

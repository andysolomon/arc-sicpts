import type { MachineView, RunView, Shown } from '@sicp/lab';
import { motion } from 'motion/react';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fitsDataPaths, layoutDataPaths, OP_H, OP_W, REG_H, REG_W, type DataPathLayout } from '../model/dataPathLayout.ts';
import { EVALUATOR_BLOCKS } from '../model/evaluatorCaptions.ts';
import { clip } from '../model/layout.ts';
import { isEvaluator, landmarks, machineStates, mainRun, sectionOf, type MachineState } from '../model/machine.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import { useLabJob } from '../useLabJob.ts';

/**
 * A register machine at work, drawn from the Laboratory's record of a run:
 * its data paths with the button each instruction pushes, the controller with
 * the instruction that just ran, and the stack. A machine shaped like the
 * explicit-control evaluator gets a picture of its own: the registers as the
 * evaluator uses them, the stack, and its depth over the whole run.
 */

export interface MachineSceneProps {
  source: string;
  prelude?: string | undefined;
  title?: string;
  /** Which machine to show when the program makes several; defaults to the last one that ran. */
  machine?: number;
}

const MAX_KEYFRAMES = 600;

const toneOf = (shown: Shown | undefined): string =>
  shown === undefined || shown.kind === 'unassigned'
    ? 'text-ink-3 italic'
    : shown.kind === 'number'
      ? 'text-num'
      : shown.kind === 'string'
        ? 'text-str'
        : shown.kind === 'label'
          ? 'text-accent-ink'
          : 'text-ink';

const fillOf = (shown: Shown | undefined): string =>
  shown === undefined || shown.kind === 'unassigned'
    ? 'fill-ink-3'
    : shown.kind === 'number'
      ? 'fill-num'
      : shown.kind === 'string'
        ? 'fill-str'
        : shown.kind === 'label'
          ? 'fill-accent-ink'
          : 'fill-ink';

const display = (shown: Shown | undefined): string => (shown === undefined ? '' : shown.kind === 'unassigned' ? '—' : shown.kind === 'label' ? `→ ${shown.text}` : shown.text);

export function MachineScene({ source, prelude, title, machine }: MachineSceneProps) {
  const { result, pending } = useLabJob(
    { type: 'machines', source, maxSteps: 6000, ...(prelude !== undefined && { prelude }) },
    'machines-done',
  );
  const views = result?.machines ?? [];
  const view = machine !== undefined ? views[machine] : ([...views].reverse().find((v) => mainRun(v)?.steps.length) ?? views.at(-1));
  const run = view === undefined ? null : mainRun(view);
  const evaluator = view !== undefined && isEvaluator(view);
  const heading = title ?? (evaluator ? 'The explicit-control evaluator at work' : 'The machine at work');

  if (view === undefined || run === null) {
    const why =
      result === null
        ? pending
          ? 'Running the machine…'
          : 'Nothing to draw yet.'
        : result.outcome.status === 'error'
          ? `The program stopped before a machine ran: ${result.outcome.error.message}`
          : 'The program makes no machine. Call `make_machine` and `start` to see one run.';
    return (
      <SceneFrame title={heading} provenance="machine" caption={inlineCode(why)} empty="No machine has run">
        <div />
      </SceneFrame>
    );
  }
  return evaluator ? (
    <EvaluatorPicture key={source} view={view} run={run} title={heading} />
  ) : (
    <MachinePicture key={source} view={view} run={run} title={heading} />
  );
}

function MachinePicture({ view, run, title }: { view: MachineView; run: RunView; title: string }) {
  const states = useMemo(() => machineStates(view, run), [view, run]);
  const frames = useMemo(() => (states.length > MAX_KEYFRAMES ? landmarks(view, states) : states.map((_, i) => i)), [states, view]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames.length, { stage, resetKey: run, msPerStep: frames.length <= 40 ? 950 : Math.max(220, 32000 / frames.length) });
  const state = states[frames[player.index] ?? 0] ?? states[0];
  const layout = useMemo(() => (fitsDataPaths(view.dataPaths) ? layoutDataPaths(view.dataPaths) : null), [view]);
  if (state === undefined) return null;
  const truncated = run.truncated ? ` (The first ${run.steps.length} of ${run.instructions} instructions are shown.)` : '';
  const caption = `${state.caption}${player.atEnd ? truncated : ''}`;
  return (
    <SceneFrame title={title} provenance="machine" player={player} caption={inlineCode(caption)}>
      <div ref={stage} className="flex flex-col gap-3">
        {layout !== null && <DataPathPicture layout={layout} state={state} />}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 max-[560px]:grid-cols-1">
          <ControllerListing view={view} current={state.step === -1 ? -1 : state.at} next={state.next} tick={state} />
          <div className="flex flex-col gap-3">
            {layout === null && <RegisterTable view={view} state={state} />}
            <StackColumn state={state} />
          </div>
        </div>
        <Counters state={state} run={run} />
      </div>
    </SceneFrame>
  );
}

function Counters({ state, run }: { state: MachineState; run: RunView }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] text-ink-3 tabular-nums" data-testid="machine-counters">
      <span>
        instruction {state.step + 1} of {run.instructions}
      </span>
      <span>pushes {state.pushes}</span>
      <span>depth {state.stack.length}</span>
    </div>
  );
}

function DataPathPicture({ layout, state }: { layout: DataPathLayout; state: MachineState }) {
  const ease = useEase(0.3);
  const active = state.uses;
  // With many buttons their names collide; then only the button being pushed is named.
  const buttonCount = layout.wires.filter((wire) => wire.button !== null).length;
  const activeOps = new Set(layout.wires.filter((w) => w.to === active).map((w) => w.from));
  if (active !== null) activeOps.add(active);
  return (
    <Stage width={layout.width} height={layout.height} label="Data paths of the machine" maxHeight={340}>
      <defs>
        <marker id="dp-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-3" />
        </marker>
        <marker id="dp-arrow-on" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" className="fill-accent" />
        </marker>
      </defs>
      {layout.wires.map((wire) => {
        const on = wire.to === active || (activeOps.has(wire.to) && wire.button === null);
        return (
          <motion.path
            key={wire.id}
            d={wire.path}
            fill="none"
            initial={false}
            animate={{ opacity: on ? 1 : 0.55 }}
            transition={ease}
            className={on ? 'stroke-accent' : 'stroke-ink-3'}
            strokeWidth={on ? 2 : 1.1}
            markerEnd={`url(#${on ? 'dp-arrow-on' : 'dp-arrow'})`}
          />
        );
      })}
      {layout.constants.map((constant) => (
        <g key={constant.id} transform={`translate(${constant.x} ${constant.y})`}>
          <path d="M -7 -8 L 7 -8 L 0 4 z" className={constant.kind === 'label' ? 'fill-accent-soft stroke-accent' : 'fill-paper-2 stroke-ink-3'} strokeWidth={1} />
          <text y={-12} textAnchor="middle" fontSize={10.5} className={constant.kind === 'label' ? 'fill-accent-ink' : 'fill-num'}>
            {clip(constant.text, 14)}
          </text>
        </g>
      ))}
      {layout.operations.map((op) => {
        const on = activeOps.has(op.id);
        return (
          <g key={op.id} transform={`translate(${op.x} ${op.y})`} data-testid="operation">
            {op.test ? (
              <circle r={15} className={on ? 'fill-accent-soft stroke-accent' : 'fill-paper stroke-ink-3'} strokeWidth={on ? 2 : 1.2} />
            ) : (
              <path
                d={`M ${-OP_W / 2} ${-OP_H / 2} L ${OP_W / 2} ${-OP_H / 2} L ${OP_W / 2 - 14} ${OP_H / 2} L ${-OP_W / 2 + 14} ${OP_H / 2} z`}
                className={on ? 'fill-accent-soft stroke-accent' : 'fill-paper stroke-ink-3'}
                strokeWidth={on ? 2 : 1.2}
              />
            )}
            <text textAnchor="middle" dominantBaseline="central" fontSize={op.test ? 11 : 12} className={on ? 'fill-accent-ink font-semibold' : 'fill-ink'}>
              {clip(op.op, op.test ? 4 : 12)}
            </text>
          </g>
        );
      })}
      {layout.wires
        .filter((wire) => wire.button !== null)
        .map((wire) => {
          const button = wire.button;
          if (button === null) return null;
          const on = wire.to === active;
          return (
            <g key={`btn-${wire.id}`} transform={`translate(${button.at.x} ${button.at.y})`} data-testid="button" data-active={on}>
              <circle r={7} className={on ? 'fill-accent stroke-accent' : 'fill-paper stroke-ink-3'} strokeWidth={1.2} />
              <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" className={on ? 'stroke-paper' : 'stroke-ink-3'} strokeWidth={1.4} />
              {(on || buttonCount <= 4) && (
                <text
                  x={button.at.x > layout.width - button.name.length * 6.5 - 20 ? -10 : 10}
                  y={-8}
                  textAnchor={button.at.x > layout.width - button.name.length * 6.5 - 20 ? 'end' : 'start'}
                  fontSize={10}
                  className={on ? 'fill-accent-ink font-semibold' : 'fill-ink-3'}
                >
                  {button.name}
                </text>
              )}
            </g>
          );
        })}
      {layout.registers.map((reg) => {
        const value = state.registers.get(reg.name);
        const written = state.written.has(reg.name);
        return (
          <g key={reg.name} transform={`translate(${reg.x} ${reg.y})`} data-testid="register" data-register={reg.name}>
            <motion.rect
              x={-REG_W / 2}
              y={-REG_H / 2}
              width={REG_W}
              height={REG_H}
              rx={6}
              initial={false}
              animate={{ strokeWidth: written ? 2.2 : 1.2 }}
              transition={ease}
              className={written ? 'fill-accent-soft stroke-accent' : 'fill-paper-2 stroke-line'}
            />
            <text x={-REG_W / 2 + 6} y={-REG_H / 2 + 11} fontSize={10} className="fill-ink-3">
              {reg.name}
            </text>
            <motion.text
              key={display(value)}
              y={6}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 1 }}
              transition={ease}
              className={`${fillOf(value)} ${written ? 'font-semibold' : ''}`}
            >
              {clip(display(value), 12)}
            </motion.text>
          </g>
        );
      })}
    </Stage>
  );
}

interface ListingProps {
  view: MachineView;
  /** The instruction to highlight, or -1 for none. */
  current: number;
  /** The instruction that runs next, marked more lightly; -1 when the machine has stopped. */
  next: number;
  /** Show only these instructions, such as one labelled block. */
  only?: number[];
  /** Changes whenever the highlight should scroll into view. */
  tick: unknown;
}

/** The controller, one instruction a line, with labels and the instruction that just ran. */
function ControllerListing({ view, current: shownAt, next, only, tick }: ListingProps) {
  const box = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = box.current;
    const line = current.current;
    if (container === null || line === null) return;
    const top = line.offsetTop - container.offsetTop;
    if (top < container.scrollTop || top + line.offsetHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = Math.max(0, top - container.clientHeight / 3);
    }
  }, [tick]);
  const lines: ReactNode[] = [];
  const indices = only ?? view.code.map((_, i) => i);
  for (const i of indices) {
    const line = view.code[i];
    if (line === null || line === undefined) continue;
    for (const label of line.labels) {
      lines.push(
        <div key={`l-${i}-${label}`} className="text-str">
          "{label}",
        </div>,
      );
    }
    const isCurrent = i === shownAt;
    const isNext = i === next && !isCurrent;
    lines.push(
      <div
        key={`i-${i}`}
        ref={isCurrent || (shownAt === -1 && isNext) ? current : undefined}
        data-testid={isCurrent ? 'current-instruction' : undefined}
        className={`rounded px-1 pl-4 ${isCurrent ? 'bg-accent-soft text-accent-ink' : isNext ? 'text-ink' : 'text-ink-2'}`}
      >
        {isNext && <span className="sr-only">next: </span>}
        {line.text},
      </div>,
    );
  }
  const ends = view.endLabels[0] ?? [];
  if (only === undefined) {
    for (const label of ends) {
      lines.push(
        <div key={`end-${label}`} className={next === -1 ? 'rounded bg-accent-soft text-str' : 'text-str'}>
          "{label}"
        </div>,
      );
    }
  }
  return (
    <div ref={box} aria-label="Controller" className="relative max-h-64 overflow-auto rounded-lg border border-line bg-paper-2 p-2 font-mono text-[11.5px] leading-[1.55] whitespace-pre">
      {lines}
    </div>
  );
}

function RegisterTable({ view, state, names }: { view: MachineView; state: MachineState; names?: readonly string[] }) {
  const shown = names ?? view.registers;
  return (
    <table aria-label="Registers" className="border-collapse font-mono text-[11.5px] [&_td]:py-0.5 [&_td]:pr-3 [&_td]:align-top">
      <tbody>
        {shown.map((name) => {
          const value = state.registers.get(name);
          const written = state.written.has(name);
          return (
            <tr key={name} data-testid="register" data-register={name} className={written ? 'bg-accent-soft' : ''}>
              <td className="text-ink-3">{name}</td>
              <td className={`${toneOf(value)} max-w-[44ch] break-words whitespace-pre-wrap ${written ? 'font-semibold' : ''}`}>{display(value)}</td>
            </tr>
          );
        })}
        <tr>
          <td className="text-ink-3">flag</td>
          <td className={toneOf(state.flag ?? undefined)}>{display(state.flag ?? undefined)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function StackColumn({ state, limit = 10 }: { state: MachineState; limit?: number }) {
  const top = [...state.stack].reverse().slice(0, limit);
  return (
    <div aria-label="Stack" className="flex min-w-[150px] flex-col gap-1 font-mono text-[11px]">
      <span className="text-ink-3">stack · {state.stack.length} deep</span>
      {state.stack.length === 0 && <span className="text-ink-3 italic">empty</span>}
      {top.map((item, i) => (
        <motion.div
          key={state.stack.length - i}
          data-testid="stack-item"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex max-w-[260px] gap-2 rounded border px-1.5 py-0.5 ${i === 0 ? 'border-accent bg-accent-soft' : 'border-line bg-paper-2'}`}
        >
          {item.register !== null && <span className="text-ink-3">{item.register}</span>}
          <span className={`truncate ${toneOf(item.value)}`}>{display(item.value)}</span>
        </motion.div>
      ))}
      {state.stack.length > limit && <span className="text-ink-3">… {state.stack.length - limit} more</span>}
    </div>
  );
}

const EVALUATOR_REGISTERS = ['comp', 'val', 'continue', 'env', 'fun', 'argl', 'unev'];

function EvaluatorPicture({ view, run, title }: { view: MachineView; run: RunView; title: string }) {
  const states = useMemo(() => machineStates(view, run), [view, run]);
  const frames = useMemo(() => landmarks(view, states), [states, view]);
  const stage = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState(false);
  const player = usePlayer(frames.length, { stage, resetKey: run, msPerStep: Math.max(160, Math.min(650, 40000 / frames.length)) });
  const index = frames[player.index] ?? 0;
  const state = states[index] ?? states[0];
  if (state === undefined) return null;
  const section = state.next === -1 ? 'evaluator_done' : (sectionOf(view, state.next) ?? '');
  const block = blockOf(view, state.next);
  const what = EVALUATOR_BLOCKS[section] ?? '';
  const comp = state.registers.get('comp');
  const caption = `${state.step === -1 ? 'Before the first instruction. ' : ''}Next: \`${section}\`. ${what}${comp?.kind === 'code' && section === 'eval_dispatch' ? ` It holds \`${comp.text}\`.` : ''}`;
  return (
    <SceneFrame
      title={title}
      provenance="machine"
      player={player}
      caption={inlineCode(caption)}
      extra={
        <label className="flex items-center gap-1.5 font-mono text-[11.5px] text-ink-3">
          <input type="checkbox" checked={detail} onChange={(event) => setDetail(event.currentTarget.checked)} className="accent-accent" />
          whole controller
        </label>
      }
    >
      <div ref={stage} className="flex flex-col gap-3">
        <DepthPlot states={states} at={index} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 max-[620px]:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-3">
            <RegisterTable view={view} state={state} names={EVALUATOR_REGISTERS.filter((name) => view.registers.includes(name))} />
            <ControllerListing view={view} current={state.next} next={-2} tick={state} {...(!detail && { only: block })} />
          </div>
          <StackColumn state={state} limit={12} />
        </div>
        <Counters state={state} run={run} />
      </div>
    </SceneFrame>
  );
}

/** The instructions of the labelled block an instruction belongs to. */
function blockOf(view: MachineView, at: number): number[] {
  if (at < 0) return [];
  let start = at;
  while (start > 0 && view.code[start - 1] !== null && (view.code[start]?.labels.length ?? 0) === 0) start--;
  const indices: number[] = [];
  for (let i = start; i < view.code.length; i++) {
    const line = view.code[i];
    if (line === null || line === undefined) break;
    if (i > start && line.labels.length > 0) break;
    indices.push(i);
  }
  return indices;
}

/** Stack depth across the whole run, with the current point marked. */
function DepthPlot({ states, at }: { states: readonly MachineState[]; at: number }) {
  const W = 600;
  const H = 70;
  const max = Math.max(1, ...states.map((s) => s.stack.length));
  const n = Math.max(1, states.length - 1);
  const x = (i: number): number => 8 + (i / n) * (W - 16);
  const y = (d: number): number => H - 14 - (d / max) * (H - 26);
  const step = Math.max(1, Math.floor(states.length / 600));
  let path = '';
  for (let i = 0; i < states.length; i += step) path += `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(states[i]?.stack.length ?? 0).toFixed(1)} `;
  const current = states[at]?.stack.length ?? 0;
  return (
    <Stage width={W} height={H} label={`Stack depth over the run, at most ${max}`} maxHeight={90}>
      <text x={8} y={10} fontSize={10} className="fill-ink-3">
        stack depth over the run · max {max}
      </text>
      <path d={path} fill="none" className="stroke-num" strokeWidth={1.3} />
      <line x1={x(at)} x2={x(at)} y1={14} y2={H - 12} className="stroke-accent" strokeWidth={1.5} />
      <circle cx={x(at)} cy={y(current)} r={3.5} className="fill-accent" />
      <line x1={8} x2={W - 8} y1={H - 14} y2={H - 14} className="stroke-line" />
    </Stage>
  );
}

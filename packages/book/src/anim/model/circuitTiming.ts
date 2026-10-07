/**
 * A timing diagram read from what the circuit simulator's probes print
 * (§3.3.4). `probe(name, wire)` prints `"name time, new value = v"` once when
 * it is attached and again whenever the wire's signal changes; each such line
 * is one event. Other lines are ignored.
 */

export interface ProbeEvent {
  wire: string;
  time: number;
  value: number;
}

const PROBE_LINE = /^"?(.+?) (-?\d+(?:\.\d+)?), new value = (-?\d+(?:\.\d+)?)"?$/;

export function probeEvents(output: readonly string[]): ProbeEvent[] {
  const events: ProbeEvent[] = [];
  for (const line of output) {
    const match = PROBE_LINE.exec(line);
    if (match === null) continue;
    const [, wire = '', time = '', value = ''] = match;
    events.push({ wire, time: Number(time), value: Number(value) });
  }
  return events;
}

export interface WireRow {
  wire: string;
  /** The signal from each change on, in order; the first entry is when the probe was attached. */
  changes: { time: number; value: number; event: number }[];
}

/** One row per probed wire, in the order the probes were attached, holding the events up to and including `upto`. */
export function timingRows(events: readonly ProbeEvent[], upto = events.length - 1): WireRow[] {
  const rows = new Map<string, WireRow>();
  events.forEach((event, i) => {
    let row = rows.get(event.wire);
    if (row === undefined) {
      row = { wire: event.wire, changes: [] };
      rows.set(event.wire, row);
    }
    if (i <= upto) row.changes.push({ time: event.time, value: event.value, event: i });
  });
  return [...rows.values()];
}

/** What keyframe `index` shows, in a sentence. */
export function timingCaption(events: readonly ProbeEvent[], index: number): string {
  const event = events[index];
  if (event === undefined) return '';
  const earlier = events.slice(0, index).filter((e) => e.wire === event.wire);
  const previous = earlier[earlier.length - 1];
  let sentence: string;
  if (previous === undefined) {
    sentence = `Probing \`${event.wire}\` prints its signal at once: ${event.value} at time ${event.time}.`;
  } else if (previous.time === event.time) {
    sentence = `At time ${event.time} \`${event.wire}\` changes again, to ${event.value}: two actions due at the same moment, run in the order they were scheduled.`;
  } else {
    sentence = `At time ${event.time}, \`${event.wire}\` becomes ${event.value}.`;
  }
  if (index === events.length - 1) {
    const last = new Map<string, number>();
    for (const e of events) last.set(e.wire, e.value);
    const settled = [...last].map(([wire, value]) => `\`${wire}\` = ${value}`).join(', ');
    sentence += ` The agenda is empty: ${settled}.`;
  }
  return sentence;
}

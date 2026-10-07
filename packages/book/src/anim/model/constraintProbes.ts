/**
 * Values arriving at the connectors of a constraint network (§3.3.5), read
 * from what its probes print: `"Probe: name = value"` when a connector gets a
 * value and `"Probe: name = ?"` when it loses one. Other lines are ignored.
 */

export interface ConstraintEvent {
  connector: string;
  /** The value as printed, or `null` when the connector lost its value. */
  value: string | null;
}

const PROBE_LINE = /^"?Probe: (.+?) = (.*?)"?$/;

export function constraintEvents(output: readonly string[]): ConstraintEvent[] {
  const events: ConstraintEvent[] = [];
  for (const line of output) {
    const match = PROBE_LINE.exec(line);
    if (match === null) continue;
    const [, connector = '', value = ''] = match;
    events.push({ connector, value: value === '?' ? null : value });
  }
  return events;
}

/** The connectors of the Celsius–Fahrenheit network, and the probe names each answers to. */
export const NETWORK_CONNECTORS = ['C', 'F', 'u', 'v', 'w', 'x', 'y'] as const;
export type NetworkConnector = (typeof NETWORK_CONNECTORS)[number];

const ALIASES: Record<string, NetworkConnector> = {
  'Celsius temp': 'C',
  'Fahrenheit temp': 'F',
  celsius: 'C',
  fahrenheit: 'F',
};

/** Which connector of the network a probe's name refers to, if any. */
export function networkConnector(name: string): NetworkConnector | null {
  if ((NETWORK_CONNECTORS as readonly string[]).includes(name)) return name as NetworkConnector;
  return ALIASES[name] ?? null;
}

/** Each connector's value after the events up to and including `upto`: absent when never probed, `null` when it has none. */
export function valuesAt(events: readonly ConstraintEvent[], upto: number): Map<string, string | null> {
  const values = new Map<string, string | null>();
  events.forEach((event, i) => {
    if (i <= upto) values.set(event.connector, event.value);
  });
  return values;
}

/** What keyframe `index` shows, in a sentence. */
export function constraintCaption(events: readonly ConstraintEvent[], index: number): string {
  const event = events[index];
  if (event === undefined) return '';
  let sentence =
    event.value === null
      ? `\`${event.connector}\` loses its value.`
      : `\`${event.connector}\` gets the value ${event.value}.`;
  if (index === events.length - 1) {
    const known = [...valuesAt(events, index)].filter(([, value]) => value !== null);
    sentence +=
      known.length === 0
        ? ' Nothing is known any more.'
        : ` Now known: ${known.map(([name, value]) => `\`${name}\` = ${value}`).join(', ')}.`;
  }
  return sentence;
}

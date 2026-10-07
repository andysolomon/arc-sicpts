import type { MachineHooks } from '../evaluator/machine.ts';
import { stringify } from '../evaluator/values.ts';

/**
 * A log of the calls a program makes to a few named functions, with their
 * arguments and results in text form. The evaluators of Chapter 4 are Source
 * programs, so watching `evaluate` and `apply`, or `force_it`, or a query
 * system's `pattern_match`, shows what the evaluator is doing in its own terms.
 */

export interface WatchedCall {
  /** 0-based position in the log. */
  n: number;
  name: string;
  args: string[];
  /** Depth of the stack of pending calls, this one included. */
  depth: number;
  /** The value the call returned; absent while pending, or when a tail call replaced it. */
  value?: string;
  /** Number of the watched call that was pending below this one, if any. */
  parent: number | null;
}

export interface CallLogOptions {
  /** Most records kept; later calls are counted but not recorded. */
  maxCalls?: number;
  /** Longest text of one argument or result. */
  maxText?: number;
}

export interface CallLogTracer {
  hooks: MachineHooks;
  calls: WatchedCall[];
  /** True when calls were left out because the log was full. */
  truncated(): boolean;
}

export function createCallLogTracer(names: readonly string[], options: CallLogOptions = {}): CallLogTracer {
  const watched = new Set(names);
  const maxCalls = options.maxCalls ?? 2000;
  const maxText = options.maxText ?? 160;
  const calls: WatchedCall[] = [];
  // The watched calls still pending, innermost last.
  const open: WatchedCall[] = [];
  let truncated = false;

  return {
    calls,
    truncated: () => truncated,
    hooks: {
      onCall(info) {
        if (!watched.has(info.name)) return;
        if (calls.length >= maxCalls) {
          truncated = true;
          return;
        }
        // A tail call replaces its caller, so anything pending at this depth is gone.
        while (open.length > 0 && (open[open.length - 1]?.depth ?? 0) >= info.depth) open.pop();
        const call: WatchedCall = {
          n: calls.length,
          name: info.name,
          args: info.args.map((arg) => stringify(arg, maxText)),
          depth: info.depth,
          parent: open[open.length - 1]?.n ?? null,
        };
        calls.push(call);
        open.push(call);
      },
      onReturn(info) {
        const top = open[open.length - 1];
        if (top !== undefined && top.depth === info.depth) {
          top.value = stringify(info.value, maxText);
          open.pop();
        }
      },
    },
  };
}

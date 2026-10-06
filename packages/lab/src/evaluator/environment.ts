import type { Value } from './values.ts';

/**
 * Environment -> Frame -> Binding, as plain records.
 * An environment is a frame plus a pointer to the enclosing environment.
 */

export interface Binding {
  value: Value;
  /** False between the start of a block and the evaluation of the declaration. */
  assigned: boolean;
  mutable: boolean;
}

export interface Frame {
  /** `E0`, `E1`, ... for program frames; `global` and `prelude` for the outer ones. */
  id: string;
  /** What created the frame: `program`, `block`, or a call such as `square(3)`. */
  label: string;
  bindings: Map<string, Binding>;
}

export interface Environment {
  frame: Frame;
  parent: Environment | null;
}

export type LookupResult =
  | { status: 'found'; binding: Binding; env: Environment }
  | { status: 'unbound' };

export function extend(parent: Environment | null, id: string, label: string): Environment {
  return { frame: { id, label, bindings: new Map() }, parent };
}

export function lookup(env: Environment, symbol: string): LookupResult {
  for (let e: Environment | null = env; e !== null; e = e.parent) {
    const binding = e.frame.bindings.get(symbol);
    if (binding !== undefined) return { status: 'found', binding, env: e };
  }
  return { status: 'unbound' };
}

/** Reserve a name in a frame before its declaration has been evaluated. */
export function declare(env: Environment, symbol: string, mutable: boolean): boolean {
  if (env.frame.bindings.has(symbol)) return false;
  env.frame.bindings.set(symbol, { value: undefined, assigned: false, mutable });
  return true;
}

/** Give a name its value in this frame, creating the binding if needed. */
export function define(env: Environment, symbol: string, value: Value, mutable = false): void {
  const binding = env.frame.bindings.get(symbol);
  if (binding === undefined) {
    env.frame.bindings.set(symbol, { value, assigned: true, mutable });
    return;
  }
  binding.value = value;
  binding.assigned = true;
}

export type AssignResult = 'ok' | 'unbound' | 'unassigned' | 'constant';

/** Change the value of an existing variable, searching outward. */
export function assign(env: Environment, symbol: string, value: Value): AssignResult {
  const found = lookup(env, symbol);
  if (found.status === 'unbound') return 'unbound';
  if (!found.binding.assigned) return 'unassigned';
  if (!found.binding.mutable) return 'constant';
  found.binding.value = value;
  return 'ok';
}

/** Frame ids from the innermost frame outward, e.g. `['E1', 'E0', 'global']`. */
export function chain(env: Environment): string[] {
  const ids: string[] = [];
  for (let e: Environment | null = env; e !== null; e = e.parent) ids.push(e.frame.id);
  return ids;
}

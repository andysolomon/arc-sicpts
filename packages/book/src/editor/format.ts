/** 100000 -> "100 000", with non-breaking thin spaces. */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

export function formatMs(ms: number): string {
  return ms < 1 ? '< 1 ms' : `${formatCount(Math.round(ms))} ms`;
}

export const pluralSteps = (n: number): string => `${formatCount(n)} ${n === 1 ? 'step' : 'steps'}`;

import { describe, expect, it } from 'vitest';
import { seriesOf } from '../src/anim/model/series.ts';

describe('series of printed numbers', () => {
  it('starts a series at each printed string and collects the numbers after it', () => {
    expect(seriesOf(['"pi"', '3', '3.1', 'list(1, 2)', '"accelerated"', '3.14'])).toEqual([
      { label: 'pi', values: [3, 3.1] },
      { label: 'accelerated', values: [3.14] },
    ]);
  });

  it('collects numbers printed before any label into an unlabelled series, and drops empty ones', () => {
    expect(seriesOf(['1', '2', '"empty"', '"x"', '5'])).toEqual([
      { label: '', values: [1, 2] },
      { label: 'x', values: [5] },
    ]);
  });
});

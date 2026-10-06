import { factorialProgram } from '@sicp/lab';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Animation } from '../src/anim/Animation.tsx';
import { EnvironmentScene } from '../src/anim/scenes/EnvironmentScene.tsx';
import { NewtonScene } from '../src/anim/scenes/NewtonScene.tsx';
import { OrderScene } from '../src/anim/scenes/OrderScene.tsx';
import { SubstitutionScene } from '../src/anim/scenes/SubstitutionScene.tsx';
import { TreeScene } from '../src/anim/scenes/TreeScene.tsx';
import { traceOf } from './traceHelper.ts';

describe('scenes', () => {
  it('shows the first rewrite with its transport and lights the redex', () => {
    render(<SubstitutionScene source="137 + 349;" />);
    const scene = screen.getByRole('region', { name: 'Substitution model' });
    expect(within(scene).getByText('the substitution model, step by step')).toBeInTheDocument();
    expect(screen.getByTestId('term')).toHaveTextContent('137 + 349');
    expect(screen.getByTestId('term').querySelectorAll('[data-hot]')).toHaveLength(3);
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 2');
    expect(screen.getByTestId('caption')).toHaveTextContent('Evaluate 137 + 349.');
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
  });

  it('offers an order toggle when asked', () => {
    render(<SubstitutionScene source="1;" orderToggle />);
    expect(screen.getByRole('group', { name: 'Evaluation order' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'applicative order' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('follows the stepper when given a record index', () => {
    const source = '(2 + 4 * 6) * (3 + 12);\n';
    const trace = traceOf(source);
    const { rerender } = render(<TreeScene source={source} trace={trace} stepIndex={0} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('Press step above');
    expect(screen.queryByRole('slider')).toBeNull();
    rerender(<TreeScene source={source} trace={trace} stepIndex={trace.records.length} />);
    expect(screen.getAllByTestId('value').map((v) => v.textContent).sort()).toEqual(['15', '24', '26', '390']);
    expect(screen.getByTestId('caption')).toHaveTextContent('the value reaches the root');
  });

  it('draws one box per frame with its bindings', () => {
    const source = 'function square(x) { return x * x; }\nsquare(3);\n';
    const trace = traceOf(source);
    render(<EnvironmentScene source={source} trace={trace} stepIndex={trace.records.length} />);
    const frames = screen.getAllByTestId('frame');
    expect(frames.map((f) => f.dataset['frame'])).toEqual(['E0', 'E1']);
    expect(frames[1]).toHaveTextContent('x: 3');
    expect(frames[1]?.dataset['status']).toBe('returned');
  });

  it('compares the two orders side by side', () => {
    render(<OrderScene source={'function p() { return p(); }\nfunction test(x, y) { return x === 0 ? 0 : y; }\ntest(0, p());'} limit={5} />);
    expect(screen.getByTestId('term-applicative')).toHaveTextContent('test(0, p())');
    expect(screen.getByTestId('term-normal')).toHaveTextContent('test(0, p())');
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 6');
  });

  it('plots the printed guesses', () => {
    const source = `function sqrt_iter(guess, x) {\n  display(guess);\n  return math_abs(guess * guess - x) < 0.001 ? guess : sqrt_iter((guess + x / guess) / 2, x);\n}\nsqrt_iter(1, 2);\n`;
    render(<NewtonScene source={source} trace={traceOf(source)} />);
    expect(screen.getByRole('img', { name: /square root of 2/ })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Guesses' }).children).toHaveLength(4);
    expect(screen.getByTestId('caption')).toHaveTextContent('Guess 1: 1.');
  });

  it('dispatches each kind to a scene', () => {
    render(<Animation kind="process" source={factorialProgram} />);
    expect(screen.getByRole('region', { name: 'What the process leaves pending' })).toBeInTheDocument();
    render(<Animation kind="order" source="1;" />);
    expect(screen.getByRole('region', { name: 'Two evaluation orders' })).toBeInTheDocument();
  });
});

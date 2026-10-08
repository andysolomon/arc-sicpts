import { dampedProgram, factorialProgram, fibProgram, halfIntervalProgram, integralProgram, newtonProgram, oscillatingProgram } from '@sicp/lab';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Animation } from '../src/anim/Animation.tsx';
import { CallsScene } from '../src/anim/scenes/CallsScene.tsx';
import { CobwebScene } from '../src/anim/scenes/CobwebScene.tsx';
import { EnvironmentScene } from '../src/anim/scenes/EnvironmentScene.tsx';
import { HalfIntervalScene } from '../src/anim/scenes/HalfIntervalScene.tsx';
import { IntegralScene } from '../src/anim/scenes/IntegralScene.tsx';
import { NewtonScene } from '../src/anim/scenes/NewtonScene.tsx';
import { NewtonsMethodScene } from '../src/anim/scenes/NewtonsMethodScene.tsx';
import { OrderScene } from '../src/anim/scenes/OrderScene.tsx';
import { SubstitutionScene } from '../src/anim/scenes/SubstitutionScene.tsx';
import { TreeScene } from '../src/anim/scenes/TreeScene.tsx';
import { traceOf } from './traceHelper.ts';

// Registry tests verify routing to a scene; worker execution is covered separately.
vi.mock('../src/lab/client.ts', () => ({
  labClient: () => ({ submit: () => ({ id: 1, cancel() {}, finished: new Promise(() => {}) }) }),
}));

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

  it('dispatches each kind to a scene', async () => {
    render(<Animation kind="process" source={factorialProgram} />);
    expect(await screen.findByRole('region', { name: 'What the process leaves pending' })).toBeInTheDocument();
    render(<Animation kind="order" source="1;" />);
    expect(await screen.findByRole('region', { name: 'Two evaluation orders' })).toBeInTheDocument();
  });

  it('marks repeated calls in a tree recursion and sums them up at the end', () => {
    render(<CallsScene source={fibProgram} trace={traceOf(fibProgram)} repeats />);
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 32');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '31' } });
    expect(screen.getAllByTestId('repeated-call')).toHaveLength(9);
    expect(screen.getByTestId('caption')).toHaveTextContent('15 calls in all, and 9 of them (in red) repeat a call');
  });

  it('draws one rectangle per value of the integrand', () => {
    render(<IntegralScene source={integralProgram} trace={traceOf(integralProgram, 4000)} />);
    expect(screen.getByRole('img', { name: 'Midpoint rule for cube with 20 rectangles' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });
    expect(screen.getAllByTestId('strip')).toHaveLength(20);
    expect(screen.getByTestId('caption')).toHaveTextContent('0.249688, the value the program returned');
  });

  it('halves the interval call by call', () => {
    render(<HalfIntervalScene source={halfIntervalProgram} trace={traceOf(halfIntervalProgram, 4000)} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('math_sin is negative at 4 and positive at 2');
    expect(screen.getByTestId('interval')).toHaveTextContent('call 1 of 12 · interval width 2');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '12' } });
    expect(screen.getByTestId('caption')).toHaveTextContent('returns their midpoint, 3.14111');
  });

  it('draws a fixed-point search as a cobweb, converging or not', () => {
    const { unmount } = render(<CobwebScene source={dampedProgram} trace={traceOf(dampedProgram, 4000)} />);
    expect(screen.getByRole('list', { name: 'Guesses' }).children).toHaveLength(4);
    expect(screen.getByTestId('caption')).toHaveTextContent('gives 1.5. Across to the line y = x');
    unmount();
    render(<CobwebScene source={oscillatingProgram} trace={traceOf(oscillatingProgram, 4000)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '24' } });
    expect(screen.getByTestId('caption')).toHaveTextContent('The guesses never settle');
  });

  it("draws Newton's method for the function the program hands it", () => {
    render(<NewtonsMethodScene source={newtonProgram} trace={traceOf(newtonProgram, 4000)} />);
    expect(screen.getByRole('img', { name: "Newton's method on y => square(y) - 2" })).toBeInTheDocument();
    expect(screen.getByTestId('caption')).toHaveTextContent('meets the axis at 1.5');
  });

  it('explains what is missing when the method call is not there', () => {
    render(<CobwebScene source="1;" trace={traceOf('1;')} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('Call fixed_point(f, first_guess) at the top level');
  });
});

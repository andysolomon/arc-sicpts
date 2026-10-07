import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Arrow, Pill, Stage, useEase, type Tone } from '../../anim/svg.tsx';
import { Figure } from '../Figure.tsx';

/**
 * Figure 3.29: Peter and Paul withdraw from one account at the same time.
 * Each reads the balance, computes a new one, and writes it back; Paul's
 * write replaces Peter's, and Peter's $10 is never recorded.
 */

interface Step {
  who: 'Peter' | 'Paul';
  text: string;
  /** The bank's balance after this step, when the step writes it. */
  bank?: string;
  /** The step reads the balance from the bank. */
  reads?: boolean;
  tone?: Tone;
}

const STEPS: Step[] = [
  { who: 'Peter', text: 'read balance: $100', reads: true },
  { who: 'Paul', text: 'read balance: $100', reads: true },
  { who: 'Peter', text: 'new value: 100 − 10 = 90' },
  { who: 'Paul', text: 'new value: 100 − 25 = 75' },
  { who: 'Peter', text: 'set balance to $90', bank: '$90', tone: 'focus' },
  { who: 'Paul', text: 'set balance to $75', bank: '$75', tone: 'bad' },
];

const W = 600;
const TOP = 52;
const ROW = 38;
const H = TOP + STEPS.length * ROW + 16;
const X = { Peter: 110, Bank: 300, Paul: 490 } as const;
const PILL = 190;

export function TimingDiagram({ caption }: { caption?: ReactNode }) {
  const ease = useEase(0.4);
  return (
    <Figure title="Two withdrawals, interleaved" provenance="figure 3.29" caption={caption}>
      <Stage width={W} height={H} label="Timing diagram: Peter and Paul both read $100, Peter sets $90, then Paul sets $75 and Peter's withdrawal is lost">
        {(['Peter', 'Bank', 'Paul'] as const).map((who) => (
          <g key={who}>
            <text x={X[who]} y={18} textAnchor="middle" fontSize={13} className={who === 'Bank' ? 'fill-num font-semibold' : 'fill-ink font-semibold'}>
              {who}
            </text>
            <line x1={X[who]} y1={TOP - 18} x2={X[who]} y2={H - 6} className="stroke-line" strokeWidth={1} strokeDasharray={who === 'Bank' ? undefined : '2 4'} />
          </g>
        ))}
        <Pill x={X.Bank} y={TOP - 18} width={70} height={22} text="$100" tone="value" enter={false} />
        <g>
          <line x1={20} y1={TOP} x2={20} y2={H - 12} className="stroke-ink-3" strokeWidth={1.2} />
          <path d={`M 15 ${H - 20} L 20 ${H - 10} L 25 ${H - 20}`} fill="none" className="stroke-ink-3" strokeWidth={1.2} />
          <text x={30} y={H - 12} fontSize={10} className="fill-ink-3">
            time
          </text>
        </g>
        {STEPS.map((step, i) => {
          const y = TOP + i * ROW + ROW / 2;
          const x = X[step.who];
          const towards = x < X.Bank ? 1 : -1;
          return (
            <motion.g
              key={i}
              data-testid="timing-step"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ ...ease, delay: 0.2 + i * 0.35 }}
            >
              {step.reads === true && <Arrow id={`read-${i}`} from={[X.Bank - towards * 36, y - 14]} to={[x + (towards * PILL) / 2, y]} />}
              {step.bank !== undefined && (
                <>
                  <Arrow id={`write-${i}`} from={[x + (towards * PILL) / 2, y]} to={[X.Bank - towards * 36, y]} tone={step.tone === 'bad' ? 'line' : 'accent'} />
                  <Pill x={X.Bank} y={y} width={70} height={22} text={step.bank} tone={step.tone === 'bad' ? 'bad' : 'value'} enter={false} />
                </>
              )}
              <Pill x={x} y={y} width={PILL} height={24} fontSize={12} text={step.text} tone={step.tone ?? 'plain'} enter={false} />
            </motion.g>
          );
        })}
      </Stage>
    </Figure>
  );
}

'use client';
import { Avatar, Collapse, Count, Field, Row, Stage, Text, Window, type Act } from '@/kit';
import './planner-demo.css';

/*
  Hero illustration for the home page, built with the stageshow kit (adapted
  from its ai-chat gold example). A date-night request is typed and sent, the
  planner thinks for a beat, then a bill built from real menu prices lands and
  its total rolls up. Plays once when scrolled into view; the still is the
  payoff. Real strings: the request, one place, three bill lines, the total.
*/

const Q = 'Date for 2 in Woodlands, K400, outdoor';
const LINES: [string, number][] = [['2 × Grilled tilapia', 19000], ['2 × Draught beer', 6000], ['2 × Cheesecake', 7000]];
const TOTAL = LINES.reduce((a, [, n]) => a + n, 0);

type S = { draft: string; sent: boolean; phase: 'idle' | 'thinking' | 'answer'; lines: number; total: number };
const initial: S = { draft: '', sent: false, phase: 'idle', lines: 0, total: 0 };
const poster: S = { draft: '', sent: true, phase: 'answer', lines: LINES.length, total: TOTAL };

async function script(a: Act<S>) {
  await a.wait(600);
  a.mark('type');
  await a.type('draft', Q, { interval: 36 });
  await a.wait(350);
  a.mark('send');
  a.put({ sent: true, draft: '' });
  await a.wait(450);
  a.put({ phase: 'thinking' });
  await a.wait(1000);
  a.mark('answer');
  a.put({ phase: 'answer' });
  for (let i = 1; i <= LINES.length; i++) { await a.wait(260); a.put({ lines: i }); }
  await a.wait(240);
  a.mark('total');
  a.put({ total: TOTAL });
  await a.wait(3200);
  // Reset to the opening state so the loop restarts cleanly (the answer collapses away)
  a.put({ sent: false, phase: 'idle', lines: 0, total: 0 });
  await a.wait(700);
}

const k = (n: number) => `K${Math.round(n / 100)}`;

export function PlannerDemo() {
  return (
    <Stage
      width={540}
      height={400}
      compact={{ below: 480, width: 358, height: 400 }}
      initial={initial}
      poster={poster}
      script={script}
      play="loop"
      className="pd"
      tokens={{ '--ss-accent': '#0e6b4f', '--ss-radius-window': '14px' }}
    >
      {(s) => (
        <Window title="Plan my outing" className="pd-win">
          <div className="pd-body">
            <div className="pd-thread">
              <Collapse open={s.sent} reveal="drop" from="below">
                <div className="pd-q"><Text>{Q}</Text></div>
              </Collapse>
              <Collapse open={s.phase === 'thinking'}><Text className="pd-thinking">Checking menus</Text></Collapse>
              <Collapse open={s.phase === 'answer'}>
                <div className="pd-a">
                  <Row pad={0} lead={<Avatar name="Garden Grill" />} title={<Text>Garden Grill</Text>} subtitle={<Text>Woodlands · outdoor · ★ 4.6</Text>} />
                  <ul className="pd-bill">
                    {LINES.map(([name, n], i) => (
                      <li key={name} className="pd-line" data-on={s.lines > i || undefined}><Text>{name}</Text><Text className="pd-amt">{k(n)}</Text></li>
                    ))}
                  </ul>
                  <div className="pd-total">
                    <Text>Estimated total</Text>
                    <span className="pd-sum"><Count value={s.total / 100} format={(n) => `K${Math.round(n)}`} /></span>
                  </div>
                  <Text className="pd-under" >K80 under budget</Text>
                </div>
              </Collapse>
            </div>
            <Field className="pd-composer" value={s.draft} placeholder="Budget, group size, area, vibe" focused={!s.sent} />
          </div>
        </Window>
      )}
    </Stage>
  );
}

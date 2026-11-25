import React, { useLayoutEffect, useRef, useState } from 'react';
import { SRC, reducedMotion } from './lib';

const STATUS_CLASS = { ok: 'ok', broken: 'broken', 'n/a': 'na', 'not-reached': 'pending' };
const pct = (i) => 10 + i * 20; // station centres: 10%, 30% … 90%

function sourceLabel(s) {
  if (s.status === 'ok') return s.evidence && s.evidence[0] ? SRC[s.evidence[0].source] || '' : '';
  if (s.status === 'broken') return 'Missing';
  if (s.status === 'n/a') return 'n/a';
  return '';
}

/**
 * One trace rail. A marker walks the stations and stops at the first broken link.
 * `play` changes whenever a new rehearsal result arrives; `delay` staggers rows.
 */
export function Track({ trace, play, delay = 0 }) {
  const trackRef = useRef(null);
  const walkerRef = useRef(null);
  const doneRef = useRef(null);
  const [reached, setReached] = useState(-1);
  const [revealed, setRevealed] = useState(false);

  const brokenIndex = trace.steps.findIndex((s) => s.status === 'broken');
  const last = brokenIndex >= 0 ? brokenIndex : trace.steps.length - 1;

  useLayoutEffect(() => {
    const reduce = reducedMotion();
    const per = 140;
    const timers = [];
    const done = doneRef.current;
    done.style.width = `${pct(last) - 10}%`;
    if (reduce) {
      done.style.transform = 'scaleX(1)';
      setReached(trace.steps.length);
      setRevealed(true);
      return undefined;
    }
    setReached(-1);
    setRevealed(false);
    for (let i = 0; i <= last; i++) timers.push(setTimeout(() => setReached(i), delay + i * per));
    timers.push(setTimeout(() => setReached(trace.steps.length), delay + last * per + per));
    timers.push(setTimeout(() => setRevealed(true), delay + last * per + 120));

    const w = trackRef.current.getBoundingClientRect().width;
    const px = (p) => `translateX(${(p / 100) * w}px)`;
    const anims = [
      walkerRef.current.animate(
        [{ transform: px(10), opacity: 1 }, { transform: px(pct(last)), opacity: 1 }, { transform: px(pct(last)), opacity: 0 }],
        { duration: last * per + 260, delay, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }
      ),
      done.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: Math.max(1, last * per),
        delay,
        easing: 'cubic-bezier(.4,0,.2,1)',
        fill: 'forwards',
      }),
    ];
    return () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
    };
  }, [play, last, delay, trace.steps.length]);

  const broken = brokenIndex >= 0 ? trace.steps[brokenIndex] : null;
  return (
    <>
      <div className="track" ref={trackRef}>
        <div className="line" />
        <div className="done" ref={doneRef} />
        <div className="walker" ref={walkerRef} />
        {trace.steps.map((s, i) => {
          const on = i <= reached || (s.status === 'not-reached' && reached >= trace.steps.length);
          return (
            <div key={s.step} className={`st ${STATUS_CLASS[s.status]}${on ? ' on' : ''}`} title={`${s.label}${s.gap ? `: ${s.gap}` : ''}`}>
              <span className="dot" />
              <span className="src">{sourceLabel(s)}</span>
            </div>
          );
        })}
      </div>
      {broken ? <div className={`gap${revealed ? ' shown' : ''}`}>{broken.gap}</div> : null}
    </>
  );
}

export function Rail({ trace, play, delay, onOpen }) {
  return (
    <div className="rail">
      <div className="req">
        <button type="button" className="key link mono" onClick={() => onOpen(trace.key)}>
          {trace.key}
        </button>
        <div className="sum">{trace.summary}</div>
      </div>
      <Track trace={trace} play={play} delay={delay} />
    </div>
  );
}

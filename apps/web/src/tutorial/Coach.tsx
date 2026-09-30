import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { sfx } from '../game/sfx';
import { advance, helpOpen, shown, skipTutorial } from './coach';
import { grow, placeCard, union, type Box } from './place';

interface Layout {
  stage: { w: number; h: number };
  hole: Box | null;
  card: { w: number; h: number };
  inset: { top: number; bottom: number };
}

const EMPTY: Layout = { stage: { w: 0, h: 0 }, hole: null, card: { w: 0, h: 0 }, inset: { top: 0, bottom: 0 } };
/** How long to wait for a lesson's target to appear before giving up and showing the card without it. */
const WAIT_MS = 1400;

const same = (a: Box | null, b: Box | null): boolean => (a === null && b === null) || (a !== null && b !== null && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5);

/**
 * The coaching layer, drawn over the game inside the stage. A modal lesson dims everything but the part it
 * is about and waits for Next. A nudge only outlines that part and lets the game carry on under it.
 */
export function Coach(): JSX.Element | null {
  const s = shown.value;
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>(EMPTY);
  const id = s?.lesson.id;

  useEffect(() => {
    if (!id) return;
    const target = s!.lesson.target;
    const started = performance.now();
    let frame = 0;
    let scrolled = false;
    const tick = (): void => {
      const el = root.current;
      const stage = el?.parentElement;
      if (el && stage) {
        const sr = stage.getBoundingClientRect();
        const found = target ? [...stage.querySelectorAll(target)].filter((n) => !el.contains(n) && n.getClientRects().length > 0) : [];
        if (found.length > 0 && !scrolled) {
          scrolled = true;
          found[0]!.scrollIntoView({ block: 'nearest' });
        }
        const stageSize = { w: sr.width, h: sr.height };
        const waiting = target && found.length === 0 && performance.now() - started < WAIT_MS;
        const lit = union(
          found.map((n) => {
            const r = n.getBoundingClientRect();
            return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
          }),
        );
        const hole = lit ? grow(lit, 6, stageSize) : null;
        const cs = getComputedStyle(el);
        const inset = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
        const c = card.current;
        const size = { w: c?.offsetWidth ?? 0, h: c?.offsetHeight ?? 0 };
        setLayout((prev) => {
          const next: Layout = { stage: stageSize, hole: waiting ? prev.hole : hole, card: size, inset };
          const unchanged = prev.stage.w === next.stage.w && prev.stage.h === next.stage.h && same(prev.hole, next.hole) && prev.card.w === next.card.w && prev.card.h === next.card.h && prev.inset.top === next.inset.top && prev.inset.bottom === next.inset.bottom;
          return unchanged ? prev : next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
    // The lesson is identified by its id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (s?.lesson.mode === 'modal') card.current?.querySelector<HTMLElement>('.coach-next')?.focus({ preventScroll: true });
  }, [id]);

  if (!s) return <div class="coach" ref={root} aria-hidden="true" />;
  const { lesson } = s;
  const modal = lesson.mode === 'modal';
  const last = s.step >= s.of;
  const laid = layout.stage.w > 0 && layout.card.h > 0;
  const place = laid ? placeCard(layout.hole, layout.stage, layout.card, layout.inset) : { x: 0, y: 0, side: 'middle' as const };
  const width = Math.min(340, Math.max(220, layout.stage.w - 24));

  return (
    <div class={`coach ${modal ? 'is-modal' : 'is-nudge'}`} ref={root}>
      {modal && <div class={`coach-veil${layout.hole ? ' has-hole' : ''}`} />}
      {layout.hole && <div class="coach-hole" style={{ left: `${layout.hole.x}px`, top: `${layout.hole.y}px`, width: `${layout.hole.w}px`, height: `${layout.hole.h}px` }} />}
      {modal && (
        <div
          key={lesson.id}
          ref={card}
          class={`coach-card panel place-${place.side}`}
          role="dialog"
          aria-label={lesson.title}
          style={{ left: `${place.x}px`, top: `${place.y}px`, width: `${width}px`, visibility: laid ? 'visible' : 'hidden' }}
        >
          <div class="row coach-head">
            <span class="label coach-step">{s.of > 1 ? `${s.step} of ${s.of}` : 'Tip'}</span>
            <span class="grow" />
            <button class="coach-skip" onClick={skipTutorial}>
              Skip tutorial
            </button>
          </div>
          <h2 class="display coach-title">{lesson.title}</h2>
          <p class="coach-body">{lesson.body}</p>
          <div class="row coach-actions">
            {lesson.more && (
              <button class="btn btn-small btn-ghost" onClick={() => (helpOpen.value = lesson.more!)}>
                Full rules
              </button>
            )}
            <span class="grow" />
            <button
              class="btn btn-small btn-gold coach-next"
              onClick={() => {
                sfx.tap();
                advance();
              }}
            >
              {last ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The words of a nudge, in a strip inside the screen's own layout, so nothing the player needs to tap is ever covered. */
export function NudgeStrip(): JSX.Element | null {
  const s = shown.value;
  if (!s || s.lesson.mode !== 'nudge') return null;
  return (
    <div class="coach-nudge" role="status">
      <p>
        <b>{s.lesson.title}.</b> {s.lesson.body}
      </p>
      <button
        class="btn btn-small btn-gold"
        onClick={() => {
          sfx.tap();
          advance();
        }}
      >
        Got it
      </button>
    </div>
  );
}

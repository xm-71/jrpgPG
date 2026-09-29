import { useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { DialogueLine, Mood } from '@duskline/core';
import { heroById } from '@duskline/content';
import { sfx } from '../game/sfx';
import { heroUrl } from './Art';
import { FocusLines, burstPath, wobblePath } from './Manga';
import { Sky, type SkyVariant } from './Sky';

/**
 * A story scene, laid out as a manga page: an establishing panel with the sky, and a close-up
 * panel of whoever is speaking, drawn with the feeling of the line. Speech sits in balloons:
 * round for talk, a jagged burst for a shout, a wobbling edge for pain. Narration goes in
 * boxed captions, the way manga narrates.
 */

type BalloonKind = 'round' | 'burst' | 'wobble';

function balloonKind(line: DialogueLine): BalloonKind {
  if (line.mood === 'fierce' || line.mood === 'shock' || /!$/.test(line.text)) return 'burst';
  if (line.mood === 'hurt') return 'wobble';
  return 'round';
}

/** `speaker` is the side of the page the speaker is on; the balloon sits opposite and points back. */
function Balloon({ line, speaker, seed }: { line: DialogueLine; speaker: 'left' | 'right'; seed: string }): JSX.Element {
  const kind = balloonKind(line);
  const shape = kind === 'burst' ? burstPath(seed, 20, line.mood === 'shock' ? 0.16 : 0.22) : kind === 'wobble' ? wobblePath(seed) : '';
  return (
    <div class={`mp-balloon ${kind} speaker-${speaker}`}>
      {shape && (
        <svg class="mp-balloon-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={shape} vector-effect="non-scaling-stroke" />
        </svg>
      )}
      {kind !== 'burst' && (
        <svg class="mp-tail" viewBox="0 0 30 34" aria-hidden="true">
          <path d="M2 0 Q10 14 26 32 Q16 12 18 0" />
        </svg>
      )}
      <p>{line.text}</p>
    </div>
  );
}

const PANEL_TONE: Record<Mood, string> = { calm: 'tone-soft', fierce: 'tone-focus', hurt: 'tone-hatch', smile: 'tone-sparkle', shock: 'tone-focus' };

export function Dialogue({ lines, title, onDone, sky = 'dusk' }: { lines: readonly DialogueLine[]; title?: string; onDone: () => void; sky?: SkyVariant }): JSX.Element {
  const [i, setI] = useState(0);
  const line = lines[i];
  const last = i >= lines.length - 1;
  // Speakers take turns on the right and the left of the page, in the order they first speak.
  const sides = useMemo(() => {
    const order: string[] = [];
    for (const l of lines) if (l.who !== 'narrator' && !order.includes(l.who)) order.push(l.who);
    return new Map(order.map((w, n) => [w, n % 2 === 0 ? 'right' : 'left'] as const));
  }, [lines]);
  const next = (): void => {
    sfx.tap();
    if (last) onDone();
    else setI(i + 1);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });
  if (!line) return <div class="screen" />;
  const hero = heroById(line.who);
  const narrator = line.who === 'narrator';
  const mood: Mood = line.mood ?? 'calm';
  const side = sides.get(line.who) ?? 'right';

  return (
    <div class={`screen dialogue manga-page${narrator ? ' is-narration' : ''}`} onClick={next} role="button" tabIndex={0} aria-label="Continue">
      <header class="mp-head">
        <span class="label mp-title">{title}</span>
        <button
          class="btn btn-small mp-skip"
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
        >
          Skip
        </button>
      </header>
      <section class="mp-panel mp-scene">
        <Sky variant={sky} />
        {narrator && (
          <p key={i} class="mp-caption">
            {line.text}
          </p>
        )}
      </section>
      {!narrator && (
        <section key={`${line.who}:${mood}`} class={`mp-panel mp-speaker ${PANEL_TONE[mood]} at-${side}`}>
          {(mood === 'fierce' || mood === 'shock') && <FocusLines seed={`${line.who}${i}`} cx={side === 'right' ? 70 : 30} cy={40} inner={24} />}
          {hero ? <img class="mp-bust" src={heroUrl(hero, 'bust', mood)} alt="" draggable={false} /> : null}
          <span class="mp-name">{hero?.name ?? line.who}</span>
        </section>
      )}
      {!narrator && <Balloon key={i} line={line} speaker={side} seed={`${line.who}:${i}`} />}
      <span class="mp-more label">
        {i + 1} / {lines.length} · {last ? 'tap to go on' : 'tap'}
      </span>
    </div>
  );
}

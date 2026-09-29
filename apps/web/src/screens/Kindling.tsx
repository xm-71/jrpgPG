import { signal } from '@preact/signals';
import { useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { activeBanners } from '@duskline/content';
import { catalog } from '@duskline/content';
import { kindle, kindleCost, nextPullFiveChance, redeemSpark, seedRng, type BannerDef, type PullOutcome, type ApplyOutcome } from '@duskline/core';
import { cycleOverride, now, randomSeed } from '../game/clock';
import { back, go } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile, toast } from '../game/store';
import { GloamIcon, Stars } from '../ui/Icons';
import { Sky } from '../ui/Sky';
import { dateLabel } from '../ui/text';
import { itemView } from '../ui/items';
import { GloamPill } from './Home';

interface Reveal {
  outcomes: Array<Pick<ApplyOutcome, 'item' | 'rarity' | 'isNew' | 'resonance' | 'copies' | 'gloam' | 'kind'> & { featured: boolean }>;
}

const revealing = signal<Reveal | null>(null);

function noteFor(o: Reveal['outcomes'][number]): string {
  if (o.kind === 'hero') {
    if (o.isNew) return 'New hero';
    if (o.gloam > 0) return `Max Resonance · +${o.gloam} Gloam`;
    return `Resonance ${o.resonance}`;
  }
  if (o.isNew) return 'New card';
  if (o.gloam > 0) return `Max copies · +${o.gloam} Gloam`;
  return `Copy ×${o.copies}`;
}

function RevealOverlay({ reveal, onClose }: { reveal: Reveal; onClose: () => void }): JSX.Element {
  const all = reveal.outcomes;
  // A ten-pull walks through the ★4 and ★5 results; a single pull always shows its result.
  const list = all.length === 1 ? all : all.filter((o) => o.rarity >= 4);
  const [i, setI] = useState(0);
  const [summary, setSummary] = useState(list.length === 0);
  const cur = list[i];
  const advance = (): void => {
    if (i + 1 >= list.length) setSummary(true);
    else {
      const n = list[i + 1]!;
      sfx.pull(n.rarity);
      setI(i + 1);
    }
  };
  if (summary) {
    return (
      <div class="overlay center kx-overlay">
        <div class="sheet kx-summary">
          <h2 class="display">Kindled</h2>
          <div class="kx-grid">
            {all.map((o, k) => {
              const v = itemView(o.item);
              return (
                <div key={k} class={`kx-mini r${o.rarity}`} title={`${v.name}: ${noteFor(o)}`}>
                  <img src={v.url} alt="" draggable={false} />
                  <Stars n={o.rarity} />
                  <span class="kx-mini-name">{v.name}</span>
                  {o.isNew && <b class="kx-new">NEW</b>}
                </div>
              );
            })}
          </div>
          <button class="btn btn-primary btn-block" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }
  const v = itemView(cur!.item);
  return (
    <div class={`overlay kx-overlay kx-r${cur!.rarity}`} onClick={advance} role="button" tabIndex={0} aria-label="Next">
      <div class="kx-burst" aria-hidden="true" />
      <button
        class="btn btn-small btn-ghost kx-skip"
        onClick={(e) => {
          e.stopPropagation();
          setSummary(true);
        }}
      >
        Skip
      </button>
      <div key={i} class="kx-card pop">
        <Stars n={cur!.rarity} />
        <div class={`kx-art ${v.kind}`}>
          <img src={v.url} alt="" draggable={false} />
        </div>
        <h2 class="display kx-name">{v.name}</h2>
        <p class="muted">{v.sub}</p>
        <p class="kx-note">{noteFor(cur!)}</p>
        {cur!.featured && <span class="chip chip-gold">Featured</span>}
      </div>
      <p class="label kx-count">
        {i + 1} / {list.length} · tap to go on
      </p>
    </div>
  );
}

function BannerPanel({ banner, ends }: { banner: BannerDef; ends: number | null }): JSX.Element {
  const p = profile.value;
  const [busy, setBusy] = useState(false);
  const pity = p.kindling.pity[banner.pityGroup] ?? { five: 0, four: 0, guaranteed: false };
  const spark = p.kindling.spark[banner.id] ?? 0;
  const sparkAt = banner.rules.spark?.at ?? 0;
  const hard = banner.rules.five.hard;
  const chance = nextPullFiveChance(banner.rules, pity.five);
  const featured = banner.featured.five[0];
  const fv = featured ? itemView(featured) : null;
  const canSpark = sparkAt > 0 && spark >= sparkAt && banner.featured.five.length > 0;
  const seed = useMemo(randomSeed, [p.kindling.totalPulls]);

  const doPull = (count: number): void => {
    if (busy) return;
    const cost = kindleCost(banner, count);
    if (profile.value.gloam < cost) {
      toast(`You need ${cost} Gloam. Play stages, tasks and Descent to earn more.`, 'warn');
      return;
    }
    setBusy(true);
    const out = mutate((x) => kindle(x, banner, count, seedRng(seed + ':' + x.kindling.totalPulls), catalog, now()));
    setBusy(false);
    if (!out) return;
    const best = Math.max(...out.map((o) => o.rarity));
    sfx.pull(best as 3 | 4 | 5);
    revealing.value = { outcomes: out.map((o: PullOutcome) => ({ ...o, featured: o.pull.featured })) };
  };

  const doSpark = (id: string): void => {
    const out = mutate((x) => redeemSpark(x, banner, id, catalog, now()));
    if (!out) return;
    sfx.pull(5);
    revealing.value = { outcomes: [{ ...out, featured: true }] };
  };

  return (
    <div class="kx-banner">
      <div class={`kx-hero panel ${featured ? 'rateup' : 'standard'}`}>
        {fv && <img src={fv.url} alt="" draggable={false} />}
        <div class="kx-hero-text">
          <span class="chip chip-gold">{featured ? 'Rate-up' : 'Always on'}</span>
          <h2 class="display">{banner.name}</h2>
          <p class="muted">{banner.tagline}</p>
          {ends && <p class="label">Ends {dateLabel(ends)}</p>}
        </div>
      </div>

      <div class="panel panel-pad kx-pity">
        <div class="row">
          <span class="label grow">Pulls since last ★5</span>
          <strong class="num">
            {pity.five}
            {hard > 0 && <small class="muted"> / {hard}</small>}
          </strong>
        </div>
        {hard > 0 && (
          <span class="meter meter-gauge">
            <i style={{ width: `${(pity.five / hard) * 100}%` }} />
          </span>
        )}
        <p class="kx-line">
          Next pull ★5 chance: <strong>{(chance * 100).toFixed(1)}%</strong>
          {banner.rules.guaranteeAfterMiss && pity.guaranteed && <span class="chip chip-gold"> Next ★5 is featured</span>}
        </p>
        {sparkAt > 0 && (
          <>
            <div class="row">
              <span class="label grow">Spark</span>
              <strong class="num">
                {Math.min(spark, sparkAt)} <small class="muted">/ {sparkAt}</small>
              </strong>
            </div>
            <span class="meter meter-shell">
              <i style={{ width: `${Math.min(100, (spark / sparkAt) * 100)}%` }} />
            </span>
            <p class="muted kx-line">At {sparkAt} pulls, choose the featured ★5. Unused spark turns back into Gloam when the banner ends.</p>
          </>
        )}
      </div>

      {canSpark && (
        <div class="panel panel-pad kx-spark">
          <p>
            <strong>Spark ready.</strong> Choose your featured ★5:
          </p>
          {banner.featured.five.map((id) => (
            <button key={id} class="btn btn-gold btn-block" onClick={() => doSpark(id)}>
              Take {itemView(id).name}
            </button>
          ))}
        </div>
      )}

      <div class="kx-actions">
        <button class="btn btn-primary" disabled={busy} onClick={() => doPull(1)}>
          Kindle ×1
          <span class="sub gloam">
            <GloamIcon />
            {kindleCost(banner, 1)}
          </span>
        </button>
        <button class="btn btn-gold" disabled={busy} onClick={() => doPull(10)}>
          Kindle ×10
          <span class="sub gloam">
            <GloamIcon />
            {kindleCost(banner, 10)}
          </span>
        </button>
      </div>
      <div class="row kx-links">
        <button class="btn btn-ghost btn-small grow" onClick={() => go({ name: 'odds', banner: banner.id })}>
          Odds and pity
        </button>
        <button class="btn btn-ghost btn-small grow" onClick={() => go({ name: 'history' })}>
          History
        </button>
      </div>
    </div>
  );
}

export function Kindling(): JSX.Element {
  const active = activeBanners(now(), cycleOverride);
  const [tab, setTab] = useState<'rate' | 'std'>('rate');
  const p = profile.value;
  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 class="display">Kindling</h1>
        <GloamPill amount={p.gloam} />
      </header>
      <div class="tabs kx-tabs" role="tablist">
        <button class="tab" role="tab" aria-selected={tab === 'rate'} onClick={() => setTab('rate')}>
          Rate-up
        </button>
        <button class="tab" role="tab" aria-selected={tab === 'std'} onClick={() => setTab('std')}>
          Standard
        </button>
      </div>
      <div class="body scroll">
        {tab === 'rate' ? <BannerPanel key={active.rateUp.id} banner={active.rateUp} ends={active.endsAt} /> : <BannerPanel key="std" banner={active.standard} ends={null} />}
      </div>
      {revealing.value && <RevealOverlay reveal={revealing.value} onClose={() => (revealing.value = null)} />}
    </div>
  );
}


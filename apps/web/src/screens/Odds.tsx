import { useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import { bannerById, KINDLING_ITEMS } from '@duskline/content';
import { DUPE_GLOAM, SPARK_REFUND_PER_POINT, analyzeRules, fiveRate } from '@duskline/core';
import { back } from '../game/nav';
import { Sky } from '../ui/Sky';
import { itemView } from '../ui/items';

const pct = (v: number, d = 1): string => `${(v * 100).toFixed(d)}%`;

/** Probability curve: the chance of holding a featured ★5 by each pull, drawn from the exact analysis. */
function Chart({ cdf, hard, spark }: { cdf: number[]; hard: number; spark: number }): JSX.Element {
  const W = 320;
  const H = 150;
  const max = Math.max(spark || 0, hard * 2 || 0, 130);
  const xs = (n: number): number => 26 + (n / max) * (W - 34);
  const ys = (p: number): number => 8 + (1 - p) * (H - 30);
  let d = `M ${xs(0)} ${ys(0)}`;
  for (let n = 1; n <= Math.min(max, cdf.length - 1); n++) d += ` L ${xs(n).toFixed(1)} ${ys(cdf[n] ?? 1).toFixed(1)}`;
  const marks = [0.5, 0.9];
  return (
    <svg class="odds-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chance of a featured 5-star by number of pulls">
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line x1={26} x2={W - 8} y1={ys(p)} y2={ys(p)} stroke="#332d57" stroke-width="1" />
          <text x={22} y={ys(p) + 3} text-anchor="end" font-size="8" fill="#9d97bb">
            {Math.round(p * 100)}%
          </text>
        </g>
      ))}
      {[0, 30, 60, 90, 120].filter((n) => n <= max).map((n) => (
        <text key={n} x={xs(n)} y={H - 6} text-anchor="middle" font-size="8" fill="#9d97bb">
          {n}
        </text>
      ))}
      {spark > 0 && <line x1={xs(spark)} x2={xs(spark)} y1={ys(1)} y2={ys(0)} stroke="#e0457b" stroke-dasharray="3 3" />}
      {hard > 0 && <line x1={xs(hard)} x2={xs(hard)} y1={ys(1)} y2={ys(0)} stroke="#6a3a9e" stroke-dasharray="3 3" />}
      <path d={d} fill="none" stroke="#f2b43a" stroke-width="2.5" />
      {marks.map((q) => {
        const n = cdf.findIndex((v) => v >= q);
        return n > 0 ? <circle key={q} cx={xs(n)} cy={ys(cdf[n]!)} r="3.5" fill="#f2b43a" /> : null;
      })}
    </svg>
  );
}

export function Odds({ bannerId }: { bannerId: string }): JSX.Element {
  const banner = bannerById(bannerId) ?? bannerById('standard')!;
  const r = banner.rules;
  const hasFeatured = banner.featured.five.length > 0;
  const a = useMemo(() => analyzeRules(r, hasFeatured), [bannerId]);
  const spark = r.spark?.at ?? 0;
  const fourShare = r.four.base;
  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 class="display">Odds</h1>
      </header>
      <div class="body scroll odds">
        <h2 class="display odds-title">{banner.name}</h2>
        <p class="muted">Kindling costs Gloam only. Gloam is earned by playing and can never be bought. These are the exact rules the game runs.</p>

        <section class="panel panel-pad">
          <h3 class="label">Rates per pull</h3>
          <table class="odds-table">
            <tbody>
              <tr>
                <td>★5 base</td>
                <td>{pct(r.five.base)}</td>
              </tr>
              <tr>
                <td>★4 (of non-★5)</td>
                <td>{pct(fourShare)}</td>
              </tr>
              <tr>
                <td>★3</td>
                <td>the rest</td>
              </tr>
              <tr>
                <td>At least one ★4 or better</td>
                <td>every {r.four.every} pulls</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel panel-pad">
          <h3 class="label">Pity</h3>
          <table class="odds-table">
            <tbody>
              <tr>
                <td>Soft pity starts at pull</td>
                <td>{r.five.softStart}</td>
              </tr>
              <tr>
                <td>Added ★5 chance per pull after that</td>
                <td>+{pct(r.five.softStep)}</td>
              </tr>
              <tr>
                <td>Guaranteed ★5 by pull</td>
                <td>{r.five.hard}</td>
              </tr>
              <tr>
                <td>Chance at pull {r.five.softStart}</td>
                <td>{pct(fiveRate(r.five, r.five.softStart))}</td>
              </tr>
              <tr>
                <td>Chance at pull {r.five.hard - 1}</td>
                <td>{pct(fiveRate(r.five, r.five.hard - 1))}</td>
              </tr>
            </tbody>
          </table>
          <p class="muted odds-note">Pity carries over between rate-up banners. The standard banner keeps its own count.</p>
        </section>

        {hasFeatured && (
          <section class="panel panel-pad">
            <h3 class="label">Featured ★5</h3>
            <table class="odds-table">
              <tbody>
                <tr>
                  <td>A ★5 is the featured one</td>
                  <td>{pct(r.featuredShare, 0)}</td>
                </tr>
                <tr>
                  <td>After a miss, the next ★5 is</td>
                  <td>{r.guaranteeAfterMiss ? 'featured for sure' : 'not guaranteed'}</td>
                </tr>
                <tr>
                  <td>Long-run featured share</td>
                  <td>{pct(a.featuredShareOverall)}</td>
                </tr>
                <tr>
                  <td>Average pulls to the featured ★5</td>
                  <td>{a.avgPullsToFeatured.toFixed(0)}</td>
                </tr>
                <tr>
                  <td>Median · 90% of players by</td>
                  <td>
                    {a.medianToFeatured} · {a.p90ToFeatured}
                  </td>
                </tr>
                <tr>
                  <td>Certain by</td>
                  <td>{a.worstCaseToFeatured ?? 'n/a'} pulls</td>
                </tr>
              </tbody>
            </table>
            <Chart cdf={a.featuredCdf} hard={r.five.hard} spark={spark} />
            <p class="muted odds-note">Gold: chance to hold the featured ★5 by that many pulls. Violet line: pity cap. Rose line: spark.</p>
          </section>
        )}

        {spark > 0 && (
          <section class="panel panel-pad">
            <h3 class="label">Spark</h3>
            <p>
              Every pull on this banner adds a spark point. At {spark}, you can choose the featured ★5. If the banner ends first, each leftover point comes back as {SPARK_REFUND_PER_POINT} Gloam, so nothing is lost.
            </p>
          </section>
        )}

        <section class="panel panel-pad">
          <h3 class="label">Duplicates</h3>
          <p>
            A repeat hero raises Resonance up to 5. After that, it pays Gloam: ★5 {DUPE_GLOAM.hero[5]}, ★4 {DUPE_GLOAM.hero[4]}. Cards stack to 5 copies, then pay ★5 {DUPE_GLOAM.card[5]}, ★4 {DUPE_GLOAM.card[4]}, ★3 {DUPE_GLOAM.card[3]}.
          </p>
        </section>

        <section class="panel panel-pad">
          <h3 class="label">What is in the pool</h3>
          {([5, 4, 3] as const).map((rar) => {
            const feat = rar === 5 ? banner.featured.five : rar === 4 ? banner.featured.four : [];
            const rest = rar === 5 ? banner.pool.five : rar === 4 ? banner.pool.four : banner.pool.three;
            return (
              <div key={rar} class="odds-pool">
                <span class={`stars r${rar} odds-rar`}>★{rar}</span>
                <span>
                  {feat.map((id) => (
                    <b key={id} class="odds-feat">
                      {itemView(id).name} (featured){' '}
                    </b>
                  ))}
                  {rest.map((id) => itemView(id).name).join(', ')}
                </span>
              </div>
            );
          })}
          <p class="muted odds-note">{KINDLING_ITEMS.five.length + KINDLING_ITEMS.four.length + KINDLING_ITEMS.three.length} items in total. Within a rarity, each item in the pool is equally likely.</p>
        </section>
      </div>
    </div>
  );
}

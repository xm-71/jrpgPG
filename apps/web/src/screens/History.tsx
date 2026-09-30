import type { JSX } from 'preact';
import { bannerById } from '@duskline/content';
import { back } from '../game/nav';
import { profile } from '../game/store';
import { Stars } from '../ui/Icons';
import { Sky } from '../ui/Sky';
import { dateLabel } from '../ui/text';
import { itemView } from '../ui/items';

export function History(): JSX.Element {
  const k = profile.value.kindling;
  const list = [...k.history].reverse();
  const fives = k.history.filter((h) => h.rarity === 5).length;
  const fours = k.history.filter((h) => h.rarity === 4).length;
  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 class="display">History</h1>
      </header>
      <div class="body scroll">
        <div class="panel panel-pad hist-stats">
          <span>
            <b class="num">{k.totalPulls}</b>
            <small class="label"> pulls</small>
          </span>
          <span>
            <b class="num">{fives}</b>
            <small class="label"> ★5</small>
          </span>
          <span>
            <b class="num">{fours}</b>
            <small class="label"> ★4</small>
          </span>
          <span>
            <b class="num">{fives ? (k.history.length / fives).toFixed(0) : '–'}</b>
            <small class="label"> per ★5</small>
          </span>
        </div>
        <p class="muted hist-note">The last {k.history.length} pulls are kept on this device.</p>
        {list.length === 0 && <p class="muted">No pulls yet.</p>}
        <ol class="hist-list">
          {list.map((h) => {
            const v = itemView(h.item);
            return (
              <li key={h.n} class={`hist-row r${h.rarity}`}>
                <span class="hist-n num">#{h.n}</span>
                <span class="hist-name">
                  {v.name}
                  {h.featured && <b class="chip chip-gold"> Featured</b>}
                </span>
                <Stars n={h.rarity} />
                <small class="muted hist-when">
                  {bannerById(h.banner)?.name ?? h.banner} · {dateLabel(h.at)}
                </small>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

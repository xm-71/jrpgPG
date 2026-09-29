import type { JSX } from 'preact';
import { REST_HEAL, SHOP_HEAL, buy, canAfford, canTemper, chooseEvent, findCard, leaveEvent, leaveShop, rest, type ClimbRun } from '@duskline/core';
import { climbDeps, requireEvent, requireGlimmer } from '@duskline/content';
import { sfx } from '../../game/sfx';
import { mutate, toast } from '../../game/store';
import { CardFace } from '../../ui/CardFace';
import { EmberIcon } from '../../ui/Icons';
import { Sky } from '../../ui/Sky';
import { ClimbHud } from './Hud';

export function EventView({ run }: { run: ClimbRun }): JSX.Element {
  const ev = run.event!;
  const def = requireEvent(ev.id);
  const chosen = ev.choice !== null ? def.choices[ev.choice] : undefined;
  return (
    <div class="screen">
      <Sky variant="night" />
      <ClimbHud run={run} />
      <div class="body scroll event">
        <p class="label">On the stair</p>
        <h2 class="offer-title">{def.title}</h2>
        <p class="event-text">{def.text}</p>
        {chosen ? (
          <div class="panel panel-pad event-after pop">
            <p class="label">{chosen.label}</p>
            <p>{ev.text}</p>
          </div>
        ) : (
          <div class="event-choices">
            {def.choices.map((c, i) => {
              const ok = canAfford(run, c.cost);
              return (
                <button
                  key={c.label}
                  class="event-choice panel"
                  disabled={!ok}
                  onClick={() => {
                    sfx.tap();
                    mutate((p) => chooseEvent(p.climb.run!, climbDeps, i));
                  }}
                >
                  <span class="event-choice-label">{c.label}</span>
                  <span class="event-choice-hint">{c.hint}</span>
                  {c.cost && (
                    <span class="label event-cost">
                      {c.cost.embers ? `${c.cost.embers} Embers` : ''}
                      {c.cost.embers && c.cost.hp ? ' · ' : ''}
                      {c.cost.hp ? `${c.cost.hp} HP` : ''}
                      {!ok ? ' · you cannot pay this' : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {chosen && (
        <div class="foot">
          <button class="btn btn-primary btn-block" onClick={() => mutate((p) => leaveEvent(p.climb.run!, climbDeps))}>
            {ev.follow?.type === 'fight' ? 'Fight' : ev.follow ? 'Go on' : 'Climb on'}
          </button>
        </div>
      )}
    </div>
  );
}

export function ShopView({ run }: { run: ClimbRun }): JSX.Element {
  const items = run.shop ?? [];
  const purchase = (i: number): void => {
    try {
      sfx.spend();
      mutate((p) => buy(p.climb.run!, climbDeps, i));
    } catch (e) {
      toast((e as Error).message, 'warn');
    }
  };
  return (
    <div class="screen">
      <Sky variant="night" />
      <ClimbHud run={run} />
      <div class="body scroll shop">
        <p class="label">Ghost market</p>
        <h2 class="offer-title">Faceless merchants, fair prices</h2>
        <div class="shop-cards">
          {items.map((it, i) => {
            if (it.kind !== 'card' || !it.id) return null;
            const def = findCard(run, climbDeps, it.id);
            if (!def) return null;
            return (
              <div key={i} class={`shop-item${it.sold ? ' sold' : ''}`}>
                <CardFace def={def} up={it.up === true} size="list" {...(!it.sold ? { onClick: () => purchase(i) } : {})} label={`Buy ${def.name} for ${it.price} Embers`} />
                <span class={`price${run.embers < it.price ? ' short' : ''}`}>{it.sold ? 'Sold' : <><EmberIcon /> {it.price}</>}</span>
              </div>
            );
          })}
        </div>
        <div class="shop-services">
          {items.map((it, i) => {
            if (it.kind === 'card') return null;
            const title = it.kind === 'glimmer' ? requireGlimmer(it.id!).name : it.kind === 'heal' ? 'Mend' : 'Remove a card';
            const text = it.kind === 'glimmer' ? requireGlimmer(it.id!).text : it.kind === 'heal' ? `Heal ${Math.round(run.maxHp * SHOP_HEAL)} HP.` : 'Take one card out of your deck for good.';
            return (
              <button key={i} class={`shop-service panel${it.sold ? ' sold' : ''}`} disabled={it.sold || run.embers < it.price} onClick={() => purchase(i)}>
                <span class="grow">
                  <strong>{title}</strong>
                  <span class="muted small">{text}</span>
                </span>
                <span class="price">{it.sold ? 'Sold' : <><EmberIcon /> {it.price}</>}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div class="foot">
        <button class="btn btn-ghost btn-block" onClick={() => mutate((p) => leaveShop(p.climb.run!))}>
          Leave the market
        </button>
      </div>
    </div>
  );
}

export function RestView({ run }: { run: ClimbRun }): JSX.Element {
  const canUp = run.deck.some((c) => canTemper(findCard(run, climbDeps, c.id), c.up));
  const heal = Math.min(run.maxHp - run.hp, Math.round(run.maxHp * REST_HEAL));
  return (
    <div class="screen">
      <Sky variant="dusk" />
      <ClimbHud run={run} />
      <div class="center-col rest">
        <p class="label">A quiet landing</p>
        <h2>Rest a while</h2>
        <p class="muted">Someone left a lamp burning here. You can sleep beside it, or sit up and work on your cards.</p>
        <div class="btn-stack">
          <button
            class="btn btn-primary btn-block"
            onClick={() => {
              sfx.heal();
              mutate((p) => rest(p.climb.run!, climbDeps, 'heal'));
            }}
          >
            Sleep
            <span class="sub">Heal {heal} HP</span>
          </button>
          <button class="btn btn-block" disabled={!canUp} onClick={() => mutate((p) => rest(p.climb.run!, climbDeps, 'temper'))}>
            Temper a card
            <span class="sub">{canUp ? 'Make one card stronger for this climb' : 'Every card is already tempered'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

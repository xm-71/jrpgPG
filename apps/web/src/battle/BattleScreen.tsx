import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { STATUS_HELP, STATUS_NAME, cardStats, defOf, passiveSum, type BattleSetup, type CardBattle, type StatusId, type Statuses } from '@duskline/core';
import { requireHero } from '@duskline/content';
import { sfx } from '../game/sfx';
import { mutate, settings } from '../game/store';
import { MOODS, heroUrl } from '../ui/Art';
import { FocusLines } from '../ui/Manga';
import { CardFace } from '../ui/CardFace';
import { ask } from '../ui/Dialog';
import { AffinityIcon, BladeIcon, LightPip, ShieldIcon, StatusIcon } from '../ui/Icons';
import { Sky } from '../ui/Sky';
import { CardController } from './controller';
import { foeSpot } from './layout';
import { BattleScene } from './scene';
import type { FoeView, IntentPart } from './view';

export interface BattleOutcome {
  result: 'victory' | 'defeat';
  battle: CardBattle;
}

interface Props {
  setup: BattleSetup;
  seed: string;
  title: string;
  /** A small line under the title, such as where in the tower this fight is. */
  subtitle?: string;
  onDone: (o: BattleOutcome) => void;
  /** Give up. When omitted the fight cannot be left. */
  onQuit?: () => void;
  quitNote?: string;
  /** Shown above the hand for the first fights. */
  tips?: string[];
}

const PART_LABEL: Record<IntentPart, string> = {
  attack: 'Attack',
  ward: 'Ward',
  rage: 'Rage',
  heal: 'Heal',
  curse: 'Ash',
  summon: 'Summon',
  chill: 'Chill you',
  hex: 'Hex you',
  dim: 'Dim you',
  shatter: 'Break ward',
};

function StatusChips({ statuses }: { statuses: Statuses }): JSX.Element | null {
  const list = (Object.entries(statuses) as Array<[StatusId, number]>).filter(([, n]) => n > 0);
  if (list.length === 0) return null;
  return (
    <span class="st-chips">
      {list.map(([s, n]) => (
        <span key={s} class={`st-chip st-${s}`} title={`${STATUS_NAME[s]} ${n}: ${STATUS_HELP[s]}`}>
          <StatusIcon s={s} size={11} />
          {n}
        </span>
      ))}
    </span>
  );
}

function Intent({ f }: { f: FoeView }): JSX.Element | null {
  if (!f.alive) return null;
  if (f.broken) return <span class="intent broken">Broken · loses its turn</span>;
  const i = f.intent;
  if (!i) return null;
  const others = i.parts.filter((p) => p !== 'attack');
  return (
    <span class={`intent${i.heavy ? ' heavy' : ''}`} title={i.name}>
      {i.parts.includes('attack') && (
        <b class="intent-atk">
          <BladeIcon size={13} />
          {i.perHit}
          {i.hits > 1 && <small>×{i.hits}</small>}
          {i.pierce && <small> pierce</small>}
        </b>
      )}
      {others.map((p) => (
        <span key={p} class={`intent-part p-${p}`}>
          {PART_LABEL[p]}
        </span>
      ))}
    </span>
  );
}

function FoePlate({ f, count, ctl, targetable }: { f: FoeView; count: number; ctl: CardController; targetable: boolean }): JSX.Element {
  const spot = foeSpot(f.slot, count, f.tier);
  const preview = targetable ? ctl.previewOn(f.id) : null;
  return (
    <div
      class={`foe-plate${f.alive ? '' : ' down'}${f.broken ? ' broken' : ''}${targetable ? ' targetable' : ''}`}
      style={{ left: `${(spot.x - spot.col / 2) * 100}%`, width: `${spot.col * 100}%` }}
    >
      <Intent f={f} />
      <button class="foe-card" disabled={!targetable} onClick={() => ctl.tapFoe(f.id)} aria-label={`${f.name}, ${f.hp} of ${f.maxHp} HP${targetable ? '. Tap to target' : ''}`}>
        <span class="foe-name">{f.name}</span>
        <span class="foe-hpline">
          <span class="meter meter-foe grow">
            <i style={{ width: `${(f.hp / f.maxHp) * 100}%` }} />
          </span>
          <span class="foe-hp num">{f.hp}</span>
          {f.ward > 0 && (
            <span class="foe-ward num">
              <ShieldIcon size={10} />
              {f.ward}
            </span>
          )}
        </span>
        <span class="foe-row">
          <span class="foe-shell" aria-label={`Shell ${f.shell} of ${f.maxShell}${f.hardened ? ', hardened' : ''}`}>
            {f.broken ? (
              <b class="foe-broken">BREAK</b>
            ) : (
              Array.from({ length: f.maxShell }, (_, i) => <i key={i} class={`${i < f.shell ? 'on' : ''}${f.hardened ? ' hard' : ''}`} />)
            )}
          </span>
          <span class="foe-weak" title="Weak to">
            {f.weaknesses.map((a) => (
              <AffinityIcon key={a} a={a} size={13} />
            ))}
          </span>
        </span>
        <StatusChips statuses={f.statuses} />
        {preview && (
          <span class={`foe-preview${preview.weak ? ' weak' : ''}${preview.resist ? ' resist' : ''}`}>
            −{preview.amount}
            {preview.hits > 1 ? `×${preview.hits}` : ''}
            {preview.weak ? ' weak' : preview.resist ? ' resist' : ''}
          </span>
        )}
      </button>
    </div>
  );
}

export function BattleScreen({ setup, seed, title, subtitle, onDone, onQuit, quitNote, tips }: Props): JSX.Element {
  const ctl = useMemo(() => {
    const c = new CardController(setup, seed);
    c.speed.value = settings.value.battleSpeed;
    c.auto.value = settings.value.autoBattle;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = new BattleScene(host.current!);
    let dead = false;
    void (async () => {
      try {
        await document.fonts?.load("800 24px 'Shippori Mincho B1'");
      } catch {
        /* the fallback face is fine */
      }
      await scene.init();
      if (dead) return;
      scene.reduced = settings.value.reducedMotion;
      await scene.load(ctl.view.value.foes);
      if (dead) return;
      ctl.attach(scene);
      await ctl.start();
    })();
    return () => {
      dead = true;
      ctl.dispose();
      scene.destroy();
    };
  }, [ctl]);

  const v = ctl.view.value;
  const busy = ctl.busy.value;
  const auto = ctl.auto.value;
  const selected = ctl.selected.value;
  const hero = requireHero(setup.hero.id);
  // Decode every face up front so the portrait can change expression without a flicker.
  useEffect(() => {
    for (const m of MOODS) new Image().src = heroUrl(hero, 'face', m);
    new Image().src = heroUrl(hero, 'half', 'fierce');
  }, [hero.id]);
  const canAct = !busy && !auto && !v.result;
  const alive = v.foes.filter((f) => f.alive);
  const targeting = selected !== null && ctl.needsTarget(selected);
  const perHeld = passiveSum(ctl.state.hero.passives, 'heldWard');
  const handDefs = v.hand.map((c) => {
    const inState = ctl.state.hand.find((x) => x.uid === c.uid);
    return { c, def: defOf(ctl.state, inState ?? c) };
  });
  const selectedWard = (() => {
    if (selected === null) return 0;
    const h = handDefs.find((x) => x.c.uid === selected);
    if (!h) return 0;
    const st = cardStats(h.def, h.c.up);
    return st.keywords.includes('fleeting') || st.keywords.includes('unplayable') ? 0 : st.ward + perHeld;
  })();
  const wardIfEnd = v.incoming.ward - selectedWard;
  const taken = Math.max(0, v.incoming.damage - wardIfEnd) + v.incoming.pierce;
  const gaugePct = Math.min(100, v.hero.gauge);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!canAct) return;
      if (e.key === 'Escape') ctl.clearSelection();
      if (e.key === 'e' || e.key === 'E') void ctl.endTurn();
      const n = Number(e.key);
      if (n >= 1 && n <= v.hand.length) ctl.tapCard(v.hand[n - 1]!.uid);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const toggleSpeed = (): void => {
    const next = ctl.speed.value === 1 ? 2 : 1;
    ctl.setSpeed(next);
    mutate((p) => {
      p.settings.battleSpeed = next;
    });
    sfx.tap();
  };
  const toggleAuto = (): void => {
    ctl.toggleAuto();
    sfx.tap();
  };
  const quit = async (): Promise<void> => {
    if (!onQuit) return;
    const ok = await ask({ title: 'Give up the climb?', body: quitNote ?? 'You will leave this fight.', confirm: 'Give up', cancel: 'Keep fighting', danger: true });
    if (ok) onQuit();
  };

  const tip = tips?.[Math.min(tips.length - 1, Math.max(0, v.turn - 1))];

  return (
    <div class="screen battle">
      <Sky variant="tower" />
      <div class="bt-top">
        <span class="bt-title">
          <span class="bt-title-name">{title}</span>
          {subtitle && <span class="label bt-title-sub">{subtitle}</span>}
        </span>
        <button class={`btn btn-small btn-ghost${auto ? ' on' : ''}`} onClick={toggleAuto} aria-pressed={auto} disabled={!!v.result}>
          Auto
        </button>
        <button class={`btn btn-small btn-ghost${ctl.speed.value === 2 ? ' on' : ''}`} onClick={toggleSpeed} aria-pressed={ctl.speed.value === 2}>
          2×
        </button>
        {onQuit && (
          <button class="btn btn-small btn-ghost btn-icon" onClick={() => void quit()} disabled={!!v.result} aria-label="Give up the climb">
            ✕
          </button>
        )}
      </div>

      <div class="bt-field">
        <div class="bt-canvas" ref={host} />
        <div class="bt-plates">
          {v.foes.map((f) => (
            <FoePlate key={f.id} f={f} count={v.foes.length} ctl={ctl} targetable={targeting && f.alive} />
          ))}
        </div>
        {targeting &&
          alive.map((f) => {
            const s = foeSpot(f.slot, v.foes.length, f.tier);
            return (
              <button
                key={f.id}
                class="bt-hit"
                style={{ left: `${(s.x - s.col / 2) * 100}%`, width: `${s.col * 100}%`, top: `${(s.y - s.h) * 100}%`, height: `${s.h * 100}%` }}
                onClick={() => ctl.tapFoe(f.id)}
                aria-label={`Target ${f.name}`}
              />
            );
          })}
        {ctl.callout.value && (
          <div key={ctl.callout.value.id} class={`bt-callout ${ctl.callout.value.tone}`}>
            {ctl.callout.value.text}
          </div>
        )}
        {ctl.cutin.value && (
          <div class="bt-cutin" style={{ '--cut': hero.look.accent }}>
            <div class="cutin-frame">
              <div class="cutin-panel">
                <FocusLines seed={hero.id} color="#FBF5EA" cx={32} cy={46} inner={22} count={80} />
                <img src={heroUrl(hero, 'half', 'fierce')} alt="" draggable={false} />
                <span class="cutin-sfx" lang="ja" aria-hidden="true">
                  ドン
                </span>
              </div>
            </div>
            <div class="cutin-name">
              <span class="label">Ultimate</span>
              <span class="display">{ctl.cutin.value.title}</span>
            </div>
          </div>
        )}
        {v.chain.steps > 0 && !busy && (
          <div class={`bt-chain aff-${v.chain.affinity ?? 'none'}`}>
            Chain ×{v.chain.steps + 1} <small>+{Math.min(3, v.chain.steps) * 20}%</small>
          </div>
        )}
      </div>

      <div class={`bt-hero${ctl.hurt.value % 2 ? ' hurt-a' : ctl.hurt.value > 0 ? ' hurt-b' : ''}`}>
        <div class="bt-portrait">
          <img src={heroUrl(hero, 'face', ctl.face.value)} alt="" draggable={false} />
          <svg class="bt-gauge" viewBox="0 0 40 40" aria-label={`Ultimate ${gaugePct}%`}>
            <circle cx="20" cy="20" r="18" />
            <circle cx="20" cy="20" r="18" class="fill" style={{ strokeDasharray: `${(gaugePct / 100) * 113} 113` }} />
          </svg>
        </div>
        <div class="bt-vitals">
          <div class="row">
            <span class="bt-name">{hero.name}</span>
            <StatusChips statuses={v.hero.statuses} />
            <span class="grow" />
            <span class="bt-hpnum num">
              {v.hero.hp}
              <small>/{v.hero.maxHp}</small>
            </span>
          </div>
          <span class={`meter meter-hp${v.hero.hp / v.hero.maxHp < 0.3 ? ' low' : ''}`}>
            <i style={{ width: `${(v.hero.hp / v.hero.maxHp) * 100}%` }} />
          </span>
          <div class="row bt-lightrow">
            <span class="bt-light" aria-label={`Light ${v.light} of ${v.maxLight}`}>
              {Array.from({ length: Math.max(v.maxLight, v.light) }, (_, i) => (
                <LightPip key={i} on={i < v.light} />
              ))}
            </span>
            <span class="label">Light</span>
            <span class="grow" />
            <span class="bt-piles label" title="Draw pile, discard pile">
              Draw {v.drawCount} · Discard {v.discardCount}
            </span>
            {v.hero.ward > 0 && (
              <span class="bt-ward num">
                <ShieldIcon size={13} />
                {v.hero.ward}
              </span>
            )}
          </div>
        </div>
        <div class="bt-floats" aria-hidden="true">
          {ctl.floats.value.map((f) => (
            <span key={f.id} class={`bt-float ${f.kind}`}>
              {f.text}
            </span>
          ))}
        </div>
      </div>

      {tip && !v.result && !auto && <p class="bt-tip">{tip}</p>}

      <div class="bt-hand" role="group" aria-label="Your hand">
        {handDefs.map(({ c, def }) => {
          const st = cardStats(def, c.up);
          const holdable = !st.keywords.includes('fleeting') && !st.keywords.includes('unplayable');
          return (
            <div key={c.uid} class={`bt-slot${ctl.flying.value === c.uid ? ' flying' : ''}`}>
              <CardFace
                def={def}
                up={c.up === true}
                size="hand"
                dim={!canAct || ctl.blocked(c.uid) !== null}
                selected={selected === c.uid}
                holdWard={holdable ? st.ward + perHeld : 0}
                onClick={() => ctl.tapCard(c.uid)}
              />
            </div>
          );
        })}
        {handDefs.length === 0 && <p class="bt-empty muted">No cards in hand.</p>}
      </div>

      <div class="bt-actions">
        <p class="bt-forecast" aria-live="polite">
          {v.result ? (
            ' '
          ) : v.incoming.damage + v.incoming.pierce === 0 ? (
            <>No attacks coming</>
          ) : (
            <>
              Incoming <b>{v.incoming.damage + v.incoming.pierce}</b> · ward <b>{Math.max(0, wardIfEnd)}</b> ·{' '}
              <b class={taken > 0 ? 'bad' : 'good'}>{taken > 0 ? `take ${taken}` : 'safe'}</b>
            </>
          )}
        </p>
        <button class="btn btn-primary bt-end" disabled={!canAct} onClick={() => void ctl.endTurn()}>
          End turn
          <span class="sub">{v.hand.length > 0 ? `Hold ${v.hand.length} to ward` : 'Nothing held'}</span>
        </button>
      </div>

      {v.result && (
        <div class="overlay center">
          <div class={`sheet bt-result ${v.result}`}>
            {v.result === 'victory' && <FocusLines seed="victory" color="rgba(236,230,216,.14)" cx={50} cy={30} inner={30} count={60} />}
            <p class="label">{v.result === 'victory' ? 'The Fades come apart' : 'The light goes out'}</p>
            <h2>{v.result === 'victory' ? 'Victory' : 'Defeat'}</h2>
            <div class="row wrap gap-s bt-result-stats">
              <span class="chip">
                {ctl.state.stats.turns} {ctl.state.stats.turns === 1 ? 'turn' : 'turns'}
              </span>
              <span class={`chip${ctl.state.stats.breaks > 0 ? ' chip-gold' : ''}`}>
                {ctl.state.stats.breaks === 0 ? 'No breaks' : `${ctl.state.stats.breaks} ${ctl.state.stats.breaks === 1 ? 'break' : 'breaks'}`}
              </span>
              <span class="chip">{ctl.state.stats.maxChain > 1 ? `Chain ×${ctl.state.stats.maxChain}` : 'No chains'}</span>
            </div>
            <button class="btn btn-primary btn-block" onClick={() => onDone({ result: v.result!, battle: ctl.battle })}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import type { Battle, BattleSetup } from '@duskline/core';
import { requireHero } from '@duskline/content';
import { sfx } from '../game/sfx';
import { mutate, settings } from '../game/store';
import { heroUrl, foeUrl } from '../ui/Art';
import { AffinityIcon } from '../ui/Icons';
import { Sky } from '../ui/Sky';
import { ask } from '../ui/Dialog';
import { requireEnemy } from '@duskline/content';
import { skillCost } from '../ui/text';
import { BattleController } from './controller';
import { foeSpot } from './layout';
import { BattleScene } from './scene';
import type { UnitView } from './view';

export interface BattleOutcome {
  result: 'victory' | 'defeat';
  battle: Battle;
}

interface Props {
  setup: BattleSetup;
  seed: string;
  title: string;
  sky?: 'dusk' | 'night' | 'noon';
  onDone: (o: BattleOutcome) => void;
  /** Retreat. When omitted the battle cannot be left. */
  onQuit?: () => void;
  /** Shown above the action bar for the first fights. */
  tip?: string;
  /** What retreating costs, for the confirmation. */
  quitNote?: string;
}

function TurnBar({ ctl }: { ctl: BattleController }): JSX.Element {
  const v = ctl.view.value;
  return (
    <ol class="bt-order" aria-label="Turn order">
      {v.order.slice(0, 7).map((o, i) => {
        const u = v.units.find((x) => x.id === o.unit);
        if (!u) return null;
        const src = u.side === 'party' ? heroUrl(requireHero(u.defId), 'bust') : foeUrl(requireEnemy(u.defId));
        return (
          <li key={`${o.unit}:${i}`} class={`bt-chip ${u.side}${o.current ? ' now' : ''}${o.skip ? ' skip' : ''}`} title={u.name}>
            <img src={src} alt={u.name} draggable={false} />
            {o.skip && <b>zz</b>}
          </li>
        );
      })}
    </ol>
  );
}

function FoePlate({ u, count, targetable, onPick }: { u: UnitView; count: number; targetable: boolean; onPick: () => void }): JSX.Element {
  const spot = foeSpot(u.slot, count, u.tier);
  const hpPct = (u.hp / u.maxHp) * 100;
  return (
    <button
      class={`foe-plate${u.alive ? '' : ' down'}${u.broken ? ' broken' : ''}${targetable ? ' targetable' : ''}`}
      style={{ left: `${(spot.x - spot.col / 2) * 100}%`, width: `${spot.col * 100}%` }}
      disabled={!targetable}
      onClick={onPick}
      aria-label={`${u.name}, ${u.hp} of ${u.maxHp} HP${u.broken ? ', broken' : ''}`}
    >
      <span class="foe-name">{u.name}</span>
      <span class="meter meter-foe">
        <i style={{ width: `${hpPct}%` }} />
      </span>
      <span class="foe-shell" aria-label={`Shell ${u.shell} of ${u.maxShell}`}>
        {u.broken ? (
          <b class="foe-broken">BREAK</b>
        ) : (
          Array.from({ length: u.maxShell }, (_, i) => <i key={i} class={i < u.shell ? 'on' : ''} />)
        )}
      </span>
      <span class="foe-weak">
        {u.weaknesses.map((a) => (
          <AffinityIcon key={a} a={a} size={15} />
        ))}
      </span>
      {u.intent && (
        <span class={`foe-intent${u.intent.heavy ? ' heavy' : ''}`}>
          {u.intent.heavy ? '! ' : '▸ '}
          {u.intent.name}
        </span>
      )}
      {u.hardened && !u.broken && <span class="foe-hard">Hardened</span>}
    </button>
  );
}

function PartyCard({ u, active, targetable, ready, onTap }: { u: UnitView; active: boolean; targetable: boolean; ready: boolean; onTap: () => void }): JSX.Element {
  const hero = requireHero(u.defId);
  const low = u.hp / u.maxHp < 0.3;
  return (
    <button
      class={`pcard${active ? ' active' : ''}${u.alive ? '' : ' down'}${targetable ? ' targetable' : ''}${ready ? ' ready' : ''}`}
      onClick={onTap}
      disabled={!targetable && !ready}
      aria-label={`${u.name}, ${u.hp} of ${u.maxHp} HP${ready ? ', ultimate ready' : ''}`}
    >
      <span class="pcard-top">
        <img src={heroUrl(hero, 'bust')} alt="" draggable={false} />
        <span class="pcard-name">
          <AffinityIcon a={hero.affinity} size={12} />
          {u.name}
        </span>
      </span>
      <span class={`meter meter-hp${low ? ' low' : ''}`}>
        <i style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
      </span>
      <span class="pcard-hp num">
        {Math.ceil(u.hp)}
        <small>/{Math.round(u.maxHp)}</small>
      </span>
      <span class="meter meter-gauge">
        <i style={{ width: `${Math.min(100, u.gauge)}%` }} />
      </span>
      {ready && <span class="pcard-ult">ULT</span>}
    </button>
  );
}

export function BattleScreen({ setup, seed, title, sky = 'dusk', onDone, onQuit, tip, quitNote }: Props): JSX.Element {
  const ctl = useMemo(() => {
    const c = new BattleController(setup, seed);
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
        await document.fonts?.load("24px 'Dela Gothic One'");
      } catch {
        /* the fallback face is fine */
      }
      await scene.init();
      if (dead) return;
      scene.reduced = settings.value.reducedMotion;
      await scene.load(ctl.view.value.units);
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
  const pending = ctl.pending.value;
  const auto = ctl.auto.value;
  const callout = ctl.callout.value;
  const cutin = ctl.cutin.value;
  const actor = v.awaiting ? v.units.find((u) => u.id === v.awaiting!.actor) : undefined;
  const hero = actor ? requireHero(actor.defId) : undefined;
  const canAct = !!actor && !busy && !auto && !v.result;
  const foes = v.units.filter((u) => u.side === 'foe');
  const party = v.units.filter((u) => u.side === 'party');
  const targets = pending ? ctl.targetsFor(pending) : [];
  const legal = canAct ? ctl.battle.legalActions() : [];
  const canGuard = legal.some((a) => a.type === 'guard');

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!canAct) return;
      if (e.key === 'Escape') ctl.cancel();
      if (e.key === '1') ctl.begin({ kind: 'skill', skill: 'basic' });
      if (e.key === '2' && v.canSkill) ctl.begin({ kind: 'skill', skill: 'skill' });
      if (e.key === '3' && canGuard) void ctl.submit({ type: 'guard' });
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
    const ok = await ask({ title: 'Retreat?', body: quitNote ?? 'You will leave this fight and earn nothing from it.', confirm: 'Retreat', cancel: 'Keep fighting', danger: true });
    if (ok) onQuit();
  };

  const tapPlate = (id: string): void => {
    if (pending && targets.includes(id)) ctl.choose(id);
  };

  const passes = v.awaiting?.mode === 'encore' ? v.passTargets.filter((id) => id !== actor?.id) : [];
  const prompt = pending
    ? 'Choose a target'
    : auto
      ? 'Auto-battle'
      : !actor
        ? busy
          ? ''
          : ''
        : v.awaiting!.mode === 'encore'
          ? `${actor.name}: Encore! Act again or pass the baton`
          : v.awaiting!.mode === 'passed'
            ? `${actor.name} takes the baton`
            : `${actor.name}'s turn`;

  return (
    <div class="screen battle">
      <div class="bt-top">
        <h1 class="display bt-title">{title}</h1>
        <button class={`btn btn-small btn-ghost${auto ? ' on' : ''}`} onClick={toggleAuto} aria-pressed={auto} disabled={!!v.result}>
          Auto
        </button>
        <button class={`btn btn-small btn-ghost${ctl.speed.value === 2 ? ' on' : ''}`} onClick={toggleSpeed} aria-pressed={ctl.speed.value === 2}>
          2×
        </button>
        {onQuit && (
          <button class="btn btn-small btn-ghost" onClick={() => void quit()} disabled={!!v.result}>
            Retreat
          </button>
        )}
      </div>
      <TurnBar ctl={ctl} />

      <div class="bt-field">
        <div class="bt-sky">
          <Sky variant={sky} />
        </div>
        <div class="bt-canvas" ref={host} />
        <div class="bt-plates">
          {foes.map((u) => (
            <FoePlate key={u.id} u={u} count={foes.length} targetable={targets.includes(u.id)} onPick={() => tapPlate(u.id)} />
          ))}
        </div>
        {foes
          .filter((u) => targets.includes(u.id))
          .map((u) => {
            const s = foeSpot(u.slot, foes.length, u.tier);
            return (
              <button
                key={u.id}
                class="bt-hit"
                style={{ left: `${(s.x - s.col / 2) * 100}%`, width: `${s.col * 100}%`, top: `${(s.y - s.h) * 100}%`, height: `${s.h * 100}%` }}
                onClick={() => tapPlate(u.id)}
                aria-label={`Target ${u.name}`}
              />
            );
          })}
        {callout && (
          <div key={callout.text + (ctl.speed.value as number)} class={`bt-callout ${callout.tone}`}>
            {callout.text}
          </div>
        )}
        {cutin && (
          <div class={`bt-cutin ${cutin.kind}`}>
            {cutin.unit && <img src={heroUrl(requireHero(cutin.unit), 'half')} alt="" draggable={false} />}
            <div class="bt-cutin-text display">{cutin.title}</div>
          </div>
        )}
        {tip && !v.result && !auto && <p class="bt-tip">{tip}</p>}
      </div>

      <div class="bt-lantern" role="img" aria-label={`Lantern ${v.lantern} of 5`}>
        <span class="label">Lantern</span>
        <span class="bt-pips">
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} class={i < v.lantern ? 'on' : ''} />
          ))}
        </span>
        <span class="bt-prompt">{prompt}</span>
        {pending && (
          <button class="btn btn-small btn-ghost" onClick={() => ctl.cancel()}>
            Back
          </button>
        )}
      </div>

      <div class="bt-party">
        {party.map((u) => (
          <PartyCard
            key={u.id}
            u={u}
            active={u.id === actor?.id && canAct}
            targetable={targets.includes(u.id)}
            ready={canAct && u.alive && u.gauge >= 100 && !pending}
            onTap={() => {
              if (targets.includes(u.id)) ctl.choose(u.id);
              else if (canAct && u.alive && u.gauge >= 100) {
                sfx.tap();
                ctl.begin({ kind: 'ultimate', unit: u.id });
              }
            }}
          />
        ))}
      </div>

      <div class="bt-actions">
        <button class="btn btn-primary" disabled={!canAct || !!pending} onClick={() => ctl.begin({ kind: 'skill', skill: 'basic' })}>
          {hero?.kit.basic.name ?? 'Attack'}
          <span class="sub">+1 ◆</span>
        </button>
        <button class="btn btn-gold" disabled={!canAct || !!pending || !v.canSkill} onClick={() => ctl.begin({ kind: 'skill', skill: 'skill' })}>
          {hero?.kit.skill.name ?? 'Skill'}
          <span class="sub">{hero ? skillCost(hero.kit.skill) : ''}</span>
        </button>
        <button class="btn" disabled={!canAct || !!pending || !canGuard} onClick={() => void ctl.submit({ type: 'guard' })}>
          Guard
        </button>
        {v.burstReady && (
          <button class="btn btn-burst" disabled={!canAct || !!pending} onClick={() => void ctl.submit({ type: 'burst' })}>
            Horizon Burst
          </button>
        )}
        {canAct &&
          !pending &&
          passes.map((id) => {
            const p = v.units.find((x) => x.id === id);
            return (
              <button key={id} class="btn btn-pass" onClick={() => void ctl.submit({ type: 'pass', to: id })}>
                Pass to {p?.name}
              </button>
            );
          })}
      </div>

      {v.result && (
        <div class="overlay center">
          <div class={`sheet bt-result ${v.result}`}>
            <h2 class="display">{v.result === 'victory' ? 'Victory' : 'Defeat'}</h2>
            <p class="muted">{v.result === 'victory' ? 'The Fades scatter, and the light holds.' : 'The party falls. You can try again.'}</p>
            <div class="bt-result-stats row wrap gap-s">
              <span class="chip">{ctl.battle.state.stats.turns} turns</span>
              <span class="chip chip-gold">{ctl.battle.state.stats.breaks} breaks</span>
              <span class="chip">{ctl.battle.state.stats.passes} passes</span>
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


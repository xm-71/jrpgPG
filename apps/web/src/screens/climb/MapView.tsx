import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { mapChoices, moveTo, type ClimbRun, type MapNode, type NodeKind } from '@duskline/core';
import { STRATA, climbDeps, requireEncounter, requireEvent, requireFoe } from '@duskline/content';
import { sfx } from '../../game/sfx';
import { mutate } from '../../game/store';
import { AffinityIcon } from '../../ui/Icons';
import { Sky } from '../../ui/Sky';
import { ClimbHud } from './Hud';

const KIND_NAME: Record<NodeKind, string> = {
  battle: 'Fades',
  elite: 'Elite',
  event: 'Unknown',
  shop: 'Ghost market',
  rest: 'Rest',
  mirror: 'Mirror',
  guardian: 'Guardian',
  boss: 'Boss',
};

const KIND_HELP: Record<NodeKind, string> = {
  battle: 'A fight. Win Embers and a card, maybe one bound from the Fades you beat.',
  elite: 'A hard fight. Better cards, more Embers, and a Glimmer.',
  event: 'Something happens on the stair. Every choice says what it costs.',
  shop: 'Spend Embers on cards, a Glimmer, healing, or having a card removed.',
  rest: 'Heal, or temper a card to make it stronger.',
  mirror: 'The tower shows you how you fight, and offers an Echo: a card made from your habits.',
  guardian: 'The fight that ends the floor. Win a Glimmer and climb higher.',
  boss: 'The keeper of this stratum. Beat it to clear the climb.',
};

/** Node glyphs, drawn in a 24 x 24 box. */
function Glyph({ kind }: { kind: NodeKind }): JSX.Element {
  switch (kind) {
    case 'battle':
      return <path d="M5 19 16 8l1-4-4 1L2 16l3 3ZM19 19 8 8 7 4l4 1 11 11-3 3Z" />;
    case 'elite':
      return <path d="M4 18 6 7l4 5 2-8 2 8 4-5 2 11ZM4 20h16" />;
    case 'event':
      return <path d="M9 8a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.3-1.5 2.4M12 17v.5" />;
    case 'shop':
      return <path d="M12 3 20 12 12 21 4 12Z M12 8l4 4-4 4-4-4Z" />;
    case 'rest':
      return <path d="M12 3c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2.5 1.6-3.4 2.5-5.8.8.8 1.6 1.7 1.7 2.7C12.2 7.4 12.5 5 12 3ZM6 21h12" />;
    case 'mirror':
      return <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />;
    case 'guardian':
      return <path d="M6 21V8l6-5 6 5v13 M10 21v-6h4v6" />;
    case 'boss':
      return <path d="M12 2v4M12 18v4M2 12h4M18 12h4M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z M12 12l3-3" />;
  }
}

const X = [18, 50, 82];
const yOf = (row: number, rows: number): number => 90 - (row / (rows - 1)) * 80;

function NodeDetail({ node }: { node: MapNode }): JSX.Element {
  if (node.encounter) {
    const enc = requireEncounter(node.encounter);
    const foes = [...new Set(enc.foes.map((f) => f.foe))].map(requireFoe);
    const weak = [...new Set(foes.flatMap((f) => f.weaknesses))];
    return (
      <>
        <p class="map-detail-name">{enc.name}</p>
        <p class="muted small">{foes.map((f) => f.name).join(' · ')}</p>
        <p class="row gap-s">
          <span class="label">Weak to</span>
          {weak.map((a) => (
            <AffinityIcon key={a} a={a} size={16} />
          ))}
        </p>
      </>
    );
  }
  if (node.event) return <p class="map-detail-name">{node.kind === 'event' ? 'Something on the stair' : requireEvent(node.event).title}</p>;
  return <p class="map-detail-name">{KIND_NAME[node.kind]}</p>;
}

export function MapView({ run }: { run: ClimbRun }): JSX.Element {
  const map = run.floors[run.floor]!;
  const rows = map.rows.length;
  const choices = mapChoices(run);
  const open = new Set(choices.map((n) => n.id));
  const [picked, setPicked] = useState<string | null>(choices.length === 1 ? choices[0]!.id : null);
  const node = picked ? choices.find((n) => n.id === picked) : undefined;
  const all = map.rows.flat();
  const pos = (n: MapNode): [number, number] => [X[n.col]!, yOf(n.row, rows)];

  return (
    <div class="screen climb-map">
      <Sky variant="tower" />
      <ClimbHud run={run} />
      <div class="map-title">
        <span class="label">{STRATA[run.stratum]!.name}</span>
        <span class="display">Floor {run.floor + 1}</span>
      </div>
      <div class="map" role="group" aria-label="The floor ahead">
        <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {all.flatMap((n) =>
            n.next.map((id) => {
              const m = all.find((x) => x.id === id)!;
              const [x1, y1] = pos(n);
              const [x2, y2] = pos(m);
              const lit = (run.at === n.id || (run.at === null && n.row === 0) || run.visited.includes(n.id)) && (open.has(m.id) || run.visited.includes(m.id));
              const walked = run.visited.includes(n.id) && run.visited.includes(m.id);
              return <line key={`${n.id}-${id}`} x1={x1} y1={y1} x2={x2} y2={y2} class={walked ? 'walked' : lit ? 'lit' : ''} vector-effect="non-scaling-stroke" />;
            }),
          )}
        </svg>
        {all.map((n) => {
          const [x, y] = pos(n);
          const visited = run.visited.includes(n.id);
          const here = run.at === n.id;
          const can = open.has(n.id);
          return (
            <button
              key={n.id}
              class={`map-node k-${n.kind}${visited ? ' visited' : ''}${here ? ' here' : ''}${can ? ' open' : ''}${picked === n.id ? ' picked' : ''}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              disabled={!can}
              onClick={() => {
                sfx.tap();
                setPicked(n.id);
              }}
              aria-label={`${KIND_NAME[n.kind]}${can ? ', you can go here' : ''}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <Glyph kind={n.kind} />
              </svg>
              <span class="map-node-label">{KIND_NAME[n.kind]}</span>
            </button>
          );
        })}
      </div>
      <div class="map-detail panel">
        {node ? (
          <>
            <div class="grow">
              <span class="label">{KIND_NAME[node.kind]}</span>
              <NodeDetail node={node} />
              <p class="muted small">{KIND_HELP[node.kind]}</p>
            </div>
            <button
              class="btn btn-primary"
              onClick={() => {
                sfx.tap();
                mutate((p) => moveTo(p.climb.run!, climbDeps, node.id));
              }}
            >
              Go
            </button>
          </>
        ) : (
          <p class="muted">Choose where to go next. Paths only lead upward.</p>
        )}
      </div>
    </div>
  );
}

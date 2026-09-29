import { KEYWORD_NAME, cardLines, cardStats, type CardDef } from '@duskline/core';
import type { JSX } from 'preact';
import { cardArtUrl } from './Art';
import { AffinityIcon, BladeIcon, ShieldIcon, Stars } from './Icons';

export interface CardFaceProps {
  def: CardDef;
  up?: boolean;
  size?: 'hand' | 'list' | 'big';
  /** Dimmed: cannot be played right now. */
  dim?: boolean;
  selected?: boolean;
  /** Ward it will give if held, shown on hand cards. */
  holdWard?: number | null;
  onClick?: () => void;
  label?: string;
}

const KIND_LABEL: Record<CardDef['kind'], string> = { strike: 'Strike', guard: 'Guard', balanced: 'Balanced', rite: 'Rite', curse: 'Curse' };

/** A card, drawn as a talisman: cost seal, name in Mincho, sigil art, rules, strike and ward. */
export function CardFace({ def, up = false, size = 'hand', dim = false, selected = false, holdWard = null, onClick, label }: CardFaceProps): JSX.Element {
  const st = cardStats(def, up);
  const lines = cardLines(def, up);
  const Tag = onClick ? 'button' : 'div';
  const unplayable = st.keywords.includes('unplayable');
  // Echo names can run to "Noonward Cut of the Ninth Hour": step the type down rather than clip it.
  const long = def.name.length > 20 ? ' name-xlong' : def.name.length > 12 ? ' name-long' : '';
  return (
    <Tag
      class={`cardf size-${size} kind-${def.kind} tier-${def.tier}${def.affinity ? ` aff-${def.affinity}` : ' aff-none'}${dim ? ' dim' : ''}${selected ? ' selected' : ''}${up ? ' up' : ''}${long}`}
      onClick={onClick}
      aria-label={label ?? `${def.name}${up ? ' tempered' : ''}. Costs ${st.cost}. ${lines.join(' ')}`}
      aria-pressed={onClick ? selected : undefined}
      type={onClick ? 'button' : undefined}
    >
      <span class="cardf-top">
        {!unplayable && <span class="cardf-cost">{st.cost}</span>}
        <span class="cardf-name">
          {def.name}
          {up && <b class="cardf-plus">+</b>}
        </span>
        {def.affinity && <AffinityIcon a={def.affinity} size={size === 'hand' ? 13 : 15} />}
      </span>
      <span class="cardf-art">
        <img src={cardArtUrl(def)} alt="" draggable={false} />
        {def.stars && size !== 'hand' && (
          <span class="cardf-stars">
            <Stars n={def.stars} />
          </span>
        )}
      </span>
      <span class="cardf-kind">
        {KIND_LABEL[def.kind]}
        {st.keywords.length > 0 && <em> · {st.keywords.map((k) => KEYWORD_NAME[k]).join(', ')}</em>}
      </span>
      <span class="cardf-text">{unplayable ? 'Cannot be played. Thrown away at the end of the turn.' : lines.join(' ')}</span>
      <span class="cardf-stats">
        {st.atk > 0 && def.target !== 'self' ? (
          <span class="cardf-atk" title="Damage when played">
            <BladeIcon size={12} />
            {st.atk}
            {st.hits > 1 && <small>×{st.hits}</small>}
          </span>
        ) : (
          <span />
        )}
        {!unplayable && (
          <span class="cardf-ward" title="Ward if you hold it">
            <ShieldIcon size={12} />
            {holdWard ?? st.ward}
          </span>
        )}
      </span>
    </Tag>
  );
}

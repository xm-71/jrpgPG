import type { JSX } from 'preact';
import { finished } from '../../game/flow';
import { go } from '../../game/nav';
import { profile } from '../../game/store';
import { Fight } from './Fight';
import { MapView } from './MapView';
import { GlimmerView, MirrorView, PickView, RewardView } from './Offers';
import { EventView, RestView, ShopView } from './Places';
import { Results } from './Results';

/** The climb in progress: one screen per phase of the run. */
export function Climb(): JSX.Element {
  const run = profile.value.climb.run ?? finished.value;
  if (!run) {
    queueMicrotask(() => go({ name: 'home' }, { replace: true }));
    return <div class="screen" />;
  }
  switch (run.phase) {
    case 'glimmer':
      return <GlimmerView run={run} />;
    case 'map':
      return <MapView key={`${run.floor}:${run.at}`} run={run} />;
    case 'battle':
      return <Fight run={run} />;
    case 'reward':
      return <RewardView run={run} />;
    case 'event':
      return <EventView run={run} />;
    case 'shop':
      return <ShopView run={run} />;
    case 'rest':
      return <RestView run={run} />;
    case 'mirror':
      return <MirrorView run={run} />;
    case 'pick':
      return <PickView run={run} />;
    case 'done':
      return <Results run={run} />;
  }
}

import '@fontsource/shippori-mincho-b1/latin-600.css';
import '@fontsource/shippori-mincho-b1/latin-800.css';
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/zen-kaku-gothic-new/latin-400.css';
import '@fontsource/zen-kaku-gothic-new/latin-500.css';
import '@fontsource/zen-kaku-gothic-new/latin-700.css';
import './styles/theme.css';
import './styles/ui.css';
import './styles/screens.css';
import './styles/cards.css';
import './styles/battle.css';
import './styles/climb.css';
import './styles/story.css';

import { render } from 'preact';
import { expireBanners } from '@duskline/core';
import { activeBanners } from '@duskline/content';
import { App } from './App';
import { cycleOverride, now } from './game/clock';
import { startNavigation } from './game/nav';
import { startOffline } from './game/offline';
import { mutate, profile, toast } from './game/store';

// When a rate-up banner ends, leftover spark points turn into Gloam.
const cycle = activeBanners(now(), cycleOverride).cycle;
if (profile.value.lastCycle < cycle) {
  const refunded = mutate((p) => expireBanners(p, cycle, now()));
  if (refunded > 0) toast(`A banner ended. ${refunded} Gloam came back from unused spark points.`, 'good', 6000);
}

startNavigation({ name: 'title' });
render(<App />, document.getElementById('app')!);
startOffline();

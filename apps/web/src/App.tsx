import { useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import { screen } from './game/nav';
import { profile } from './game/store';
import { Descent } from './screens/Descent';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Kindling } from './screens/Kindling';
import { Odds } from './screens/Odds';
import { Roster } from './screens/Roster';
import { Settings } from './screens/Settings';
import { Stage } from './screens/Stage';
import { Story } from './screens/Story';
import { Title } from './screens/Title';
import { DialogHost } from './ui/Dialog';
import { Toasts } from './ui/Toasts';

function applySettings(): void {
  const s = profile.value.settings;
  const root = document.documentElement;
  root.style.setProperty('--text-scale', String(s.textScale));
  if (s.reducedMotion) root.dataset['motion'] = 'reduced';
  else delete root.dataset['motion'];
}

export function App(): JSX.Element {
  const s = screen.value;
  const settings = profile.value.settings;
  useEffect(applySettings, [settings.textScale, settings.reducedMotion]);

  let view: JSX.Element;
  switch (s.name) {
    case 'title':
      view = <Title />;
      break;
    case 'home':
      view = <Home />;
      break;
    case 'roster':
      view = <Roster hero={s.hero} />;
      break;
    case 'kindling':
      view = <Kindling />;
      break;
    case 'odds':
      view = <Odds bannerId={s.banner} />;
      break;
    case 'history':
      view = <History />;
      break;
    case 'descent':
      view = <Descent />;
      break;
    case 'story':
      view = <Story />;
      break;
    case 'stage':
      view = <Stage key={s.id} id={s.id} />;
      break;
    case 'settings':
      view = <Settings />;
      break;
  }
  return (
    <div class="stage">
      {view}
      <Toasts />
      <DialogHost />
    </div>
  );
}

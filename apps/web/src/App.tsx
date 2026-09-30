import { useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import { screen } from './game/nav';
import { profile } from './game/store';
import { Chronicle } from './screens/Chronicle';
import { Climb } from './screens/climb/Climb';
import { ClimbNew } from './screens/ClimbNew';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Kindling } from './screens/Kindling';
import { Odds } from './screens/Odds';
import { Roster } from './screens/Roster';
import { Scene } from './screens/Scene';
import { Settings } from './screens/Settings';
import { Title } from './screens/Title';
import { Coach } from './tutorial/Coach';
import { Guide, HelpHost } from './tutorial/Guide';
import { DialogHost } from './ui/Dialog';
import { Toasts } from './ui/Toasts';
import { TurnUpright } from './ui/TurnUpright';

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
    case 'scene':
      view = <Scene />;
      break;
    case 'climb':
      view = <Climb />;
      break;
    case 'climb-new':
      view = <ClimbNew key={String(s.daily)} daily={s.daily === true} />;
      break;
    case 'chronicle':
      view = <Chronicle />;
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
    case 'roster':
      view = <Roster {...(s.hero ? { hero: s.hero } : {})} />;
      break;
    case 'settings':
      view = <Settings />;
      break;
    case 'guide':
      view = <Guide {...(s.section ? { section: s.section } : {})} />;
      break;
  }
  return (
    <div class="stage">
      {view}
      <Coach />
      <HelpHost />
      <Toasts />
      <DialogHost />
      <TurnUpright />
    </div>
  );
}

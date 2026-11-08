import { Button, Cuadros, Icon, Screen, type IconName } from '../components';
import { t } from '../i18n/es';
import './Screens.css';


export interface WelcomeProps {
  onStart: () => void;
  onSettings: () => void;
  onAbout: () => void;
}

export function Welcome({ onStart, onSettings, onAbout }: WelcomeProps) {
  return (
    <Screen
      header={<span />}
      footer={
        <>
          <Button variant="primary" size="lg" fullWidth icon="search" onClick={onStart}>{t.welcome.start}</Button>
          <div class="rp-links">
            <button type="button" class="rp-link" onClick={onSettings}>{t.welcome.settings}</button>
            <span aria-hidden="true">·</span>
            <button type="button" class="rp-link" onClick={onAbout}>{t.welcome.about}</button>
          </div>
        </>
      }
    >
      <div class="rp-welcome">
        <Cuadros variant="full" size={136} />
        <div class="rp-welcome__head">
          <h1 class="rp-welcome__title">{t.welcome.title}</h1>
          <p class="rp-welcome__tag">{t.tagline}</p>
        </div>
        <ul class="rp-welcome__list">
          {((typeof __AI__ === 'undefined' || __AI__) ? t.welcome.lines : t.welcome.linesLocal).map((l) => (
            <li key={l.icon} class="rp-welcome__item">
              <span class="rp-welcome__icon"><Icon name={l.icon as IconName} size={18} /></span>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  );
}

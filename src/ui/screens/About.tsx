import { AUTHOR } from '../../shared/constants';
import { Cuadros, Header, Icon, Screen } from '../components';
import { t } from '../i18n/es';
import './Screens.css';

export interface AboutProps {
  version: string;
  onBack: () => void;
}

export function About({ version, onBack }: AboutProps) {
  return (
    <Screen header={<Header title={t.about.title} onBack={onBack} />}>
      <div class="rp-about">
        <Cuadros variant="full" size={120} />
        <h2 class="rp-about__name">{t.appName}</h2>
        <p class="rp-hint">{t.tagline}</p>
        <dl class="rp-about__meta">
          <div><dt>{t.about.version}</dt><dd>{version}</dd></div>
          <div>
            <dt>{t.about.author}</dt>
            <dd>
              {AUTHOR.name} · <a href={AUTHOR.url} target="_blank" rel="noopener noreferrer">{t.about.site} <Icon name="external" size={12} /></a>
            </dd>
          </div>
        </dl>
        <section class="rp-card">
          <h3 class="rp-card__title">{t.about.brandTitle}</h3>
          <p class="rp-hint">{t.about.brandText}</p>
        </section>
        <p class="rp-hint">{t.about.lab}</p>
        <p class="rp-hint">{t.about.madeWith}</p>
        <a class="rp-link" href={`${AUTHOR.url}/laboratorio/repaso/privacidad`} target="_blank" rel="noopener noreferrer">{t.about.privacy} <Icon name="external" size={12} /></a>
      </div>
    </Screen>
  );
}

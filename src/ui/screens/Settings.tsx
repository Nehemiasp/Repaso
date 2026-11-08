import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { CATEGORY_LABEL, RULE_LABEL, t } from '../i18n/es';
import { RULES } from '../../engine/registry';
import { Button, Field, Header, Icon, NumberField, Notice, Screen, Segmented, Select, Switch, type IconName } from '../components';
import type { ContrastLevel, RuleId, Settings as SettingsT, Tone } from '../../shared/types';
import './Screens.css';

export const MODELS = [
  { value: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 · económico (predeterminado)' },
  { value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 · equilibrado' },
  { value: 'claude-opus-5-5', label: 'Claude Opus 5.5 · el más capaz y caro' },
];

export interface KeyCheckState {
  status: 'idle' | 'checking' | 'ok' | 'error';
  message?: string;
}

export interface SettingsProps {
  settings: SettingsT;
  onChange: (s: SettingsT) => void;
  hasKey: boolean;
  keyHint?: string;
  keyCheck: KeyCheckState;
  ignoredCount: number;
  /** Mostrar «Guardado» tras un cambio. */
  saved: boolean;
  onSaveKey: (key: string) => void;
  onClearKey: () => void;
  onCheckKey: (key?: string) => void;
  onClearIgnored: () => void;
  onBack: () => void;
  onAbout: () => void;
}

function Section({ title, help, children, id }: { title: string; help?: string; children: ComponentChildren; id: string }) {
  return (
    <section class="rp-section" aria-labelledby={id}>
      <h2 class="rp-section__title" id={id}>{title}</h2>
      {help && <p class="rp-hint">{help}</p>}
      <div class="rp-section__body">{children}</div>
    </section>
  );
}

export function Settings(p: SettingsProps) {
  const { settings: s } = p;
  const set = <K extends keyof SettingsT>(k: K, v: SettingsT[K]) => p.onChange({ ...s, [k]: v });
  const [key, setKey] = useState('');
  const keyLooksOk = /^sk-ant-/.test(key.trim());
  const keyError = key && !keyLooksOk ? 'Las claves de Anthropic empiezan con «sk-ant-».' : undefined;
  return (
    <Screen
      header={
        <Header
          title={t.settings.title}
          onBack={p.onBack}
          actions={p.saved ? <span class="rp-saved" role="status"><Icon name="check" size={14} /> {t.settings.saved}</span> : undefined}
        />
      }
    >
      <div class="rp-settings">
        <Section id="s-rules" title={t.settings.rules} help={t.settings.rulesHelp}>
          <ul class="rp-rules">
            {RULES.map((r) => (
              <li key={r.id}>
                <Switch
                  label={RULE_LABEL[r.id].name}
                  description={`${CATEGORY_LABEL[r.category]} · ${RULE_LABEL[r.id].description}`}
                  checked={s.rules[r.id] !== false}
                  onChange={(on) => set('rules', { ...s.rules, [r.id as RuleId]: on })}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section id="s-thr" title={t.settings.thresholds}>
          <Segmented<ContrastLevel>
            label={t.settings.contrast}
            value={s.contrastLevel}
            onChange={(v) => set('contrastLevel', v)}
            options={[{ value: 'AA', label: 'AA' }, { value: 'AAA', label: 'AAA' }]}
          />
          <p class="rp-hint">{t.settings.contrastHelp}</p>
          <div class="rp-grid2">
            <NumberField label={t.settings.minText} value={s.minTextSize} min={8} max={24} unit={t.settings.px} onChange={(v) => set('minTextSize', v)} />
            <NumberField label={t.settings.minTouch} value={s.minTouchTarget} min={24} max={64} unit={t.settings.px} onChange={(v) => set('minTouchTarget', v)} />
          </div>
          <Segmented<'4' | '8'>
            label={t.settings.grid}
            value={String(s.spacingGrid) as '4' | '8'}
            onChange={(v) => set('spacingGrid', Number(v))}
            options={[{ value: '4', label: '4 px' }, { value: '8', label: '8 px' }]}
          />
          <p class="rp-hint">{t.settings.gridHelp}</p>
          <NumberField label={t.settings.tolerance} value={s.colorTolerance} min={1} max={10} step={0.5} hint={t.settings.toleranceHelp} onChange={(v) => set('colorTolerance', v)} />
          <Switch label={t.settings.hidden} checked={!s.ignoreHidden} onChange={(on) => set('ignoreHidden', !on)} />
        </Section>

        <Section id="s-tone" title={t.settings.tone} help={t.settings.toneHelp}>
          <Segmented<Tone>
            label={t.settings.tone}
            hideLabel
            value={s.tone}
            onChange={(v) => set('tone', v)}
            options={[{ value: 'usted', label: t.settings.usted }, { value: 'tu', label: t.settings.tu }]}
          />
        </Section>

        <Section id="s-ai" title={t.settings.ai}>
          <Switch label={t.settings.aiUse} description={t.settings.aiUseHelp} checked={s.aiEnabled} onChange={(on) => set('aiEnabled', on)} />
          <div class="rp-key">
            {p.hasKey ? <p class="rp-hint rp-key__saved"><Icon name="lock" size={14} /> {t.settings.keySaved(p.keyHint ?? '')}</p> : <p class="rp-hint">{t.settings.keyNone}</p>}
            <Field
              label={t.settings.key}
              value={key}
              onInput={setKey}
              type="password"
              reveal
              mono
              placeholder={t.settings.keyPlaceholder}
              error={keyError}
              hint={p.hasKey ? 'Pegue una nueva para reemplazarla.' : undefined}
            />
            <div class="rp-key__buttons">
              <Button variant="primary" size="sm" disabled={!keyLooksOk} onClick={() => { p.onSaveKey(key.trim()); setKey(''); }}>{t.settings.keySave}</Button>
              <Button size="sm" loading={p.keyCheck.status === 'checking'} disabled={!p.hasKey && !keyLooksOk} onClick={() => p.onCheckKey(keyLooksOk ? key.trim() : undefined)}>
                {p.keyCheck.status === 'checking' ? t.settings.keyChecking : t.settings.keyCheck}
              </Button>
              {p.hasKey && <Button size="sm" variant="danger" onClick={p.onClearKey}>{t.settings.keyRemove}</Button>}
            </div>
            {p.keyCheck.status === 'ok' && <Notice tone="success">{t.settings.keyOk}</Notice>}
            {p.keyCheck.status === 'error' && <Notice tone="error">{p.keyCheck.message}</Notice>}
            <a class="rp-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">{t.settings.keyGet} <Icon name="external" size={12} /></a>
          </div>
          <Select label={t.settings.model} hint={t.settings.modelHelp} value={s.model} options={MODELS} onChange={(v) => set('model', v)} />
          <NumberField label={t.settings.budget} value={s.aiBudgetUsd} min={0.05} max={5} step={0.05} unit={t.settings.usd} hint={t.settings.budgetHelp} onChange={(v) => set('aiBudgetUsd', v)} />
        </Section>

        <Section id="s-priv" title={t.settings.privacy}>
          <div class="rp-privacy">
            <p class="rp-privacy__title">{t.settings.privacyTitle}</p>
            <ul class="rp-privacy__list">
              {t.settings.privacyItems.map((i) => (
                <li key={i.title} class="rp-privacy__item">
                  <span class="rp-privacy__icon"><Icon name={i.icon as IconName} size={16} /></span>
                  <span><strong>{i.title}.</strong> {i.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <div class="rp-settings__foot">
          <Button variant="secondary" onClick={() => p.onChange({ ...DEFAULT_SETTINGS, aiEnabled: s.aiEnabled, model: s.model })}>{t.settings.resetDefaults}</Button>
          {p.ignoredCount > 0 && <Button variant="secondary" onClick={p.onClearIgnored}>{t.settings.clearIgnored(p.ignoredCount)}</Button>}
          <Button variant="ghost" iconRight="chevron-right" onClick={p.onAbout}>{t.settings.about}</Button>
        </div>
      </div>
    </Screen>
  );
}

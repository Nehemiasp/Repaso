import { useId, useRef } from 'preact/hooks';
import './Tabs.css';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}

/** Pestañas con flechas, Inicio y Fin. Las que no tienen hallazgos se atenúan pero siguen disponibles. */
export function Tabs({ tabs, value, onChange, ariaLabel }: TabsProps) {
  const base = useId();
  const list = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const tab = tabs[(i + tabs.length) % tabs.length]!;
    onChange(tab.id);
    requestAnimationFrame(() => {
      const el = document.getElementById(`${base}-${tab.id}`);
      el?.focus();
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  };
  return (
    <div class="rp-tabs" role="tablist" aria-label={ariaLabel} ref={list}>
      {tabs.map((tab, i) => {
        const on = tab.id === value;
        return (
          <button
            key={tab.id}
            id={`${base}-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            class={`rp-tab ${on ? 'is-on' : ''} ${tab.count === 0 ? 'is-empty' : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
              else if (e.key === 'Home') { e.preventDefault(); go(0); }
              else if (e.key === 'End') { e.preventDefault(); go(tabs.length - 1); }
            }}
          >
            {tab.label}
            {tab.count !== undefined && <span class="rp-tab__count">{tab.count.toLocaleString('es')}</span>}
          </button>
        );
      })}
    </div>
  );
}

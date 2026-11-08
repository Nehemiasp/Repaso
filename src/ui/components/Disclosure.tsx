import type { ComponentChildren } from 'preact';
import { useId, useState } from 'preact/hooks';
import { Icon } from './Icon';
import './Disclosure.css';

export interface DisclosureProps {
  summary: string;
  children: ComponentChildren;
  defaultOpen?: boolean;
}

export function Disclosure({ summary, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div class="rp-disc">
      <button type="button" class="rp-disc__btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
        {summary}
      </button>
      {open && <div id={id} class="rp-disc__body">{children}</div>}
    </div>
  );
}

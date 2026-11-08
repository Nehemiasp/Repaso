import { render } from 'preact';
import type { ToPlugin, ToUi } from '../shared/messages';
import { App, type Bridge } from './App';
import './styles/base.css';
import './styles/app.css';

/** Puente real: mensajes con el hilo principal del plugin vía postMessage. */
const bridge: Bridge = {
  send: (msg: ToPlugin) => parent.postMessage({ pluginMessage: msg }, '*'),
  listen: (handler) => {
    const on = (e: MessageEvent) => {
      const m = e.data?.pluginMessage as ToUi | undefined;
      if (m) handler(m);
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  },
};

render(<App bridge={bridge} />, document.getElementById('app')!);

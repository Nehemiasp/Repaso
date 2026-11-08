import { render } from 'preact';
import './styles/base.css';

function Hola() {
  return (
    <main>
      <h1>Hola</h1>
      <p>Repaso está cargado.</p>
      <button onClick={() => parent.postMessage({ pluginMessage: { type: 'cerrar' } }, '*')}>
        Cerrar
      </button>
    </main>
  );
}

render(<Hola />, document.getElementById('app')!);

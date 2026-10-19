import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupZoomLock } from './utils/zoomLock';
import { ErrorBoundary } from './components/ErrorBoundary';

// Inicializa e trava o zoom do sistema em 80% de forma segura
try {
  setupZoomLock();
} catch (e) {
  console.warn('Zoom lock init bypassed:', e);
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

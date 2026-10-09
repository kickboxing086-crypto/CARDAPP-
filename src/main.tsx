import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupZoomLock } from './utils/zoomLock';

// Inicializa e trava o zoom do sistema em 80%
setupZoomLock();

createRoot(document.getElementById('root')!).render(<App />);

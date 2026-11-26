import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupZoomLock } from './utils/zoomLock';
import { ErrorBoundary } from './components/ErrorBoundary';

// Inicializa e trava o zoom do sistema em proporção adequada de forma segura
try {
  setupZoomLock();
} catch (e) {
  console.warn('Zoom lock init bypassed:', e);
}

function renderFatalBootstrapRecovery(errorMessage: string) {
  const root = document.getElementById('root');
  if (!root) return;
  // Se o aplicativo já montou, deixa o ErrorBoundary do React cuidar
  if (root.querySelector('.cardapp-rendered-app')) return;

  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #FFFDF7; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif; color: #0F172A; padding: 20px; text-align: center;">
      <div style="max-width: 440px; width: 100%; background: #ffffff; border-radius: 28px; padding: 28px 24px; box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.1); border: 2px solid #FCD34D;">
        <div style="width: 60px; height: 60px; border-radius: 20px; background: #F59E0B; color: #0F172A; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-weight: 900; font-size: 26px; box-shadow: 0 8px 20px -4px rgba(245, 158, 11, 0.4);">
          !
        </div>
        <h2 style="font-size: 20px; font-weight: 900; margin: 0 0 6px; letter-spacing: -0.5px;">CARDAPP DIGITAL</h2>
        <p style="font-size: 13px; color: #64748B; margin: 0 0 16px; line-height: 1.5;">Ocorreu uma pequena instabilidade ao carregar a aplicação no seu dispositivo.</p>
        <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 14px; padding: 12px; margin-bottom: 20px; text-align: left; font-size: 11px; color: #92400E; font-family: monospace; word-break: break-word;">
          ${errorMessage || 'Erro inesperado de inicialização de módulos.'}
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button onclick="window.location.reload()" style="background: #F59E0B; color: #0F172A; border: none; padding: 13px 20px; border-radius: 14px; font-weight: 900; font-size: 12px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 6px 14px rgba(245, 158, 11, 0.35);">Recarregar Sistema</button>
          <button onclick="try{sessionStorage.clear();localStorage.removeItem('cardapp_last_view');localStorage.removeItem('cardapp_ceo_open');localStorage.removeItem('cardapp_superadmin_open');localStorage.removeItem('cardapp_current_view');}catch(e){}window.location.href='/?view=cliente'" style="background: #F8FAFC; color: #334155; border: 1px solid #CBD5E1; padding: 13px 20px; border-radius: 14px; font-weight: 800; font-size: 12px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;">Abrir Cardápio Direto</button>
        </div>
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('Captured window bootstrap error:', e.error || e.message);
    const root = document.getElementById('root');
    if (root && (!root.children.length || root.querySelector('#initial-loader'))) {
      renderFatalBootstrapRecovery(e.error?.message || e.message || 'Falha ao executar scripts');
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.warn('Unhandled promise rejection caught:', e.reason);
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err: any) {
    console.error('Fatal createRoot mount error:', err);
    renderFatalBootstrapRecovery(err?.message || 'Falha na inicialização da renderização');
  }
}


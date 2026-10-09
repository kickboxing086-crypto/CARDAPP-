/**
 * Mantém o zoom do aplicativo proporcional (100% / 1.0),
 * evitando distorções desproporcionais e garantindo layout perfeito e nítido.
 */
export function setupZoomLock(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  // Garante escala 100% proporcional e natural, sem zoom artificial que quebre proporções
  try {
    document.documentElement.style.removeProperty('zoom');
    (document.documentElement.style as unknown as { zoom: string }).zoom = '1';
  } catch {
    // fallback
  }

  // 1. Bloqueia zoom via Scroll com tecla Ctrl ou Cmd pressionada (Ctrl + Mouse Wheel)
  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 2. Bloqueia atalhos de zoom do teclado (Ctrl/Cmd +, -, =, _, 0 e teclado numérico)
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key;
        if (
          key === '+' ||
          key === '-' ||
          key === '=' ||
          key === '_' ||
          key === '0' ||
          e.code === 'NumpadAdd' ||
          e.code === 'NumpadSubtract'
        ) {
          e.preventDefault();
        }
      }
    },
    { capture: true }
  );

  // 3. Bloqueia gesto de pinça para zoom em telas touch (pinch to zoom)
  window.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 4. Bloqueia eventos de gestos nativos do Safari / iOS
  window.addEventListener('gesturestart', (e: Event) => e.preventDefault());
  window.addEventListener('gesturechange', (e: Event) => e.preventDefault());
  window.addEventListener('gestureend', (e: Event) => e.preventDefault());

  // 5. Bloqueia duplo toque para dar zoom (double-tap to zoom)
  let lastTouchEnd = 0;
  window.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement | null;
        if (target && !target.closest('input, textarea, select, [contenteditable="true"]')) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

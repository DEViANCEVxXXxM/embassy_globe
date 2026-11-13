import { initMetrika, markInteracted, track } from './utils.js';
import { initGlobe } from './globe.js';
import { setGlobeController, openPlace, openSheet, closeAll } from './panel.js';
import { initUI, restoreFromHash } from './ui.js';
import { initCart } from './cart.js';

initMetrika();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      if (location.search.includes('debug')) console.warn('[SW] Ошибка регистрации:', err);
    });
  });
}

(function injectManifest() {
  try {
    const origin = location.origin;
    const startPath = location.pathname + (location.search || '');
    const manifest = {
      name: 'Burger Embassy',
      short_name: 'BE',
      description: 'Паспорт вкусов — бургеры из 15 стран',
      start_url: origin + startPath,
      scope: origin + '/',
      display: 'standalone',
      background_color: '#100d0a',
      theme_color: '#f5a623',
      icons: [{ src: origin + '/favicon.ico', sizes: '192x192 512x512', type: 'image/x-icon', purpose: 'any' }]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
  } catch (_) {}
})();

(async () => {
  const globe = await initGlobe({ onMarkerClick: openPlace });
  if (globe.hasWebGL) {
    setGlobeController({
      moveCamera: globe.moveCameraTo,
      highlightCountry: globe.highlightCountry
    });
  } else {
    setTimeout(() => openSheet(), 400);
  }
  
  initUI();
  initCart();
  restoreFromHash();
  
  setTimeout(() => markInteracted(), 6500);
  
  if (location.search.includes('debug')) {
    console.log('[app] старт завершён', { hasWebGL: globe.hasWebGL, hash: location.hash || '(пусто)' });
  }
})().catch(err => {
  console.error('[app] критическая ошибка при старте:', err);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = '<div style="font-size:11px;max-width:220px;text-align:center;line-height:1.5;color:#908880">Не удалось загрузить 3D-глобус.<br>Открываем список заведений…</div>';
    setTimeout(() => loading.classList.add('hide'), 1800);
  }
  try {
    const sheet = document.getElementById('sheet');
    if (sheet && !sheet.classList.contains('open')) {
      setTimeout(() => openSheet(), 600);
    }
  } catch (_) {}
  track('app_init_error', { message: String(err && err.message || err) });
});
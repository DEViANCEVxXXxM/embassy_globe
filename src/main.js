/* =========================================================
   MAIN — точка входа.
   ========================================================= */

window.__METRIKA_ID__ = null;   /* ← вставь сюда номер счётчика Яндекс.Метрики */

import { initMetrika, markInteracted } from './utils.js';
import { initGlobe } from './globe.js';
import {
  setGlobeController, openPlace, openSheet, closePanel, closeModal, closeSheet
} from './panel.js';
import { initUI, restoreFromHash } from './ui.js';

initMetrika();

/* PWA manifest — генерируем blob с абсолютными URL */
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
      icons: [
        { src: origin + '/favicon.ico', sizes: '192x192 512x512', type: 'image/x-icon', purpose: 'any' }
      ]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = URL.createObjectURL(blob);
    document.head.appendChild(link);
  } catch(_) {}
})();

/* Старт */
(async () => {
  const globe = await initGlobe({ onMarkerClick: openPlace });

  if (globe.hasWebGL) {
    setGlobeController({
      moveCamera: globe.moveCameraTo,
      highlightCountry: globe.highlightCountry
    });
  } else {
    /* Fallback: сразу показываем sheet */
    setTimeout(() => openSheet(), 400);
  }

  initUI();
  restoreFromHash();

  setTimeout(() => markInteracted(), 6500);
})();
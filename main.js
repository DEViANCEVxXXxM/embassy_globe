/* =========================================================
   MAIN — точка входа приложения.
   Импортирует все модули, связывает глобус с панелью,
   запускает роутинг и PWA-манифест.

   ВАЖНО: не добавляй сюда никаких данных — они в data.js.
   Для добавления блюд/филиалов правь только data.js.
   ========================================================= */

/* ---------------------------------------------------------
   МЕТРИКА
   ---------------------------------------------------------
   ID счётчика Яндекс.Метрики задаётся в index.html:
     <script>window.__METRIKA_ID__ = 12345678;</script>
   Пока там null — initMetrika() ничего не грузит,
   сайт работает как обычно.

   Здесь специально НЕТ перезаписи window.__METRIKA_ID__,
   потому что data.js уже прочитал это значение при импорте
   (ES-модули исполняются до тела main.js).
   --------------------------------------------------------- */

import { initMetrika, markInteracted, track } from './utils.js';
import { initGlobe } from './globe.js';
import {
  setGlobeController,
  openPlace,
  openSheet,
  closeAll
} from './panel.js';
import { initUI, restoreFromHash } from './ui.js';

/* ---------------------------------------------------------
   АНАЛИТИКА — запускается до всего остального,
   чтобы поймать первые pageview и события.
   --------------------------------------------------------- */
initMetrika();

/* ---------------------------------------------------------
   PWA МАНИФЕСТ — генерируем blob с абсолютными URL,
   чтобы start_url и scope были корректны и при file://,
   и при деплое в подпапку (GitHub Pages).
   --------------------------------------------------------- */
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
        {
          src: origin + '/favicon.ico',
          sizes: '192x192 512x512',
          type: 'image/x-icon',
          purpose: 'any'
        }
      ]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
  } catch (_) { /* manifest не критичен */ }
})();

/* ---------------------------------------------------------
   СТАРТ ПРИЛОЖЕНИЯ
   --------------------------------------------------------- */
(async () => {
  /* 1. Инициализация глобуса.
        initGlobe() может вернуться синхронно (без WebGL) —
        это значит, что нужно сразу открыть sheet-фоллбэк.
        Если WebGL доступен — запускает анимацию и возвращает
        контроллеры камеры и подсветки. */
  const globe = await initGlobe({ onMarkerClick: openPlace });

  if (globe.hasWebGL) {
    /* Связываем панель с глобусом: панель при открытии
       будет вызывать moveCamera / highlightCountry */
    setGlobeController({
      moveCamera: globe.moveCameraTo,
      highlightCountry: globe.highlightCountry
    });
  } else {
    /* WebGL недоступен — открываем sheet как единственную навигацию */
    setTimeout(() => openSheet(), 400);
  }

  /* 2. Инициализация UI: чипы стран, дропдаун филиала, промо. */
  initUI();

  /* 3. Восстановление состояния из URL:
        #/newyork?branch=sadik — откроет New York у филиала sadik.
        Пустой хеш — ничего не открываем. */
  restoreFromHash();

  /* 4. Автоскрытие подсказки «Потяните глобус» через 6.5 с,
        если пользователь так и не тронул глобус. */
  setTimeout(() => markInteracted(), 6500);

  /* 5. Диагностика в ?debug-режиме */
  if (location.search.includes('debug')) {
    console.log('[app] старт завершён', {
      hasWebGL: globe.hasWebGL,
      hash: location.hash || '(пусто)',
      ua: navigator.userAgent.slice(0, 80)
    });
  }
})().catch(err => {
  /* Глобальный перехват: если старт упал (например, three.js не загрузился
     с unpkg из-за сети или CSP), показываем пользователю понятное состояние. */
  console.error('[app] критическая ошибка при старте:', err);

  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = '<div style="font-size:11px;max-width:220px;text-align:center;line-height:1.5;color:#908880">Не удалось загрузить 3D-глобус.<br>Открываем список заведений…</div>';
    setTimeout(() => loading.classList.add('hide'), 1800);
  }

  /* Fallback: открываем sheet, если он ещё не открыт */
  try {
    const sheet = document.getElementById('sheet');
    if (sheet && !sheet.classList.contains('open')) {
      setTimeout(() => openSheet(), 600);
    }
  } catch (_) {}

  track('app_init_error', { message: String(err && err.message || err) });
});
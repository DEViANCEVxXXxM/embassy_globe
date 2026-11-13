import { branches, places, countries, PROMO_KEY, PROMO_TEXT } from './data.js';
import { branchState, setBranch, setOpenOnly } from './state.js';
import { $, escapeHtml, flagIcon, showToast, track, isBranchOpen, requestGeolocation, findNearestBranch, distanceKm, getOrderUrl } from './utils.js';
import { openPlace, openCountry, closeAll, closePanel, closeModal, closeSheet, openSheet, focusPanelSearch, focusSheetSearch, panel, modal, sheet } from './panel.js';
import { openMapPicker, initMapPicker } from './map-picker.js'; // <--- Импорт

const chipsEl = $('chips'), chipsPrev = $('chipsPrev'), chipsNext = $('chipsNext');

function buildChips() {
  chipsEl.innerHTML = '';
  countries.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.iso = c.iso;
    b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', `${c.country} — ${c.count} позиций`); b.setAttribute('title', `${c.country} — ${c.count} позиций`);
    b.innerHTML = `${flagIcon(c.iso)}<span>${escapeHtml(c.country)}</span><span class="cnt">· ${c.count}</span>`;
    b.addEventListener('click', () => openCountry(c));
    chipsEl.appendChild(b);
  });
  requestAnimationFrame(updateChipsNav);
}

function updateChipsNav() {
  const max = chipsEl.scrollWidth - chipsEl.clientWidth;
  const hasOverflow = max > 4;
  chipsPrev.classList.toggle('visible', hasOverflow); chipsNext.classList.toggle('visible', hasOverflow);
  if (!hasOverflow) { chipsPrev.disabled = true; chipsNext.disabled = true; return; }
  chipsPrev.disabled = chipsEl.scrollLeft <= 2; chipsNext.disabled = chipsEl.scrollLeft >= max - 2;
}

function scrollChips(dir) {
  const step = Math.max(240, chipsEl.clientWidth * 0.7);
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  chipsEl.scrollBy({ left: dir * step, behavior });
}

chipsPrev.addEventListener('click', () => scrollChips(-1));
chipsNext.addEventListener('click', () => scrollChips(1));
chipsEl.addEventListener('scroll', updateChipsNav, { passive: true });
window.addEventListener('resize', updateChipsNav);

chipsEl.addEventListener('wheel', (e) => {
  const max = chipsEl.scrollWidth - chipsEl.clientWidth;
  if (max <= 0) return;
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    if ((e.deltaY > 0 && chipsEl.scrollLeft < max) || (e.deltaY < 0 && chipsEl.scrollLeft > 0)) { e.preventDefault(); chipsEl.scrollLeft += e.deltaY; }
  }
}, { passive: false });

function markChipActive(iso) {
  chipsEl.querySelectorAll('.chip').forEach(el => {
    const isActive = el.dataset.iso === iso;
    el.classList.toggle('active', isActive); el.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (isActive && iso) {
      const chipRect = el.getBoundingClientRect(), wrapRect = chipsEl.getBoundingClientRect(), pad = 48;
      if (chipRect.left < wrapRect.left + pad || chipRect.right > wrapRect.right - pad) {
        const target = el.offsetLeft - chipsEl.clientWidth / 2 + el.offsetWidth / 2;
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        chipsEl.scrollTo({ left: Math.max(0, target), behavior });
      }
    }
  });
  setTimeout(updateChipsNav, 450);
}

window.addEventListener('be:panel-open', (e) => markChipActive(e.detail.iso));
window.addEventListener('be:panel-close', () => markChipActive(null));

const branchSelector = $('branchSelector'), branchTrigger = $('branchTrigger'), branchDropdown = $('branchDropdown'), branchCurrentName = $('branchCurrentName'), branchCurrentMeta = $('branchCurrentMeta');

function renderBranchDropdown() {
  const detectBtnHtml = `
    <button class="branch-detect" id="branchDetectBtn" type="button">
      <span class="icon">📍</span>
      <span class="label">Определить ближайший<span class="hint-text">по геолокации · нужен доступ к GPS</span></span>
    </button>
    <button class="branch-detect" id="branchPickMapBtn" type="button" style="border-bottom: 1px solid rgba(200,160,80,.15)">
      <span class="icon">🗺️</span>
      <span class="label">Указать на карте<span class="hint-text">если GPS определил неверно</span></span>
    </button>
  `;
  const filterHtml = `<label class="branch-open-filter"><input type="checkbox" id="branchOpenOnly" ${branchState.openOnly ? 'checked' : ''}><span>Только открытые сейчас</span></label>`;
  const itemsHtml = branches.map(b => {
    const isActive = b.id === branchState.current.id, open = isBranchOpen(b), statusClass = open ? 'open-now' : 'closed-now';
    const badge = b.is24 ? '<span class="badge-24">24/7</span>' : (open ? '' : '<span class="badge-closed">закрыто</span>');
    const dist = (typeof branchState.distances[b.id] === 'number') ? branchState.distances[b.id] : (isActive ? branchState.distance : null);
    const distHtml = (dist !== null && dist !== undefined) ? `<span class="branch-distance">${dist.toFixed(1)} км</span>` : '';
    const hideClass = (branchState.openOnly && !open && !isActive) ? 'is-closed-filtered' : '';
    return `<button type="button" class="branch-item ${isActive ? 'active' : ''} ${statusClass} ${hideClass}" data-id="${b.id}" data-open="${open ? '1' : '0'}" tabindex="-1" aria-current="${isActive ? 'true' : 'false'}"><span class="dot"></span><span class="info"><strong>${escapeHtml(b.name)}</strong><span>${b.hours}${b.address ? ' · ' + escapeHtml(b.address) : ''}</span></span>${distHtml}${badge}</button>`;
  }).join('');
  branchDropdown.innerHTML = detectBtnHtml + filterHtml + itemsHtml;

  $('branchDetectBtn')?.addEventListener('click', detectNearestBranch);
  
  // Заменяем старую логику с глобусом на вызов карты
  $('branchPickMapBtn')?.addEventListener('click', () => {
    branchSelector.classList.remove('open');
    branchTrigger.setAttribute('aria-expanded', 'false');
    
    openMapPicker((lat, lon) => {
      let result = findNearestBranch(lat, lon, true) || findNearestBranch(lat, lon, false);
      if (result) {
        selectBranch(result.branch.id, { source: 'map', distance: result.distance });
        showToast(`Выбрано: ${result.branch.name} · ${result.distance.toFixed(1)} км`, '📍');
      }
    });
  });

  const openFilter = $('branchOpenOnly');
  if (openFilter) {
    openFilter.addEventListener('change', () => {
      setOpenOnly(openFilter.checked);
      branchDropdown.querySelectorAll('.branch-item').forEach(el => {
        const isOpen = el.dataset.open === '1', isActive = el.dataset.id === branchState.current.id;
        el.classList.toggle('is-closed-filtered', branchState.openOnly && !isOpen && !isActive);
      });
      track('branch_filter_open', { enabled: branchState.openOnly });
    });
  }
  branchDropdown.querySelectorAll('.branch-item').forEach(el => { el.addEventListener('click', () => selectBranch(el.dataset.id, { source: 'manual' })); });
}

function updateBranchTrigger() {
  branchCurrentName.textContent = branchState.current.name;
  const open = isBranchOpen(branchState.current);
  const statusHtml = `<span class="branch-status ${open ? 'open' : 'closed'}">${open ? '● Открыто' : '● Закрыто'}</span>`;
  const distHtml = branchState.distance !== null ? ` · <span style="color:var(--tg-blue);font-weight:700">${branchState.distance.toFixed(1)} км</span>` : '';
  branchCurrentMeta.innerHTML = `${branchState.current.hours}${branchState.current.address ? ' · ' + escapeHtml(branchState.current.address) : ''}${distHtml} ${statusHtml}`;
}

export function selectBranch(id, opts = {}) {
  const b = branches.find(x => x.id === id); if (!b) return;
  setBranch(b, opts); updateBranchTrigger(); renderBranchDropdown();
  branchSelector.classList.remove('open'); branchTrigger.setAttribute('aria-expanded', 'false');
  const headerBtn = $('headerOrderBtn'); if (headerBtn) headerBtn.href = getOrderUrl(branchState.current);
  track('select_branch', { branch: id, source: branchState.source });
}

async function detectNearestBranch() {
  const btn = $('branchDetectBtn');
  if (btn) { btn.disabled = true; const lbl = btn.querySelector('.label'); if (lbl) lbl.innerHTML = 'Определяем местоположение…<span class="hint-text">браузер запросит разрешение</span>'; }
  track('geolocate_click');
  
  try {
    const { lat, lon } = await requestGeolocation();
    
    // Сначала ищем ближайший ОТКРЫТЫЙ филиал
    let result = findNearestBranch(lat, lon, true);
    let warning = false;

    // Если открытых нет, ищем просто ближайший
    if (!result) {
      result = findNearestBranch(lat, lon, false);
      warning = true;
    }

    if (!result) throw new Error('Филиалы рядом не найдены');
    
    if (result.distance > 100) {
      showToast(`До ближайшего филиала ${Math.round(result.distance)} км. Выберите вручную.`);
      track('geolocate_far', { distance: Math.round(result.distance) });
      return;
    }
    
    branchState.distances = {};
    for (const b of branches) {
      if (typeof b.lat !== 'number' || typeof b.lon !== 'number') continue;
      branchState.distances[b.id] = distanceKm(lat, lon, b.lat, b.lon);
    }
    
    selectBranch(result.branch.id, { source: 'auto', distance: result.distance });
    
    if (warning) {
      showToast(`Сейчас все филиалы закрыты. Выбран ближайший: ${result.branch.name}`, '⚠️');
    } else {
      showToast(`Ближайший открытый: ${result.branch.name} · ${result.distance.toFixed(1)} км`);
    }
    track('geolocate_ok', { branch: result.branch.id, distance: Number(result.distance.toFixed(2)) });
    
  } catch (err) {
    showToast(err.message || 'Не удалось определить местоположение');
    track('geolocate_err', { message: err.message });
  } finally {
    if (btn) {
      btn.disabled = false;
      const lbl = btn.querySelector('.label');
      if (lbl) lbl.innerHTML = 'Определить ближайший<span class="hint-text">по геолокации · нужен доступ к GPS</span>';
    }
  }
}

branchTrigger.addEventListener('click', () => { const isOpen = branchSelector.classList.toggle('open'); branchTrigger.setAttribute('aria-expanded', String(isOpen)); });

branchTrigger.addEventListener('keydown', (e) => {
  if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !branchSelector.classList.contains('open')) {
    e.preventDefault(); branchSelector.classList.add('open'); branchTrigger.setAttribute('aria-expanded', 'true');
    setTimeout(() => { const first = branchDropdown.querySelector('.branch-item:not(.is-closed-filtered)'); if (first) first.focus(); }, 0);
  }
});

branchDropdown.addEventListener('keydown', (e) => {
  const items = [...branchDropdown.querySelectorAll('.branch-item:not(.is-closed-filtered)')], idx = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(idx + 1, items.length - 1)]?.focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(idx - 1, 0)]?.focus(); }
  else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
  else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
  else if (e.key === 'Escape') { e.preventDefault(); branchSelector.classList.remove('open'); branchTrigger.setAttribute('aria-expanded', 'false'); branchTrigger.focus(); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const targetId = document.activeElement?.dataset?.id; if (targetId) selectBranch(targetId, { source: 'manual' }); branchTrigger.focus(); }
});

document.addEventListener('click', (e) => { if (!branchSelector.contains(e.target)) { branchSelector.classList.remove('open'); branchTrigger.setAttribute('aria-expanded', 'false'); } });

function initPromo() {
  const promo = $('promo'); if (!promo || !PROMO_TEXT) return;
  let dismissedUntil = 0; try { dismissedUntil = Number(localStorage.getItem(PROMO_KEY) || 0); } catch(_) {}
  if (Date.now() > dismissedUntil) { $('promoText').textContent = PROMO_TEXT; promo.hidden = false; }
  $('promoClose').addEventListener('click', () => { promo.hidden = true; try { localStorage.setItem(PROMO_KEY, String(Date.now() + 24 * 3600 * 1000)); } catch(_) {} });
}

function parseHash() {
  const raw = location.hash.replace(/^#\//, '');
  if (!raw) return { route: '', branch: null };
  const [route, qs] = raw.split('?'); const params = new URLSearchParams(qs || '');
  return { route, branch: params.get('branch') };
}

function applyUrlBranch(urlBranch) {
  if (!urlBranch) return;
  const b = branches.find(x => x.id === urlBranch);
  if (!b || b.id === branchState.current.id) return;
  setBranch(b, { source: 'url' }); updateBranchTrigger(); renderBranchDropdown();
  const headerBtn = $('headerOrderBtn'); if (headerBtn) headerBtn.href = getOrderUrl(branchState.current);
}

export function restoreFromHash() {
  const { route, branch } = parseHash();
  applyUrlBranch(branch);
  if (!route) return;
  const place = places.find(p => p.id === route);
  if (place) return openPlace(place, { skipHash: true });
  const c = countries.find(x => x.iso === route);
  if (c) return openCountry(c, { skipHash: true });
  showToast(`Страны или заведения «${escapeHtml(route)}» нет. Выберите на глобусе.`);
  history.replaceState(null, '', location.pathname + location.search);
}

window.addEventListener('hashchange', () => { if (!location.hash) { closeAll(); return; } restoreFromHash(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (branchSelector.classList.contains('open')) { branchSelector.classList.remove('open'); branchTrigger.setAttribute('aria-expanded', 'false'); branchTrigger.focus(); return; }
    if (modal.classList.contains('open')) { closeModal(); return; }
    const mapModal = $('mapModal');
    if (mapModal && mapModal.classList.contains('open')) { mapModal.classList.remove('open'); return; }
    const cartSheet = $('cartSheet');
    if (cartSheet && cartSheet.classList.contains('open')) { import('./cart.js').then(m => m.closeCart()); return; }
    if (sheet.classList.contains('open')) { closeSheet(); return; }
    if (panel.classList.contains('open')) { closePanel(); return; }
  }
  if (e.key === '/' && !e.target.matches('input, textarea')) { e.preventDefault(); focusPanelSearch(); focusSheetSearch(); }
  if (e.key === 'Tab') {
    const mapModal = $('mapModal');
    const cartSheet = $('cartSheet');
    const trap = modal.classList.contains('open') ? modal.querySelector('.modal-card')
                : mapModal?.classList.contains('open') ? mapModal.querySelector('.map-card')
                : cartSheet?.classList.contains('open') ? cartSheet
                : sheet.classList.contains('open') ? sheet
                : panel.classList.contains('open') ? panel
                : null;
    if (!trap) return;
    const nodes = trap.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

export function initUI() {
  buildChips(); updateBranchTrigger(); renderBranchDropdown(); initPromo();
  initMapPicker(); // <--- Инициализация карты
  const headerBtn = $('headerOrderBtn'); if (headerBtn) headerBtn.href = getOrderUrl(branchState.current);
}
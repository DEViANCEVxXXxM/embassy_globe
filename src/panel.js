/* =========================================================
   PANEL — боковая панель, модалка, sheet, поиск, фильтры.
   ========================================================= */

import {
  places, countries, CATEGORIES, IMG_BASE, SORT_KEY
} from './data.js';
import {
  branchState, getFavorites, saveFavorites, toggleFavorite, isFavorite,
  getRecent, pushRecent
} from './state.js';
import {
  $, fmt, escapeHtml, norm, highlightSafe, blurIfContains, showToast, markInteracted,
  track, prefetchImages, getOrderUrl, detectCategory, flagIcon
} from './utils.js';
import { shareItem } from './share.js';

/* ==== Globe controller ==== */
let _globeMove = null;
let _globeHighlight = null;
export function setGlobeController({ moveCamera, highlightCountry }) {
  _globeMove = moveCamera;
  _globeHighlight = highlightCountry;
}

/* ==== DOM ==== */
const panel = $('panel');
const pName = $('p-name');
const pSub = $('p-sub');
const pFlag = $('p-flag');
const pBody = $('p-body');
const pSearch = $('p-search');
const pSearchClear = $('p-search-clear');
const pInStock = $('p-instock');
const pCount = $('p-count');
const pSort = $('p-sort');
const pCategories = $('p-categories');

const modal = $('modal');
const sheet = $('sheet');
const sheetBody = $('sheetBody');
const sheetSearch = $('sheetSearch');
const sheetSearchClear = $('sheetSearchClear');

/* ==== Состояние рендера ==== */
let currentContext = null;
let currentCategory = 'all';
let currentFilteredItems = [];
let _sheetSearchResults = [];
let lastFocused = null;
let currentModalItem = null;

try {
  const s = localStorage.getItem(SORT_KEY);
  if (s && pSort.querySelector(`option[value="${s}"]`)) pSort.value = s;
} catch(_) {}

/* ==== Панель ==== */
function setPanelFlag(iso, fallbackEmoji = '🍔') {
  const html = flagIcon(iso);
  if (html) { pFlag.innerHTML = html; pFlag.classList.remove('flag--emoji'); }
  else { pFlag.textContent = fallbackEmoji; pFlag.classList.add('flag--emoji'); }
}

export function buildHash(route) {
  return `#/${route}?branch=${branchState.current.id}`;
}

export function openPlace(place, opts = {}) {
  markInteracted();
  prefetchImages(place);
  pushRecent(place);
  currentContext = { type: 'place', data: place,
    allItems: place.items.map(it => ({ ...it, _placeId: place.id, _iso: place.iso })) };
  setPanelFlag(place.iso);
  pName.textContent = place.name;
  pSub.textContent = `${place.country} · ${place.items.length} позиций`;
  pSearch.value = ''; pInStock.checked = false; currentCategory = 'all';
  applyFilter();
  openPanel(place.lat, place.lon, place.iso);
  if (!opts.skipHash) {
    const newHash = buildHash(place.id);
    if (location.hash !== newHash) history.pushState({ view: 'place', id: place.id }, '', newHash);
  }
  track('open_place', { place: place.id, country: place.iso });
}

export function openCountry(country, opts = {}) {
  markInteracted();
  currentContext = { type: 'country', data: country, allItems: country.items };
  setPanelFlag(country.iso);
  pName.textContent = country.country;
  pSub.textContent = `${country.places.length} зав. · ${country.count} позиций`;
  pSearch.value = ''; pInStock.checked = false; currentCategory = 'all';
  applyFilter();
  openPanel(country.lat, country.lon, country.iso);
  if (!opts.skipHash) {
    const newHash = buildHash(country.iso);
    if (location.hash !== newHash) history.pushState({ view: 'country', id: country.iso }, '', newHash);
  }
  track('open_country', { country: country.iso });
}

function openPanel(lat, lon, iso) {
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  if (_globeHighlight) _globeHighlight(iso);
  if (_globeMove) _globeMove(lat, lon);
  setTimeout(() => panel.focus({ preventScroll: true }), 100);
  window.dispatchEvent(new CustomEvent('be:panel-open', { detail: { iso } }));
}

export function closePanel() {
  blurIfContains(panel);
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (_globeHighlight) _globeHighlight(null);
  window.dispatchEvent(new CustomEvent('be:panel-close'));
}

export function closeAll() {
  closeModal();
  closeSheet();
  closePanel();
}

$('p-close').addEventListener('click', closePanel);

/* Свайп вниз */
(function bindPanelSwipe() {
  const handle = $('panelHandle');
  if (!handle) return;
  let startY = 0, curY = 0, active = false;
  handle.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 900) return;
    active = true; startY = e.touches[0].clientY; curY = startY;
    panel.classList.add('swiping');
  }, { passive: true });
  handle.addEventListener('touchmove', (e) => {
    if (!active) return;
    curY = e.touches[0].clientY;
    panel.style.transform = `translateY(${Math.max(0, curY - startY)}px)`;
  }, { passive: true });
  handle.addEventListener('touchend', () => {
    if (!active) return;
    active = false;
    panel.classList.remove('swiping');
    panel.style.transform = '';
    if (curY - startY > 90) closePanel();
  });
})();

/* ==== Фильтры и рендер ==== */
export function applyFilter() {
  if (!currentContext) return;
  const rawQ = pSearch.value.trim();
  const q = norm(rawQ);
  const inStockOnly = pInStock.checked;
  const sort = pSort.value;
  const cat = currentCategory;

  let items = currentContext.allItems.slice();
  if (q) items = items.filter(it => {
    const hay = norm(it.n) + ' ' + norm(it.d) + ' ' + norm(it._city);
    return hay.includes(q);
  });
  if (inStockOnly) items = items.filter(it => !it.out);
  if (cat !== 'all') items = items.filter(it => detectCategory(it) === cat);

  if (sort === 'price-asc') items.sort((a, b) => a.p - b.p);
  else if (sort === 'price-desc') items.sort((a, b) => b.p - a.p);
  else if (sort === 'discount') items.sort((a, b) => {
    const da = a.old ? (1 - a.p/a.old) : 0;
    const db = b.old ? (1 - b.p/b.old) : 0;
    return db - da;
  });
  else if (sort === 'new') items.sort((a, b) => {
    return (/new/i.test(b.n) ? 1 : 0) - (/new/i.test(a.n) ? 1 : 0);
  });

  pSearchClear.classList.toggle('show', rawQ.length > 0);
  pCount.textContent = `${items.length} из ${currentContext.allItems.length}`;
  currentFilteredItems = items;

  renderCategoryChips(currentContext.allItems);

  if (!items.length) {
    const hints = ['бургер', 'сет', 'чай', 'салат', 'донат'];
    pBody.innerHTML = `
      <div class="empty">
        ${q ? `Ничего не найдено по «${escapeHtml(rawQ)}»` : 'Нет подходящих позиций'}
        <div class="empty-hints">
          ${hints.map(h => `<button class="empty-hint-chip" data-hint="${h}">${h}</button>`).join('')}
        </div>
        <br>
        <button type="button" id="emptyReset">Сбросить фильтры</button>
      </div>`;
    return;
  }
  const withCity = currentContext.type === 'country';
  pBody.innerHTML = items.map((it, i) => renderItem(it, withCity, i, rawQ)).join('');
}

function renderCategoryChips(allItems) {
  const counts = {};
  allItems.forEach(it => {
    const c = detectCategory(it);
    counts[c] = (counts[c] || 0) + 1;
  });
  const order = ['burgers', 'sets', 'hotdogs', 'salads', 'snacks', 'desserts', 'drinks', 'other'];
  const present = order.filter(k => counts[k]);
  if (present.length <= 1) {
    pCategories.innerHTML = '';
    pCategories.hidden = true;
    return;
  }
  pCategories.hidden = false;

  const mkChip = (cat, label, count) => {
    const active = currentCategory === cat;
    return `<button type="button" class="cat-chip ${active ? 'active' : ''}" data-cat="${cat}" aria-pressed="${active ? 'true' : 'false'}">${label}<span class="cnt">· ${count}</span></button>`;
  };
  pCategories.innerHTML = mkChip('all', 'Всё', allItems.length)
    + present.map(k => mkChip(k, CATEGORIES[k].label, counts[k])).join('');
}

function getBadges(it) {
  const badges = [];
  if (it.old) {
    const pct = Math.round((1 - it.p/it.old) * 100);
    badges.push(`<span class="badge discount">−${pct}%</span>`);
  }
  if (/new/i.test(it.n)) badges.push(`<span class="badge new">new</span>`);
  return badges.join('');
}

function renderItem(it, withCity, idx, query) {
  const img = it.i ? `<img src="${IMG_BASE}${it.i}" alt="" loading="lazy" decoding="async">` : '';
  const old = it.old ? `<span class="old">${fmt(it.old)}</span>` : '';
  const out = it.out ? `<span class="out-pill">нет в наличии</span>` : '';
  const city = withCity && it._city ? `<span class="city-label">${escapeHtml(it._city)}</span>` : '';
  const nameHtml = highlightSafe(it.n, query || '');
  return `
    <button type="button" class="item${it.out ? ' is-out' : ''}"
             data-place="${it._placeId || ''}" data-idx="${idx}"
             aria-label="${escapeHtml(it.n)}, ${fmt(it.p)}, ${it.w || ''}">
      <span class="thumb">
        <span class="badges">${getBadges(it)}</span>
        <span class="emo">${it.e || '🍔'}</span>${img}
      </span>
      <span class="body">
        ${city}
        <span class="item-title">${nameHtml}</span>
        <span class="item-desc">${escapeHtml(it.d || '')}</span>
        <span class="row">
          <span class="price">${fmt(it.p)}</span>
          ${old}
          <span class="w">${it.w || ''}</span>
        </span>
        ${out}
      </span>
    </button>`;
}

/* Поиск и сортировка */
let _pSearchTimer = null;
pSearch.addEventListener('input', () => {
  clearTimeout(_pSearchTimer);
  _pSearchTimer = setTimeout(applyFilter, 140);
});
pSearchClear.addEventListener('click', () => { pSearch.value = ''; applyFilter(); pSearch.focus(); });
pInStock.addEventListener('change', applyFilter);
pSort.addEventListener('change', () => {
  try { localStorage.setItem(SORT_KEY, pSort.value); } catch(_) {}
  applyFilter();
  track('sort', { value: pSort.value });
});

/* Делегирование */
pBody.addEventListener('click', (e) => {
  if (e.target.closest('#emptyReset')) {
    pSearch.value = ''; pInStock.checked = false; currentCategory = 'all';
    applyFilter();
    return;
  }
  const hint = e.target.closest('.empty-hint-chip');
  if (hint) { pSearch.value = hint.dataset.hint; applyFilter(); pSearch.focus(); return; }
  const itemEl = e.target.closest('.item');
  if (!itemEl) return;
  const it = currentFilteredItems[+itemEl.dataset.idx];
  if (it) openModal(it, currentContext);
});
pCategories.addEventListener('click', (e) => {
  const chip = e.target.closest('.cat-chip');
  if (!chip) return;
  currentCategory = chip.dataset.cat;
  applyFilter();
});

/* ==== Модалка ==== */
const TELEGRAM_ICON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>`;

export function openModal(item, ctx) {
  lastFocused = document.activeElement;
  currentModalItem = item;
  const hero = $('m-hero');
  hero.classList.remove('modal-hero--error');
  hero.innerHTML = `<span class="emo">${item.e || '🍔'}</span>`;
  if (item.i) {
    const img = document.createElement('img');
    img.src = IMG_BASE + item.i;
    img.alt = item.n;
    img.decoding = 'async';
    img.fetchPriority = 'high';
    img.onerror = () => { img.remove(); hero.classList.add('modal-hero--error'); };
    hero.appendChild(img);
  } else {
    hero.classList.add('modal-hero--error');
  }
  const kickerParts = [];
  if (ctx?.type === 'country') kickerParts.push(ctx.data.country);
  if (item._city) kickerParts.push(item._city);
  $('m-kicker').textContent = kickerParts.slice(0, 2).join(' · ') || 'Burger Embassy';
  $('m-name').textContent = item.n;
  $('m-desc').textContent = item.d || '';
  $('m-price').textContent = fmt(item.p);
  $('m-old').textContent = item.old ? fmt(item.old) : '';
  $('m-weight').textContent = item.w || '';

  const cat = detectCategory(item);
  const meta = CATEGORIES[cat];
  $('m-kcal').textContent = meta.kcal ? `~${meta.kcal} ккал` : '—';
  $('m-allergens').textContent = meta.allergens;

  const favBtn = $('m-fav');
  favBtn.classList.toggle('active', isFavorite(item));
  favBtn.setAttribute('aria-pressed', isFavorite(item) ? 'true' : 'false');

  const orderBtn = $('m-order');
  if (item.out) {
    orderBtn.innerHTML = 'Нет в наличии';
    orderBtn.classList.add('disabled');
    orderBtn.setAttribute('aria-disabled', 'true');
    orderBtn.removeAttribute('href');
    orderBtn.removeAttribute('target');
  } else {
    orderBtn.innerHTML = `<span class="logo" aria-hidden="true">${TELEGRAM_ICON_SVG}</span>Заказать в Telegram`;
    orderBtn.classList.remove('disabled');
    orderBtn.removeAttribute('aria-disabled');
    orderBtn.setAttribute('target', '_blank');
    orderBtn.href = getOrderUrl(branchState.current);
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    const title = $('m-name');
    if (title) { try { title.focus({ preventScroll: true }); } catch(_) {} }
  }, 100);

  track('open_item', { item: item.n, price: item.p, place: item._placeId || '', country: item._iso || '' });
}

export function closeModal() {
  if (!modal.classList.contains('open')) return;
  if (lastFocused && document.body.contains(lastFocused) && !modal.contains(lastFocused)) {
    try { lastFocused.focus({ preventScroll: true }); } catch(_) {}
  } else blurIfContains(modal);
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  $('modalCard').style.transform = '';
  currentModalItem = null;
  lastFocused = null;
}

$('m-close').addEventListener('click', closeModal);
$('modalBackdrop').addEventListener('click', closeModal);
$('modal').addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

$('m-order').addEventListener('click', () => {
  if ($('m-order').classList.contains('disabled')) return;
  showToast('Открываем Telegram…');
  track('click_order', {
    item: currentModalItem?.n || '',
    branch: branchState.current.id,
    price: currentModalItem?.p || 0
  });
});

$('m-fav').addEventListener('click', () => {
  if (!currentModalItem) return;
  const added = toggleFavorite(currentModalItem);
  $('m-fav').classList.toggle('active', added);
  $('m-fav').setAttribute('aria-pressed', added ? 'true' : 'false');
  showToast(added ? 'Добавлено в избранное' : 'Удалено из избранного');
  track('favorite', { item: currentModalItem.n, added });
});

$('m-share-top').addEventListener('click', () => {
  if (currentModalItem) shareItem(currentModalItem);
});

(function bindModalSwipe() {
  const card = $('modalCard');
  let startY = 0, curY = 0, active = false;
  card.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 900 || !modal.classList.contains('open') || card.scrollTop > 0) return;
    active = true; startY = e.touches[0].clientY; curY = startY;
    card.style.transition = 'none';
  }, { passive: true });
  card.addEventListener('touchmove', (e) => {
    if (!active) return;
    curY = e.touches[0].clientY;
    const dy = curY - startY;
    if (dy > 0) card.style.transform = `scale(1) translateY(${dy}px)`;
  }, { passive: true });
  card.addEventListener('touchend', () => {
    if (!active) return;
    active = false;
    card.style.transition = '';
    card.style.transform = '';
    if (curY - startY > 100) closeModal();
  });
})();

/* ==== Sheet ==== */
function renderRecentAndFavorites() {
  const recent = getRecent();
  const favs = getFavorites();
  let html = '';
  if (favs.length) {
    html += `<div class="sheet-section">
      <h3 class="sheet-section-title">Избранное</h3>
      <div class="sheet-fav-list">
        ${favs.slice(0, 8).map(f => `
          <div class="fav-row" data-fav-key="${escapeHtml(f.key)}" role="button" tabindex="0" aria-label="${escapeHtml(f.n)}, ${fmt(f.p)}">
            <span class="flag">${flagIcon(f.iso)}</span>
            <div class="info">
              <h4>${escapeHtml(f.n)}</h4>
              <span>${escapeHtml(f.placeName || '')} · ${fmt(f.p)}</span>
            </div>
            <button type="button" class="fav-remove" data-fav-remove="${escapeHtml(f.key)}" aria-label="Удалить из избранного">✕</button>
          </div>`).join('')}
      </div>
    </div>`;
  }
  if (recent.length) {
    html += `<div class="sheet-section">
      <h3 class="sheet-section-title">Недавние</h3>
      <div class="sheet-recent-row">
        ${recent.slice(0, 6).map(r => `
          <button class="recent-chip" data-recent-id="${escapeHtml(r.id)}" data-recent-iso="${escapeHtml(r.iso)}">
            ${flagIcon(r.iso)} ${escapeHtml(r.name)}
          </button>`).join('')}
      </div>
    </div>`;
  }
  return html;
}

export function buildSheet() {
  sheetSearch.value = '';
  sheetSearchClear.classList.remove('show');
  const grouped = {};
  places.forEach(p => {
    if (!grouped[p.iso]) grouped[p.iso] = { country: p.country, iso: p.iso, places: [] };
    grouped[p.iso].places.push(p);
  });
  const arr = Object.values(grouped).sort((a, b) => a.country.localeCompare(b.country, 'ru'));
  const ext = renderRecentAndFavorites();
  const rest = arr.map(g => `
    <div class="sheet-country">
      <h3 class="sheet-country-title">${flagIcon(g.iso)}<span>${g.country}</span></h3>
      ${g.places.map(p => `
        <div class="sheet-place" data-id="${p.id}" role="button" tabindex="0">
          <span class="flag">${flagIcon(p.iso)}</span>
          <div class="info">
            <h3>${escapeHtml(p.name)}</h3>
            <span>${p.items.length} позиций · ${p.items.filter(i => !i.out).length} в наличии</span>
          </div>
          <span class="arrow">›</span>
        </div>`).join('')}
    </div>`).join('');
  sheetBody.innerHTML = ext + rest;
}

export function renderGlobalSearch(q) {
  const qn = norm(q);
  const results = [];
  places.forEach(p => {
    p.items.forEach(it => {
      const hay = norm(it.n) + ' ' + norm(it.d) + ' ' + norm(p.name) + ' ' + norm(p.country);
      if (hay.includes(qn)) {
        results.push({ ...it, _city: p.name, _placeId: p.id, _iso: p.iso, _country: p.country });
      }
    });
  });
  if (!results.length) {
    sheetBody.innerHTML = `<div class="empty">Ничего не найдено по «${escapeHtml(q)}»</div>`;
    return;
  }
  const MAX_RESULTS = 60;
  const shown = results.slice(0, MAX_RESULTS);
  const total = results.length;
  _sheetSearchResults = shown;
  const moreBlock = total > MAX_RESULTS
    ? `<div class="empty" style="padding:20px 16px;font-size:12.5px">Показано ${MAX_RESULTS} из ${total}. Уточните запрос.</div>`
    : '';

  sheetBody.innerHTML = shown.map((it, idx) => `
    <button type="button" class="item${it.out ? ' is-out' : ''}" data-global-idx="${idx}">
      <span class="thumb">
        ${it.i ? `<img src="${IMG_BASE}${it.i}" alt="" loading="lazy" decoding="async">` : ''}
        <span class="emo">${it.e || '🍔'}</span>
      </span>
      <span class="body">
        <span class="city-label">${escapeHtml(it._country)} · ${escapeHtml(it._city)}</span>
        <span class="item-title">${highlightSafe(it.n, q)}</span>
        <span class="item-desc">${escapeHtml(it.d || '')}</span>
        <span class="row">
          <span class="price">${fmt(it.p)}</span>
          ${it.old ? `<span class="old">${fmt(it.old)}</span>` : ''}
          <span class="w">${it.w || ''}</span>
        </span>
      </span>
    </button>`).join('') + moreBlock;
}

/* Делегирование в sheet */
function _openPlaceAndItem(placeId, itemName) {
  const p = places.find(x => x.id === placeId);
  if (!p) return;
  closeSheet();
  setTimeout(() => {
    openPlace(p);
    if (!itemName) return;
    setTimeout(() => {
      const raw = p.items.find(x => x.n === itemName);
      if (!raw) return;
      openModal({ ...raw, _placeId: p.id, _iso: p.iso, _city: p.name }, { type: 'place', data: p });
    }, 350);
  }, 150);
}

sheetBody.addEventListener('click', (e) => {
  const removeEl = e.target.closest('.fav-remove');
  if (removeEl) {
    const key = removeEl.dataset.favRemove;
    saveFavorites(getFavorites().filter(f => f.key !== key));
    showToast('Удалено из избранного');
    buildSheet();
    track('favorite_remove_from_sheet', { key });
    return;
  }
  const globalEl = e.target.closest('[data-global-idx]');
  if (globalEl) {
    const it = _sheetSearchResults[+globalEl.dataset.globalIdx];
    if (it) _openPlaceAndItem(it._placeId, it.n);
    return;
  }
  const placeEl = e.target.closest('.sheet-place');
  if (placeEl) { _openPlaceAndItem(placeEl.dataset.id, null); return; }
  const recentEl = e.target.closest('.recent-chip');
  if (recentEl) { _openPlaceAndItem(recentEl.dataset.recentId, null); return; }
  const favEl = e.target.closest('.fav-row');
  if (favEl) {
    const fav = getFavorites().find(f => f.key === favEl.dataset.favKey);
    if (fav) _openPlaceAndItem(fav.placeId, fav.n);
  }
});

sheetBody.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('.fav-row');
  if (!row || e.target.closest('.fav-remove')) return;
  e.preventDefault();
  const fav = getFavorites().find(f => f.key === row.dataset.favKey);
  if (fav) _openPlaceAndItem(fav.placeId, fav.n);
});

/* Поиск в sheet */
let _sheetSearchTimer = null;
sheetSearch.addEventListener('input', () => {
  const v = sheetSearch.value.trim();
  sheetSearchClear.classList.toggle('show', v.length > 0);
  clearTimeout(_sheetSearchTimer);
  _sheetSearchTimer = setTimeout(() => {
    if (v) renderGlobalSearch(v);
    else buildSheet();
  }, 140);
});
sheetSearchClear.addEventListener('click', () => {
  sheetSearch.value = '';
  sheetSearchClear.classList.remove('show');
  buildSheet();
  sheetSearch.focus();
});

export function openSheet() {
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  buildSheet();
  setTimeout(() => { try { sheet.focus({ preventScroll: true }); } catch(_) {} }, 100);
  track('open_sheet');
}

export function closeSheet() {
  blurIfContains(sheet);
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.style.transform = '';
}

$('fabList').addEventListener('click', openSheet);
$('sheet-close').addEventListener('click', closeSheet);

let sheetStartY = 0, sheetCurrentY = 0, sheetDragging = false;
$('sheetHandle').addEventListener('touchstart', (e) => {
  sheetDragging = true; sheetStartY = e.touches[0].clientY; sheetCurrentY = sheetStartY;
}, { passive: true });
$('sheetHandle').addEventListener('touchmove', (e) => {
  if (!sheetDragging) return;
  sheetCurrentY = e.touches[0].clientY;
  sheet.style.transform = `translateY(${Math.max(0, sheetCurrentY - sheetStartY)}px)`;
}, { passive: true });
$('sheetHandle').addEventListener('touchend', () => {
  if (!sheetDragging) return;
  sheetDragging = false;
  const dy = sheetCurrentY - sheetStartY;
  sheet.style.transform = '';
  if (dy > 80) closeSheet();
});

export { pSearch, sheetSearch, panel, modal, sheet };
export function focusPanelSearch() { if (panel.classList.contains('open')) pSearch.focus(); }
export function focusSheetSearch() { if (sheet.classList.contains('open')) sheetSearch.focus(); }
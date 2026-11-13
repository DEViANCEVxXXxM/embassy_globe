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
import { getCart, addToCart, changeQty } from './cart.js';

let _globeMove = null;
let _globeHighlight = null;
export function setGlobeController({ moveCamera, highlightCountry }) {
  _globeMove = moveCamera;
  _globeHighlight = highlightCountry;
}

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
  
  const cartKey = `${it._iso}:${it._placeId}:${it.n}`;
  const inCart = getCart().find(x => x.key === cartKey);
  let actionHtml = '';
  
  if (!it.out) {
    if (inCart) {
      actionHtml = `
        <div class="item-qty" data-key="${escapeHtml(cartKey)}">
          <button class="item-qty-btn" data-act="minus" aria-label="Уменьшить">−</button>
          <span class="item-qty-num">${inCart.qty}</span>
          <button class="item-qty-btn" data-act="plus" aria-label="Увеличить">+</button>
        </div>`;
    } else {
      actionHtml = `<button class="item-add" data-add-idx="${idx}" aria-label="Добавить в корзину">+</button>`;
    }
  }

  return `
    <div class="item${it.out ? ' is-out' : ''}" role="button" tabindex="0"
         data-place="${it._placeId || ''}" data-idx="${idx}"
         aria-label="${escapeHtml(it.n)}, ${fmt(it.p)}, ${it.w || ''}">
      <div class="thumb">
        <div class="badges">${getBadges(it)}</div>
        <span class="emo">${it.e || '🍔'}</span>${img}
      </div>
      <div class="body">
        ${city}
        <div class="item-title">${nameHtml}</div>
        <div class="item-desc">${escapeHtml(it.d || '')}</div>
        <div class="row">
          <span class="price">${fmt(it.p)}</span>
          ${old}
          <span class="w">${it.w || ''}</span>
        </div>
        ${out}
      </div>
      <div class="item-action-wrap" data-cart-key="${escapeHtml(cartKey)}" data-idx="${idx}">
        ${actionHtml}
      </div>
    </div>`;
}

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

pBody.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.item-add');
  if (addBtn) {
    e.preventDefault();
    e.stopPropagation(); 
    const it = currentFilteredItems[+addBtn.dataset.addIdx];
    if (it) addToCart(it); 
    return;
  }

  const qtyBtn = e.target.closest('.item-qty-btn');
  if (qtyBtn) {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = qtyBtn.closest('.item-qty');
    const key = wrapper.dataset.key;
    const delta = qtyBtn.dataset.act === 'plus' ? 1 : -1;
    changeQty(key, delta); 
    return;
  }

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

pBody.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const itemEl = e.target.closest('.item');
    if (itemEl && !e.target.closest('.item-qty') && !e.target.closest('.item-add')) {
      e.preventDefault();
      const it = currentFilteredItems[+itemEl.dataset.idx];
      if (it) openModal(it, currentContext);
    }
  }
});

pCategories.addEventListener('click', (e) => {
  const chip = e.target.closest('.cat-chip');
  if (!chip) return;
  currentCategory = chip.dataset.cat;
  applyFilter();
});

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

  const mActions = $('m-actions');
  const cartKey = `${item._iso}:${item._placeId}:${item.n}`;

  function renderModalAction() {
    const inCart = getCart().find(x => x.key === cartKey);
    if (item.out) {
      mActions.innerHTML = `<button class="modal-add disabled" type="button">Нет в наличии</button>`;
    } else if (inCart) {
      mActions.innerHTML = `
        <div class="modal-qty">
          <button class="cart-btn" data-act="minus" id="m-qty-minus">−</button>
          <span class="cart-qty">${inCart.qty}</span>
          <button class="cart-btn" data-act="plus" id="m-qty-plus">+</button>
        </div>
      `;
      $('m-qty-minus').onclick = () => { changeQty(cartKey, -1); renderModalAction(); };
      $('m-qty-plus').onclick = () => { changeQty(cartKey, 1); renderModalAction(); };
    } else {
      mActions.innerHTML = `<button class="modal-add" type="button" id="m-add-btn">🛒 Добавить в корзину</button>`;
      $('m-add-btn').onclick = () => {
        addToCart(item);
        renderModalAction();
      };
    }
  }
  renderModalAction();

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

$('m-fav').addEventListener('click', () => {
  if (!currentModalItem) return;
  const added = toggleFavorite(currentModalItem);
  
  const btn = $('m-fav');
  btn.classList.toggle('active', added);
  btn.setAttribute('aria-pressed', added ? 'true' : 'false');
  
  btn.classList.remove('pop-anim');
  void btn.offsetWidth;
  btn.classList.add('pop-anim');

  showToast(added ? 'Добавлено в избранное' : 'Удалено из избранного', added ? '❤️' : '💔');
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

  sheetBody.innerHTML = shown.map((it, idx) => {
    const cartKey = `${it._iso}:${it._placeId}:${it.n}`;
    const inCart = getCart().find(x => x.key === cartKey);
    let actionHtml = '';
    
    if (!it.out) {
      if (inCart) {
        actionHtml = `
          <div class="item-qty" data-key="${escapeHtml(cartKey)}">
            <button class="item-qty-btn" data-act="minus">−</button>
            <span class="item-qty-num">${inCart.qty}</span>
            <button class="item-qty-btn" data-act="plus">+</button>
          </div>`;
      } else {
        actionHtml = `<button class="item-add" data-add-global-idx="${idx}" aria-label="Добавить в корзину">+</button>`;
      }
    }

    return `
    <div class="item${it.out ? ' is-out' : ''}" role="button" tabindex="0" data-global-idx="${idx}">
      <div class="thumb">
        ${it.i ? `<img src="${IMG_BASE}${it.i}" alt="" loading="lazy" decoding="async">` : ''}
        <span class="emo">${it.e || '🍔'}</span>
      </div>
      <div class="body">
        <span class="city-label">${escapeHtml(it._country)} · ${escapeHtml(it._city)}</span>
        <div class="item-title">${highlightSafe(it.n, q)}</div>
        <div class="item-desc">${escapeHtml(it.d || '')}</div>
        <div class="row">
          <span class="price">${fmt(it.p)}</span>
          ${it.old ? `<span class="old">${fmt(it.old)}</span>` : ''}
          <span class="w">${it.w || ''}</span>
        </div>
      </div>
      <div class="item-action-wrap" data-cart-key="${escapeHtml(cartKey)}" data-global-idx="${idx}">
        ${actionHtml}
      </div>
    </div>`;
  }).join('') + moreBlock;
}

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
  const addBtn = e.target.closest('.item-add');
  if (addBtn) {
    e.preventDefault(); e.stopPropagation();
    const it = _sheetSearchResults[+addBtn.dataset.addGlobalIdx];
    if (it) addToCart(it); 
    return;
  }

  const qtyBtn = e.target.closest('.item-qty-btn');
  if (qtyBtn) {
    e.preventDefault(); e.stopPropagation();
    const wrapper = qtyBtn.closest('.item-qty');
    const key = wrapper.dataset.key;
    const delta = qtyBtn.dataset.act === 'plus' ? 1 : -1;
    changeQty(key, delta);
    return;
  }

  const removeEl = e.target.closest('.fav-remove');
  if (removeEl) {
    const key = removeEl.dataset.favRemove;
    saveFavorites(getFavorites().filter(f => f.key !== key));
    showToast('Удалено из избранного', '✕');
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
  if (row && !e.target.closest('.fav-remove')) {
    e.preventDefault();
    const fav = getFavorites().find(f => f.key === row.dataset.favKey);
    if (fav) _openPlaceAndItem(fav.placeId, fav.n);
    return;
  }
  const itemEl = e.target.closest('.item[data-global-idx]');
  if (itemEl && !e.target.closest('.item-qty') && !e.target.closest('.item-add')) {
    e.preventDefault();
    const it = _sheetSearchResults[+itemEl.dataset.globalIdx];
    if (it) _openPlaceAndItem(it._placeId, it.n);
  }
});

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

window.addEventListener('be:cart-updated', () => {
  const active = document.activeElement;
  const activeKey = active?.closest('.item-action-wrap')?.dataset.cartKey;
  const activeAct = active?.dataset?.act || (active?.classList.contains('item-add') ? 'add' : null);

  document.querySelectorAll('.item-action-wrap').forEach(wrap => {
    const cartKey = wrap.dataset.cartKey;
    const idx = wrap.dataset.idx;
    const gIdx = wrap.dataset.globalIdx;
    const inCart = getCart().find(x => x.key === cartKey);

    if (!inCart) {
      if (idx !== undefined) {
        wrap.innerHTML = `<button class="item-add" data-add-idx="${idx}" aria-label="Добавить в корзину">+</button>`;
      } else if (gIdx !== undefined) {
        wrap.innerHTML = `<button class="item-add" data-add-global-idx="${gIdx}" aria-label="Добавить в корзину">+</button>`;
      }
    } else {
      wrap.innerHTML = `
        <div class="item-qty" data-key="${escapeHtml(cartKey)}">
          <button class="item-qty-btn" data-act="minus" aria-label="Уменьшить количество">−</button>
          <span class="item-qty-num">${inCart.qty}</span>
          <button class="item-qty-btn" data-act="plus" aria-label="Увеличить количество">+</button>
        </div>`;
    }
  });

  if (activeKey) {
    const newWrap = document.querySelector(`.item-action-wrap[data-cart-key="${activeKey}"]`);
    if (newWrap) {
      if (activeAct === 'plus') newWrap.querySelector('[data-act="plus"]')?.focus();
      else if (activeAct === 'minus') newWrap.querySelector('[data-act="minus"]')?.focus();
    }
  }
});

export { pSearch, sheetSearch, panel, modal, sheet };
export function focusPanelSearch() { if (panel.classList.contains('open')) pSearch.focus(); }
export function focusSheetSearch() { if (sheet.classList.contains('open')) sheetSearch.focus(); }
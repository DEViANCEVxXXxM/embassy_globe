/* =========================================================
   STATE — состояние филиала, favorites, recent.
   Автозагрузка из localStorage при импорте.
   ========================================================= */

import {
  branches, BRANCH_STORAGE_KEY, BRANCH_SOURCE_KEY, BRANCH_OPEN_FILTER_KEY,
  FAV_KEY, RECENT_KEY
} from './data.js';

export const branchState = {
  current: branches.find(b => b.id === 'mirzo') || branches[0],
  distance: null,
  source: 'default',
  openOnly: false,
  distances: {}       /* G3: { [branchId]: km } */
};

try {
  const savedId = localStorage.getItem(BRANCH_STORAGE_KEY);
  const savedSource = localStorage.getItem(BRANCH_SOURCE_KEY) || 'manual';
  if (savedId) {
    const saved = branches.find(b => b.id === savedId);
    if (saved) { branchState.current = saved; branchState.source = savedSource; }
  }
  branchState.openOnly = localStorage.getItem(BRANCH_OPEN_FILTER_KEY) === '1';
} catch(_) {}

export function setBranch(b, opts = {}) {
  branchState.current = b;
  branchState.source = opts.source || 'manual';
  branchState.distance = (typeof opts.distance === 'number')
    ? opts.distance
    : (typeof branchState.distances[b.id] === 'number' ? branchState.distances[b.id] : null);
  try {
    localStorage.setItem(BRANCH_STORAGE_KEY, b.id);
    localStorage.setItem(BRANCH_SOURCE_KEY, branchState.source);
  } catch(_) {}
}

export function setOpenOnly(v) {
  branchState.openOnly = !!v;
  try { localStorage.setItem(BRANCH_OPEN_FILTER_KEY, v ? '1' : '0'); } catch(_) {}
}

/* ==== Favorites ==== */
let _favCache = null;
export function getFavorites() {
  if (_favCache !== null) return _favCache;
  try { _favCache = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
  catch(_) { _favCache = []; }
  return _favCache;
}
export function saveFavorites(list) {
  _favCache = list;
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch(_) {}
}
export function itemKey(item) { return `${item._iso}:${item._placeId}:${item.n}`; }
export function isFavorite(item) {
  const k = itemKey(item);
  return getFavorites().some(f => f.key === k);
}
export function toggleFavorite(item) {
  const k = itemKey(item);
  let list = getFavorites();
  const idx = list.findIndex(f => f.key === k);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveFavorites(list);
    return false;
  }
  list.unshift({
    key: k, n: item.n, p: item.p, old: item.old, e: item.e, i: item.i, d: item.d,
    placeId: item._placeId, placeName: item._city, iso: item._iso, w: item.w
  });
  saveFavorites(list.slice(0, 30));
  return true;
}

/* ==== Recent ==== */
let _recentCache = null;
export function getRecent() {
  if (_recentCache !== null) return _recentCache;
  try { _recentCache = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch(_) { _recentCache = []; }
  return _recentCache;
}
export function saveRecent(list) {
  _recentCache = list;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch(_) {}
}
export function pushRecent(place) {
  let list = getRecent();
  list = list.filter(x => !(x.id === place.id && x.iso === place.iso));
  list.unshift({ id: place.id, iso: place.iso, name: place.name, country: place.country });
  saveRecent(list.slice(0, 8));
}

/* Межвкладочная синхронизация */
window.addEventListener('storage', (e) => {
  if (e.key === FAV_KEY) _favCache = null;
  else if (e.key === RECENT_KEY) _recentCache = null;
});
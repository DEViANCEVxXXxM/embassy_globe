import { ISO2, IMG_BASE, ORDER_URL, METRIKA_ID, branches } from './data.js';

export const $ = id => document.getElementById(id);
export const fmt = n => n.toLocaleString('ru-RU').replace(/\u00A0/g, ' ') + ' сум';
export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const norm = s => (s||'').toLowerCase().replace(/ё/g,'е').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');

export function flagIcon(iso) {
  const code = ISO2[iso] || (iso||'').slice(0,2).toLowerCase();
  return code ? `<span class="fi fi-${code}" aria-hidden="true"></span>` : '';
}

export function highlightSafe(text, query) {
  if (!query) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>' + escapeHtml(text.slice(idx + query.length));
}

export function blurIfContains(el) {
  if (el && el.contains(document.activeElement)) { try { document.activeElement.blur(); } catch(_) {} }
}

let _toastTimer = null;
export function showToast(msg, icon = '') {
  const t = $('toast'); if (!t) return;
  t.innerHTML = icon ? `<span class="toast-icon">${icon}</span> <span>${escapeHtml(msg)}</span>` : escapeHtml(msg);
  t.classList.add('show');
  clearTimeout(_toastTimer); _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

export function markInteracted() {
  const onb = $('onboarding'); if (onb && !onb.classList.contains('hide')) onb.classList.add('hide');
}

export function initMetrika() {
  if (!METRIKA_ID) return;
  (function(m,e,t,r,i,k,a){ m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)}; m[i].l=1*new Date(); for (var j=0;j<document.scripts.length;j++) if (document.scripts[j].src===r) return; k=e.createElement(t);a=e.getElementsByTagName(t)[0]; k.async=1;k.src=r;a.parentNode.insertBefore(k,a) })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
  window.ym(METRIKA_ID, 'init', {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
}

export function track(event, params = {}) {
  if (METRIKA_ID && window.ym) { try { window.ym(METRIKA_ID, 'reachGoal', event, params); } catch(_) {} }
  if (location.search.includes('debug')) console.log('[track]', event, params);
}

const _tashkentFmt = (() => {
  try { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hour12: false }); } catch(_) { return null; }
})();

export function tashkentMinutes() {
  if (_tashkentFmt) {
    try {
      const parts = _tashkentFmt.formatToParts(new Date());
      return (+(parts.find(p=>p.type==='hour')?.value || 0))*60 + (+(parts.find(p=>p.type==='minute')?.value || 0));
    } catch(_) {}
  }
  const now = new Date(); return now.getHours()*60 + now.getMinutes();
}

export function parseHM(t) { const parts = t.trim().split(':'); return (Number(parts[0])||0)*60 + (Number(parts[1])||0); }

export function isBranchOpen(branch) {
  if (branch.is24) return true;
  if (!branch.hours || !branch.hours.includes('–')) return true;
  const [sStr, eStr] = branch.hours.split('–').map(s=>s.trim());
  const s = parseHM(sStr), e = parseHM(eStr), cur = tashkentMinutes();
  if (s <= e) return cur >= s && cur < e; else return cur >= s || cur < e;
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function findNearestBranch(lat, lon) {
  let best = null, bestDist = Infinity;
  for (const b of branches) {
    if (typeof b.lat !== 'number' || typeof b.lon !== 'number') continue;
    const d = distanceKm(lat, lon, b.lat, b.lon);
    if (d < bestDist) { bestDist = d; best = b; }
  }
  return best ? { branch: best, distance: bestDist } : null;
}

export function requestGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Браузер не поддерживает геолокацию'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => { const msgs = {1:'Доступ к геолокации запрещён', 2:'Не удалось определить местоположение', 3:'Истекло время ожидания'}; reject(new Error(msgs[err.code] || 'Ошибка геолокации')); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

export function getOrderUrl(branch) {
  const id = branch && branch.id, utm = 'utm_source=site&utm_medium=button&utm_campaign=order';
  return id ? `${ORDER_URL}?start=${encodeURIComponent('branch_' + id)}&${utm}` : `${ORDER_URL}?${utm}`;
}

/* PRELOAD: Заставляем браузер скачивать картинки первыми */
const prefetched = new Set();
export function prefetchImages(place) {
  place.items.slice(0, 4).forEach(it => {
    if (!it.i || prefetched.has(it.i)) return;
    prefetched.add(it.i);
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = IMG_BASE + it.i;
    document.head.appendChild(link);
    
    const img = new Image();
    img.src = IMG_BASE + it.i;
  });
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') prefetched.clear(); });
document.addEventListener('load', (e) => { if (e.target && e.target.tagName === 'IMG') e.target.classList.add('loaded'); }, true);
document.addEventListener('error', (e) => {
  if (e.target && e.target.tagName === 'IMG') { e.target.style.display = 'none'; e.target.classList.remove('loaded'); }
}, true);

export function detectCategory(item) {
  const n = (item.n||'').toLowerCase();
  if (/салат/.test(n)) return 'salads';
  if (/фондан|чизкейк|донат|десерт/.test(n)) return 'desserts';
  if (/сет/.test(n)) return 'sets';
  if (/хот.?дог/.test(n)) return 'hotdogs';
  if (/картофель|наггетс|снеков|ассорти/.test(n)) return 'snacks';
  if (/cola|sprite|fanta|вода|чай|сок|фреш|тархун|лимонад|айс.?ти|ягодн|water|sprite/i.test(n)) return 'drinks';
  if (/burger|бургер/.test(n)) return 'burgers';
  return 'other';
}
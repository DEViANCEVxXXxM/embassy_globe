/* =========================================================
   SHARE — Web Share API с fallback на clipboard.
   ========================================================= */

import { fmt, showToast, track } from './utils.js';
import { branchState } from './state.js';

export async function shareItem(item) {
  const placeId = item._placeId || '';
  const url = placeId
    ? `${location.origin}${location.pathname}#/${placeId}?branch=${branchState.current.id}`
    : location.href;
  const shareData = {
    title: 'Burger Embassy',
    text: `${item.n} — ${fmt(item.p)} · Burger Embassy`,
    url
  };

  track('share', { item: item.n, place: placeId });

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try { await navigator.share(shareData); return; }
    catch (err) {
      if (err && err.name === 'AbortError') return;
      console.warn('navigator.share failed:', err);
    }
  }

  try {
    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
    showToast('Ссылка скопирована');
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    showToast('Не удалось скопировать ссылку');
  }
}
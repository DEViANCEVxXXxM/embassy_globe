import { IMG_BASE } from './data.js';
import { branchState } from './state.js';
import { $, fmt, escapeHtml, showToast, track, blurIfContains } from './utils.js';

const CART_KEY = 'be_cart_v1';
let _cartCache = null;

export function getCart() {
  if (_cartCache !== null) return _cartCache;
  try { _cartCache = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch(_) { _cartCache = []; }
  return _cartCache;
}

function saveCart(list) {
  _cartCache = list;
  try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch(_) {}
  updateCartUI();
  window.dispatchEvent(new CustomEvent('be:cart-updated'));
}

export function addToCart(item) {
  const list = [...getCart()];
  const key = `${item._iso}:${item._placeId}:${item.n}`;
  const existing = list.find(x => x.key === key);
  
  if (existing) {
    existing.qty += 1;
  } else {
    list.push({
      key, n: item.n, p: item.p, e: item.e, i: item.i,
      placeId: item._placeId, placeName: item._city, qty: 1
    });
  }
  saveCart(list);
  
  if (navigator.vibrate) navigator.vibrate(15);
  
  showToast('Добавлено в корзину', '🛒');
}

export function changeQty(key, delta) {
  let list = [...getCart()];
  const idx = list.findIndex(x => x.key === key);
  if (idx < 0) return;
  
  list[idx].qty += delta;
  if (list[idx].qty <= 0) {
    list.splice(idx, 1);
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  } else {
    if (navigator.vibrate) navigator.vibrate(5);
  }
  
  saveCart(list);
  
  if (getCart().length === 0) closeCart();
  else renderCart();
}

export function clearCart() {
  saveCart([]);
  closeCart();
  if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  showToast('Корзина очищена', '🗑');
}

export function updateCartUI() {
  const list = getCart();
  const fab = $('cartFab');
  const totalEl = $('cartTotal');
  const headerTgBtn = $('headerOrderBtn');
  
  if (!fab || !totalEl) return;

  if (list.length === 0) {
    fab.hidden = true;
    if (headerTgBtn) {
      headerTgBtn.onclick = null;
      headerTgBtn.href = `https://t.me/burgerembassy_uzbot?start=branch_${branchState.current.id}`;
      headerTgBtn.target = "_blank";
      headerTgBtn.querySelector('.label').textContent = 'Telegram';
    }
    return;
  }
  
  fab.hidden = false;
  const totalCount = list.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = list.reduce((sum, item) => sum + (item.p * item.qty), 0);
  totalEl.textContent = `${totalCount} · ${fmt(totalPrice)}`;

  if (headerTgBtn) {
    headerTgBtn.removeAttribute('href');
    headerTgBtn.removeAttribute('target');
    headerTgBtn.onclick = (e) => { e.preventDefault(); openCart(); };
    headerTgBtn.querySelector('.label').textContent = 'Корзина';
  }

  fab.classList.remove('pop');
  void fab.offsetWidth;
  fab.classList.add('pop');
}

export function renderCart() {
  const list = getCart();
  const container = $('cartBody');
  const totalEl = $('cartGrandTotal');
  const checkoutBtn = $('cartCheckout');
  const clearBtn = $('cartClearBtn');
  
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty" style="padding-top:60px">
        <div style="font-size:40px; margin-bottom:16px;">🛒</div>
        Ваша корзина пуста.<br>Добавьте что-нибудь вкусное!
      </div>`;
    totalEl.textContent = '0 сум';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }

  if (checkoutBtn) checkoutBtn.style.display = 'flex';
  if (clearBtn) clearBtn.style.display = 'flex';

  container.innerHTML = list.map(it => `
    <div class="cart-item">
      <span class="thumb">
        ${it.i ? `<img src="${IMG_BASE}${it.i}" alt="" loading="lazy">` : ''}
        <span class="emo">${it.e || '🍔'}</span>
      </span>
      <div class="info">
        <h4>${escapeHtml(it.n)}</h4>
        <span>${fmt(it.p)}</span>
      </div>
      <div class="cart-controls">
        <button class="cart-btn" data-act="minus" data-key="${escapeHtml(it.key)}">−</button>
        <span class="cart-qty">${it.qty}</span>
        <button class="cart-btn" data-act="plus" data-key="${escapeHtml(it.key)}">+</button>
      </div>
    </div>
  `).join('');

  const totalPrice = list.reduce((sum, item) => sum + (item.p * item.qty), 0);
  totalEl.textContent = fmt(totalPrice);
}

export function openCart() {
  renderCart();
  const sheet = $('cartSheet');
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  setTimeout(() => { try { sheet.focus({ preventScroll: true }); } catch(_) {} }, 100);
  track('open_cart');
}

export function closeCart() {
  const sheet = $('cartSheet');
  blurIfContains(sheet);
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
}

export function initCart() {
  updateCartUI();
  $('cartFab')?.addEventListener('click', openCart);
  $('cart-close')?.addEventListener('click', closeCart);
  $('cartClearBtn')?.addEventListener('click', clearCart);
  
  $('cartBody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.cart-btn');
    if (!btn) return;
    const key = btn.dataset.key;
    const delta = btn.dataset.act === 'plus' ? 1 : -1;
    changeQty(key, delta);
  });

  $('cartCheckout')?.addEventListener('click', async () => {
    const list = getCart();
    if (list.length === 0) return;

    let text = `🛒 Заказ в Burger Embassy\n`;
    text += `📍 Филиал: ${branchState.current.name}\n`;
    text += `-------------------------\n`;
    
    list.forEach(it => {
      text += `${it.qty} x ${it.n} — ${fmt(it.p * it.qty)}\n`;
    });
    
    const total = list.reduce((sum, item) => sum + (item.p * item.qty), 0);
    text += `-------------------------\n`;
    text += `Итого: ${fmt(total)}`;

    try {
      await navigator.clipboard.writeText(text);
      showToast('Заказ скопирован! Вставьте его в чат с ботом.', '📋');
      
      saveCart([]);
      closeCart();

      const tgUrl = `https://t.me/burgerembassy_uzbot?start=branch_${branchState.current.id}`;
      setTimeout(() => window.open(tgUrl, '_blank'), 800);

      track('checkout', { total, items: list.length });
    } catch (err) {
      showToast('Не удалось скопировать заказ. Попробуйте еще раз.');
      console.error(err);
    }
  });
}

window.addEventListener('storage', (e) => {
  if (e.key === CART_KEY) {
    _cartCache = null;
    updateCartUI();
    if ($('cartSheet')?.classList.contains('open')) {
      renderCart();
    }
  }
});
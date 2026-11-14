import { showToast, track, updateBodyScroll } from './utils.js';

let map = null;
let marker = null;
let selectedCoords = null;
let onConfirmCallback = null;

export function openMapPicker(callback) {
  onConfirmCallback = callback;
  selectedCoords = null;
  
  const modal = document.getElementById('mapModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  updateBodyScroll();

  const loader = document.getElementById('map-loader');
  if (loader) {
    loader.style.display = 'grid';
    loader.innerHTML = '<div class="spinner"></div>';
  }

  // Инициализируем карту только один раз
  if (!map) {
    map = L.map('map-container').setView([41.2995, 69.2401], 12);
    
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Скрываем лоадер, когда тайлы загрузились
    tileLayer.on('load', () => {
      if (loader) loader.style.display = 'none';
    });

    // Обработчик клика по карте
    map.on('click', (e) => {
      if (marker) map.removeLayer(marker);
      marker = L.marker(e.latlng).addTo(map);
      selectedCoords = { lat: e.latlng.lat, lon: e.latlng.lng };
      
      document.getElementById('mapConfirm').style.opacity = '1';
      document.getElementById('mapConfirm').style.pointerEvents = 'auto';
    });
  }

  // Сброс предыдущего маркера при открытии
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  
  setTimeout(() => { map.invalidateSize(); }, 100);

  // Блокируем кнопку до клика
  const confirmBtn = document.getElementById('mapConfirm');
  confirmBtn.style.opacity = '0.5';
  confirmBtn.style.pointerEvents = 'none';

  track('map_picker_open');
}

export function initMapPicker() {
  const modal = document.getElementById('mapModal');
  const closeBtn = document.getElementById('mapClose');
  const backdrop = document.getElementById('mapBackdrop');
  const confirmBtn = document.getElementById('mapConfirm');

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    updateBodyScroll();
  };

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  confirmBtn.addEventListener('click', () => {
    if (selectedCoords && typeof onConfirmCallback === 'function') {
      onConfirmCallback(selectedCoords.lat, selectedCoords.lon);
      closeModal();
      track('map_picker_confirm', { lat: selectedCoords.lat, lon: selectedCoords.lon });
    } else {
      showToast('Пожалуйста, кликните на карту, чтобы выбрать точку', '📍');
    }
  });
}
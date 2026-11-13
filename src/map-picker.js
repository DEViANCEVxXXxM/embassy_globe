import { showToast, track } from './utils.js';

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

  // Инициализируем карту только один раз
  if (!map) {
    // Координаты центра Ташкента
    map = L.map('map-container').setView([41.2995, 69.2401], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

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
  map.invalidateSize(); // Важно для корректного отображения после открытия модалки

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
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Remove accents/diacritics and convert to lowercase for fuzzy matching
export function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Advanced multi-token search with relevance ranking
export function filterAndRankItems(items, queryStr, getSearchableText) {
  if (!items || !Array.isArray(items)) return [];
  const rawQuery = (queryStr || '').trim();
  if (!rawQuery) return items;

  const normalizedQuery = normalizeText(rawQuery);
  const tokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return items;

  const matched = [];

  for (const item of items) {
    const text = normalizeText(getSearchableText(item));
    // Every token typed by user must match somewhere in normalized text
    const isMatch = tokens.every(token => text.includes(token));

    if (isMatch) {
      let score = 0;
      if (text === normalizedQuery) score += 100;
      if (text.startsWith(normalizedQuery)) score += 50;

      for (const token of tokens) {
        if (text.includes(` ${token}`) || text.startsWith(token)) score += 10;
      }
      matched.push({ item, score });
    }
  }

  // Sort by highest relevance score first
  matched.sort((a, b) => b.score - a.score);
  return matched.map(m => m.item);
}

// Format date to DD/MM/YYYY format
export function formatDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '-';
  const str = String(dateStr).trim();
  if (!str) return '-';
  
  // Handle ISO YYYY-MM-DD or YYYY-MM-DDT...
  if (str.includes('T')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  return str;
}

// Universal Clean Bootstrap Modal Opener & Controller
export function showBootstrapModal(modalElemOrId) {
  const elem = typeof modalElemOrId === 'string' ? document.getElementById(modalElemOrId) : modalElemOrId;
  if (!elem) {
    console.error("showBootstrapModal: Element not found:", modalElemOrId);
    alert("No se encontró la ventana emergente.");
    return;
  }
  if (!elem) return;

  elem.style.removeProperty('pointer-events');
  elem.style.pointerEvents = 'auto';

  try {
    const bsModal = window.bootstrap && window.bootstrap.Modal;
    if (bsModal) {
      let modalInstance = bsModal.getInstance(elem);
      if (modalInstance) {
        modalInstance.dispose();
      }
      modalInstance = new bsModal(elem, { backdrop: true, keyboard: true });
      modalInstance.show();

      setTimeout(() => {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.onclick = () => hideBootstrapModal(elem);
        }
      }, 100);
      return;
    }
  } catch (err) {
    console.warn("Bootstrap JS modal show error:", err);
  }

  // UI Fallback if Bootstrap JS is absent
  document.body.classList.add('modal-open');
  elem.classList.add('show');
  elem.style.display = 'block';
  elem.style.pointerEvents = 'auto';
  elem.removeAttribute('aria-hidden');
  elem.setAttribute('aria-modal', 'true');
}

export function hideBootstrapModal(modalElemOrId) {
  const elem = typeof modalElemOrId === 'string' ? document.getElementById(modalElemOrId) : modalElemOrId;
  if (elem) {
    try {
      const bsModal = window.bootstrap && window.bootstrap.Modal;
      if (bsModal) {
        const modalInstance = bsModal.getInstance(elem);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
    } catch (e) {}

    elem.classList.remove('show');
    elem.style.display = 'none';
    elem.style.removeProperty('pointer-events');
    elem.setAttribute('aria-hidden', 'true');
    elem.removeAttribute('aria-modal');
  }

  document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('pointer-events');
}
window.hideBootstrapModal = hideBootstrapModal;
window.showBootstrapModal = showBootstrapModal;

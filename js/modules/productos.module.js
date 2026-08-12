import { escapeHtml } from '../helpers.js';

export function renderProductosTable(products = [], searchQuery = '') {
  const tbody = document.getElementById('productosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return !q || (p.nombre_producto && p.nombre_producto.toLowerCase().includes(q));
  });

  filtered.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-bold text-muted">#${p.id_producto}</td>
      <td class="fw-semibold">${escapeHtml(p.nombre_producto)}</td>
      <td><span class="badge bg-light text-dark border">${p.categoria || 'Etiquetas & Insumos'}</span></td>
      <td><span class="status-badge COMPLETADO">ACTIVO</span></td>
    `;
    tbody.appendChild(tr);
  });
}

import { escapeHtml } from '../helpers.js';

export function renderClientesTable(clients = [], searchQuery = '') {
  const tbody = document.getElementById('clientesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q ||
      (c.nombre_cliente && c.nombre_cliente.toLowerCase().includes(q)) ||
      (c.nro_documento && c.nro_documento.includes(q));
  });

  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-bold"><span class="small text-muted d-block">${c.tipo_documento || 'RUC'}</span>${c.nro_documento}</td>
      <td class="fw-semibold">${escapeHtml(c.nombre_cliente || '-')}</td>
      <td class="small text-muted">${escapeHtml(c.direccion || 'No especificada')}</td>
      <td><span class="status-badge COMPLETADO">ACTIVO</span></td>
    `;
    tbody.appendChild(tr);
  });
}

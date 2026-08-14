import { escapeHtml, formatDate } from '../helpers.js';

export function renderEnviosTable(shipments = [], searchQuery = '') {
  const tbody = document.getElementById('enviosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = shipments.filter(s => {
    const q = searchQuery.toLowerCase();
    return !q ||
      (s.nro_guia && s.nro_guia.toLowerCase().includes(q)) ||
      (s.nombre_cliente && s.nombre_cliente.toLowerCase().includes(q));
  });

  const badge = document.getElementById('shipmentsCountBadge');
  if (badge) badge.textContent = `${filtered.length} guías`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No se encontraron guías.</td></tr>`;
    return;
  }

  filtered.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-bold text-primary">${s.nro_guia}</td>
      <td>
        <div class="fw-semibold">${escapeHtml(s.nombre_cliente || 'Cliente')}</div>
        <div class="small text-muted">📍 ${escapeHtml(s.direccion_destino || 'Dirección fiscal')}</div>
      </td>
      <td>${formatDate(s.fecha_guia)}</td>
      <td><span class="status-badge ${s.estado || 'ACTIVA'}">${s.estado || 'ACTIVA'}</span></td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary" onclick="app.openEditShipmentModal(${s.id_guia})">Modificar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

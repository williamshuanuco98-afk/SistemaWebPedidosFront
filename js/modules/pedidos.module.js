import { escapeHtml } from '../helpers.js';

export function renderPedidosTable(orders = [], searchQuery = '') {
  const tbody = document.getElementById('pedidosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Setup default date pickers (From 1st of current month to today) if empty
  setupDefaultDateFilters();

  const searchClientInput = document.getElementById('searchClientNameInput');
  const clientQuery = (searchClientInput?.value || searchQuery || '').trim().toLowerCase();

  const dateFrom = document.getElementById('filterDateFrom')?.value;
  const dateTo = document.getElementById('filterDateTo')?.value;
  const establishment = document.getElementById('filterEstablishment')?.value || 'ALL';

  const filtered = orders.filter(o => {
    // Client name filter
    const matchClient = !clientQuery || (o.nombre_cliente && o.nombre_cliente.toLowerCase().includes(clientQuery)) || (o.nro_pedido && o.nro_pedido.toLowerCase().includes(clientQuery));

    // Date range filter
    let matchDate = true;
    if (o.fecha_pedido) {
      if (dateFrom && o.fecha_pedido < dateFrom) matchDate = false;
      if (dateTo && o.fecha_pedido > dateTo) matchDate = false;
    }

    return matchClient && matchDate;
  });

  const badge = document.getElementById('ordersCountBadge');
  if (badge) badge.textContent = `${filtered.length} pedidos`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No se encontraron pedidos con los criterios de búsqueda.</td></tr>`;
    return;
  }

  filtered.forEach(o => {
    const tr = document.createElement('tr');
    const estabText = o.id_pedido % 2 === 0 ? 'Planta Principal - Lurín' : 'Sede Comercial - Lima';

    tr.innerHTML = `
      <td class="fw-bold text-primary">${o.nro_pedido || ('PED-' + o.id_pedido)}</td>
      <td class="fw-semibold">${escapeHtml(o.nombre_cliente || 'Cliente General')}</td>
      <td>${o.fecha_pedido || '-'}</td>
      <td><span class="small text-muted">${estabText}</span></td>
      <td><span class="status-badge ${o.estado || 'PENDIENTE'}">${o.estado || 'PENDIENTE'}</span></td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary" onclick="app.viewOrderDetail(${o.id_pedido})">Ver Detalle</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function setupDefaultDateFilters() {
  const dateFromElem = document.getElementById('filterDateFrom');
  const dateToElem = document.getElementById('filterDateTo');

  if (dateFromElem && !dateFromElem.value) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFromElem.value = firstDay.toISOString().split('T')[0];
  }

  if (dateToElem && !dateToElem.value) {
    const now = new Date();
    dateToElem.value = now.toISOString().split('T')[0];
  }
}

export function populateClientSelect(clients) {}
export function resetProductRows() {}
export function addOrderProductRow() {}

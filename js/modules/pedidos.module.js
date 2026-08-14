import { escapeHtml, formatDate } from '../helpers.js';
import { api } from '../api.js';

let currentOrders = [];

export function renderPedidosTable(orders = [], searchQuery = '') {
  currentOrders = orders || [];
  const tbody = document.getElementById('pedidosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  setupDefaultDateFilters();

  const searchClientInput = document.getElementById('searchClientNameInput');
  const clientQuery = (searchClientInput?.value || searchQuery || '').trim().toLowerCase();

  const dateFrom = document.getElementById('filterDateFrom')?.value;
  const dateTo = document.getElementById('filterDateTo')?.value;

  const filtered = currentOrders.filter(o => {
    const matchClient = !clientQuery || 
      (o.nombre_cliente && o.nombre_cliente.toLowerCase().includes(clientQuery)) || 
      (o.nro_pedido && o.nro_pedido.toLowerCase().includes(clientQuery));

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
    const estabText = o.id_pedido % 2 === 0 ? 'Planta Principal - Comas' : 'Sucursal - Carabayllo';
    const estadoClass = (o.estado || 'PENDIENTE').toUpperCase();

    tr.innerHTML = `
      <td class="fw-bold text-primary">${o.nro_pedido || ('PED-' + o.id_pedido)}</td>
      <td class="fw-semibold">${escapeHtml(o.nombre_cliente || 'Cliente General')}</td>
      <td>${formatDate(o.fecha_pedido)}</td>
      <td><span class="small text-muted">${estabText}</span></td>
      <td><span class="status-badge ${estadoClass}">${estadoClass}</span></td>
      <td class="text-center">
        <div class="d-flex justify-content-center align-items-center gap-2">
          <button class="btn btn-sm btn-outline-success px-2 py-1 rounded-2 shadow-sm fw-semibold" onclick="pedidosModule.openFinalizarOrdenModal(${o.id_pedido})" title="Finalizar Orden (Entregado / Cancelado)">
            <i class="bi bi-flag-fill me-1"></i> Finalizar
          </button>
          <button class="btn btn-sm btn-outline-warning text-dark-emphasis px-2 py-1 rounded-2 shadow-sm fw-semibold" onclick="pedidosModule.openRegistrarEnvioModal(${o.id_pedido})" title="Registrar Envío de Productos">
            <i class="bi bi-truck me-1"></i> Envío
          </button>
          <button class="btn btn-sm btn-outline-primary px-2 py-1 rounded-2 shadow-sm fw-semibold" onclick="pedidosModule.viewOrderDetail(${o.id_pedido})" title="Ver Detalles del Pedido">
            <i class="bi bi-eye me-1"></i> Detalle
          </button>
        </div>
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

// 1. Finalizar Orden Modal Handlers
export function openFinalizarOrdenModal(idPedido) {
  const order = currentOrders.find(o => o.id_pedido === idPedido);
  if (!order) return;

  document.getElementById('finalizarOrderId').value = idPedido;
  document.getElementById('finalizarOrderNroBadge').textContent = order.nro_pedido || ('PED-' + idPedido);
  
  document.getElementById('optCompletado').checked = true;
  toggleFinalizarFields('ENTREGADO');

  document.getElementById('finalizarNroGuia').value = order.nro_guia || '';
  document.getElementById('finalizarFechaEntrega').value = order.fecha_entrega || new Date().toISOString().split('T')[0];

  const modalElem = document.getElementById('modalFinalizarOrden');
  if (modalElem) {
    const modal = new bootstrap.Modal(modalElem);
    modal.show();
  }
}

export function toggleFinalizarFields(status) {
  const fields = document.getElementById('finalizarDeliveryFields');
  if (!fields) return;
  if (status === 'ENTREGADO') {
    fields.style.display = 'block';
  } else {
    fields.style.display = 'none';
  }
}

export async function saveFinalizarOrden() {
  const idPedido = parseInt(document.getElementById('finalizarOrderId')?.value);
  if (!idPedido) return;

  const isCompletado = document.getElementById('optCompletado')?.checked;
  const nuevoEstado = isCompletado ? 'ENTREGADO' : 'CANCELADO';

  const nroGuia = isCompletado ? document.getElementById('finalizarNroGuia')?.value.trim() : null;
  const fechaEntrega = isCompletado ? document.getElementById('finalizarFechaEntrega')?.value : null;

  if (isCompletado && !nroGuia) {
    alert('Por favor ingrese el N° de Guía de Remisión para completar la orden.');
    return;
  }

  const payload = {
    estado: nuevoEstado,
    nro_guia: nroGuia,
    fecha_entrega: fechaEntrega
  };

  const res = await api.updatePedidoStatus(idPedido, payload);
  if (res) {
    const localOrder = currentOrders.find(o => o.id_pedido === idPedido);
    if (localOrder) {
      localOrder.estado = nuevoEstado;
      localOrder.nro_guia = nroGuia;
      localOrder.fecha_entrega = fechaEntrega;
    }
  }

  const modalElem = document.getElementById('modalFinalizarOrden');
  const modal = bootstrap.Modal.getInstance(modalElem);
  if (modal) modal.hide();

  renderPedidosTable(currentOrders);
}

// 2. Registrar Envío Modal Handlers
export function openRegistrarEnvioModal(idPedido) {
  const order = currentOrders.find(o => o.id_pedido === idPedido);
  if (!order) return;

  document.getElementById('envioOrderId').value = idPedido;
  document.getElementById('envioClientId').value = order.id_cliente || 0;
  document.getElementById('envioOrderNroBadge').textContent = order.nro_pedido || ('PED-' + idPedido);
  document.getElementById('envioNroGuia').value = 'GUI-' + String(Math.floor(Math.random() * 900000) + 100000);
  document.getElementById('envioFechaGuia').value = new Date().toISOString().split('T')[0];

  const tbody = document.getElementById('envioProductsTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    const items = order.detalles || [];
    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">No hay productos en esta orden.</td></tr>`;
    } else {
      items.forEach(item => {
        const cantSolicitada = item.cantidad || 0;
        const cantEntregada = item.cantidad_entregada || 0;
        const pendiente = Math.max(0, cantSolicitada - cantEntregada);

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="fw-bold">${escapeHtml(item.nombre_producto || 'Producto')}</div>
            <span class="small text-muted">${item.codigo_producto || ''}</span>
          </td>
          <td class="text-center fw-bold">${cantSolicitada}</td>
          <td class="text-center text-muted">${cantEntregada}</td>
          <td class="text-center">
            <input type="number" class="form-control form-control-sm text-center input-envio-cantidad" 
              data-product-id="${item.id_producto}" 
              min="0" max="${cantSolicitada}" value="" placeholder="0">
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  const modalElem = document.getElementById('modalRegistrarEnvio');
  if (modalElem) {
    const modal = new bootstrap.Modal(modalElem);
    modal.show();
  }
}

export async function saveRegistrarEnvio() {
  const idPedido = parseInt(document.getElementById('envioOrderId')?.value);
  const idCliente = parseInt(document.getElementById('envioClientId')?.value) || 0;
  const nroGuia = document.getElementById('envioNroGuia')?.value.trim();
  const fechaGuia = document.getElementById('envioFechaGuia')?.value;

  if (!nroGuia || !fechaGuia) {
    alert('Ingrese el N° de Guía y la Fecha del Envío.');
    return;
  }

  const quantityInputs = document.querySelectorAll('.input-envio-cantidad');
  const detallesEnvio = [];
  quantityInputs.forEach(input => {
    const idProd = parseInt(input.getAttribute('data-product-id'));
    const cant = parseInt(input.value) || 0;
    if (idProd && cant > 0) {
      detallesEnvio.push({ id_producto: idProd, cantidad: cant });
    }
  });

  if (detallesEnvio.length === 0) {
    alert('Por favor ingrese al menos una cantidad a enviar mayor a 0.');
    return;
  }

  const payload = {
    id_pedido: idPedido,
    id_cliente: idCliente,
    nro_guia: nroGuia,
    fecha_guia: fechaGuia,
    estado: 'ENTREGADO',
    detalles: detallesEnvio
  };

  const res = await api.addGuia(payload);
  if (res) {
    const localOrder = currentOrders.find(o => o.id_pedido === idPedido);
    if (localOrder) {
      localOrder.nro_guia = nroGuia;
      localOrder.fecha_entrega = fechaGuia;
      
      // Update local order guias list
      if (!localOrder.guias) localOrder.guias = [];
      localOrder.guias.push({
        id_guia: res.id_guia || Date.now(),
        nro_guia: nroGuia,
        fecha_guia: fechaGuia,
        detalles: detallesEnvio
      });

      // Update accumulated delivered quantities
      if (localOrder.detalles) {
        localOrder.detalles.forEach(item => {
          const matchEnvio = detallesEnvio.find(d => d.id_producto === item.id_producto);
          if (matchEnvio) {
            item.cantidad_entregada = (item.cantidad_entregada || 0) + matchEnvio.cantidad;
          }
        });
      }
    }
  }

  const modalElem = document.getElementById('modalRegistrarEnvio');
  const modal = bootstrap.Modal.getInstance(modalElem);
  if (modal) modal.hide();

  renderPedidosTable(currentOrders);
}

// 3. Ver Detalles del Pedido (Modal #orderDetailModal)
export function viewOrderDetail(idPedido) {
  const order = currentOrders.find(o => o.id_pedido === idPedido);
  if (!order) return;

  const modalTitle = document.getElementById('orderDetailTitle');
  const modalBody = document.getElementById('orderDetailBody');
  if (!modalBody) return;

  if (modalTitle) {
    modalTitle.innerHTML = `<i class="bi bi-file-earmark-text me-2 text-primary"></i> Detalle del Pedido ${order.nro_pedido || ('PED-' + idPedido)}`;
  }

  const estadoClass = (order.estado || 'PENDIENTE').toUpperCase();
  const guiasList = order.guias || [];
  const detalles = order.detalles || [];

  // Build Guias Historial HTML
  let guiasHtml = '';
  if (guiasList.length > 0) {
    guiasHtml = `
      <div class="card border-0 bg-body-tertiary mb-3">
        <div class="card-header bg-transparent fw-bold text-success d-flex align-items-center justify-content-between">
          <span><i class="bi bi-truck me-2"></i> Historial de Envíos / Entregas Parciales (${guiasList.length})</span>
        </div>
        <div class="card-body p-2">
          <div class="table-responsive">
            <table class="table custom-table table-sm mb-0">
              <thead>
                <tr>
                  <th>N° Guía</th>
                  <th>Fecha de Envío</th>
                  <th>Productos / Cantidades Entregadas</th>
                </tr>
              </thead>
              <tbody>
                ${guiasList.map(g => `
                  <tr>
                    <td class="fw-bold text-primary">${escapeHtml(g.nro_guia || '-')}</td>
                    <td>${formatDate(g.fecha_guia)}</td>
                    <td>
                      <ul class="mb-0 ps-3 small text-muted">
                        ${(g.detalles || []).map(d => `<li>${escapeHtml(d.nombre_producto || 'Producto')}: <strong>${d.cantidad} un.</strong></li>`).join('')}
                      </ul>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // Parse attached files if present
  let filesList = [];
  if (order.adjuntos) {
    try {
      filesList = typeof order.adjuntos === 'string' ? JSON.parse(order.adjuntos) : order.adjuntos;
    } catch (e) {
      console.warn("Error parsing adjuntos JSON:", e);
    }
  }

  let adjuntosHtml = '';
  if (Array.isArray(filesList) && filesList.length > 0) {
    adjuntosHtml = `
      <h6 class="fw-bold mb-2 text-secondary"><i class="bi bi-file-earmark-pdf me-1"></i> Documentos Adjuntos (${filesList.length}):</h6>
      <div class="d-flex flex-column gap-2 mb-3">
        ${filesList.map(f => {
          const fileName = f.name || `Orden_Compra_${order.nro_pedido}.pdf`;
          const fileData = f.data || '#';
          const fileSize = f.size || '';
          return `
            <div class="d-flex align-items-center justify-content-between p-2.5 border rounded bg-body-tertiary">
              <div class="d-flex align-items-center gap-2 overflow-hidden me-2">
                <i class="bi bi-file-earmark-pdf-fill text-danger fs-4"></i>
                <div class="text-truncate">
                  <div class="fw-semibold small text-truncate">${escapeHtml(fileName)}</div>
                  <div class="text-muted fs-8">${fileSize ? fileSize + ' - ' : ''}Documento Adjunto</div>
                </div>
              </div>
              <a href="${fileData}" download="${escapeHtml(fileName)}" class="btn btn-sm btn-outline-primary flex-shrink-0">
                <i class="bi bi-download me-1"></i> Descargar PDF
              </a>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    adjuntosHtml = `
      <h6 class="fw-bold mb-2 text-secondary"><i class="bi bi-file-earmark-pdf me-1"></i> Documentos Adjuntos:</h6>
      <div class="p-3 text-center text-muted border rounded bg-body-tertiary mb-3 fs-7">
        <i class="bi bi-file-earmark-x fs-4 d-block mb-1 text-secondary"></i>
        No se adjuntaron archivos PDF para este pedido.
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <div class="p-3 border rounded bg-body-tertiary">
          <div class="text-muted small text-uppercase font-monospace fw-bold mb-1">Cliente / Razón Social</div>
          <div class="fw-bold fs-6">${escapeHtml(order.nombre_cliente || 'Cliente General')}</div>
          <div class="small text-muted">RUC/DNI: ${order.nro_documento || 'No registrado'}</div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-3 border rounded bg-body-tertiary">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="text-muted small text-uppercase font-monospace fw-bold">Estado Actual</span>
            <span class="status-badge ${estadoClass}">${estadoClass}</span>
          </div>
          <div class="small mb-1"><strong>Fecha Pedido:</strong> ${formatDate(order.fecha_pedido)}</div>
          ${order.nro_guia ? `<div class="small"><strong>N° Guía Oficial:</strong> ${escapeHtml(order.nro_guia)}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Tabla de Productos Solicitados y Entregados -->
    <h6 class="fw-bold mb-2 text-secondary"><i class="bi bi-box-seam me-1"></i> Ítems del Pedido:</h6>
    <div class="table-responsive border rounded mb-3">
      <table class="table custom-table table-sm align-middle mb-0">
        <thead class="bg-body-tertiary">
          <tr>
            <th>Producto</th>
            <th class="text-center">Solicitado</th>
            <th class="text-center">Entregado</th>
            <th class="text-center">Estado Entrega</th>
          </tr>
        </thead>
        <tbody>
          ${detalles.length === 0 ? '<tr><td colspan="4" class="text-center text-muted py-3">Sin productos especificados.</td></tr>' : 
            detalles.map(item => {
              const sol = item.cantidad || 0;
              const ent = item.cantidad_entregada || 0;
              const isDone = ent >= sol && sol > 0;
              return `
                <tr>
                  <td>
                    <div class="fw-semibold">${escapeHtml(item.nombre_producto || 'Producto')}</div>
                    <span class="small text-muted">${item.codigo_producto || ''}</span>
                  </td>
                  <td class="text-center fw-bold">${sol}</td>
                  <td class="text-center text-success fw-bold">${ent}</td>
                  <td class="text-center">
                    ${isDone ? 
                      '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-all"></i> Completo</span>' : 
                      '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-clock-history"></i> Parcial</span>'}
                  </td>
                </tr>
              `;
            }).join('')
          }
        </tbody>
      </table>
    </div>

    ${guiasHtml}

    ${adjuntosHtml}
  `;

  const modalElem = document.getElementById('orderDetailModal');
  if (modalElem) {
    const modal = new bootstrap.Modal(modalElem);
    modal.show();
  }
}

export function populateClientSelect(clients) { }
export function resetProductRows() { }
export function addOrderProductRow() { }

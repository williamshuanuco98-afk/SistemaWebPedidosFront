import { escapeHtml, formatDate, showBootstrapModal } from '../helpers.js';

let currentOrders = [];
let currentProducts = [];
let currentSearchQuery = '';
let aggregatedProductsMap = {};

export function renderProduccionTable(orders = [], products = [], searchQuery = '') {
  currentOrders = orders || [];
  currentProducts = products || [];
  if (searchQuery !== undefined) currentSearchQuery = searchQuery;

  // Build aggregated product map from all order details
  aggregatedProductsMap = {};

  currentOrders.forEach(order => {
    if (order.detalles && Array.isArray(order.detalles)) {
      const orderDate = order.fecha_pedido || '';
      const deliveryDate = order.fecha_entrega || '';
      const orderNro = order.nro_pedido || ('PED-' + order.id_pedido);
      const poNro = order.nro_orden || '';
      const clientName = order.nombre_cliente || 'Cliente General';
      const clientDoc = order.nro_documento || '';
      const estabRaw = (order.establecimiento || 'CARABAYLLO').toUpperCase();
      const estabText = (estabRaw === 'COMAS' || estabRaw.includes('COMAS')) 
        ? 'Planta Principal - Comas' 
        : 'Sucursal - Carabayllo';

      order.detalles.forEach(d => {
        const prodId = d.id_producto || 0;
        const prodName = d.nombre_producto || 'Producto';
        const prodCode = d.codigo_producto || ('PROD-' + prodId);
        const sol = d.cantidad || 0;
        const ent = d.cantidad_entregada || 0;
        const pend = Math.max(0, sol - ent);

        if (!aggregatedProductsMap[prodId]) {
          aggregatedProductsMap[prodId] = {
            id_producto: prodId,
            codigo_producto: prodCode,
            nombre_producto: prodName,
            total_solicitado: 0,
            total_entregado: 0,
            total_pendiente: 0,
            pedidos_count: 0,
            clientes: []
          };
        }

        const entry = aggregatedProductsMap[prodId];
        entry.total_solicitado += sol;
        entry.total_entregado += ent;
        entry.total_pendiente += pend;
        entry.pedidos_count += 1;

        entry.clientes.push({
          id_pedido: order.id_pedido,
          nro_pedido: orderNro,
          nro_orden: poNro,
          nombre_cliente: clientName,
          nro_documento: clientDoc,
          fecha_pedido: orderDate,
          fecha_entrega: deliveryDate,
          establecimiento: estabText,
          estado_pedido: order.estado || 'PENDIENTE',
          cantidad_solicitada: sol,
          cantidad_entregada: ent,
          cantidad_pendiente: pend
        });
      });
    }
  });

  const productList = Object.values(aggregatedProductsMap);

  // Filter list by searchQuery
  const query = (currentSearchQuery || '').toLowerCase().trim();
  const filtered = productList.filter(p => {
    if (!query) return true;
    return (
      (p.nombre_producto && p.nombre_producto.toLowerCase().includes(query)) ||
      (p.codigo_producto && p.codigo_producto.toLowerCase().includes(query))
    );
  });

  // Update Stats Cards
  const totalItems = filtered.length;
  let totalSol = 0;
  let totalEnt = 0;
  let totalPend = 0;

  filtered.forEach(p => {
    totalSol += p.total_solicitado;
    totalEnt += p.total_entregado;
    totalPend += p.total_pendiente;
  });

  const countBadge = document.getElementById('produccionCountBadge');
  const sItems = document.getElementById('statProdItemsCount');
  const sSol = document.getElementById('statProdTotalSolicitado');
  const sEnt = document.getElementById('statProdTotalEntregado');
  const sPend = document.getElementById('statProdTotalPendiente');

  if (countBadge) countBadge.textContent = `${totalItems} productos`;
  if (sItems) sItems.textContent = totalItems;
  if (sSol) sSol.textContent = totalSol.toLocaleString();
  if (sEnt) sEnt.textContent = totalEnt.toLocaleString();
  if (sPend) sPend.textContent = totalPend.toLocaleString();

  // Render Table Rows
  const tbody = document.getElementById('produccionTableBody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay productos solicitados en producción.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td class="fw-bold font-monospace text-secondary">${escapeHtml(p.codigo_producto)}</td>
      <td>
        <div class="fw-bold text-body">${escapeHtml(p.nombre_producto)}</div>
      </td>
      <td class="text-center fw-bold text-body fs-6">${p.total_solicitado.toLocaleString()}</td>
      <td class="text-center fw-bold text-success fs-6">${p.total_entregado.toLocaleString()}</td>
      <td class="text-center fw-bold text-warning-emphasis fs-6">${p.total_pendiente.toLocaleString()}</td>
      <td class="text-center">
        <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
          <i class="bi bi-people-fill me-1"></i> ${p.clientes.length} ${p.clientes.length === 1 ? 'cliente' : 'clientes'}
        </span>
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary px-2 py-1 shadow-sm fw-semibold" onclick="produccionModule.openProductDetailModal('${p.id_producto}')">
          <i class="bi bi-eye me-1"></i> Ver Detalle
        </button>
      </td>
    </tr>
  `).join('');
}

export function onSearchInput(val) {
  renderProduccionTable(currentOrders, currentProducts, val);
}

export function openProductDetailModal(idProducto) {
  let product = aggregatedProductsMap[idProducto];
  if (!product) {
    product = Object.values(aggregatedProductsMap).find(p => String(p.id_producto) === String(idProducto));
  }
  if (!product) {
    alert('No se encontró información de este producto.');
    return;
  }

  const modalTitle = document.getElementById('produccionDetailTitle');
  const modalBody = document.getElementById('produccionDetailBody');

  if (modalTitle) {
    modalTitle.innerHTML = `<i class="bi bi-box-seam text-primary me-2"></i> ${escapeHtml(product.nombre_producto)} <span class="badge bg-secondary font-monospace ms-2">${escapeHtml(product.codigo_producto)}</span>`;
  }

  if (modalBody) {
    const todayStr = new Date().toISOString().split('T')[0];

    modalBody.innerHTML = `
      <!-- Product Summary Cards -->
      <div class="row g-2 mb-3">
        <div class="col-md-3 col-6">
          <div class="p-2 border rounded bg-body-tertiary text-center">
            <span class="text-muted fs-8 d-block text-uppercase fw-semibold">Pedidos Totales</span>
            <strong class="fs-6 text-primary">${product.clientes.length}</strong>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="p-2 border rounded bg-body-tertiary text-center">
            <span class="text-muted fs-8 d-block text-uppercase fw-semibold">Solicitado</span>
            <strong class="fs-6 text-body">${product.total_solicitado.toLocaleString()}</strong>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="p-2 border rounded bg-body-tertiary text-center">
            <span class="text-muted fs-8 d-block text-uppercase fw-semibold">Entregado</span>
            <strong class="fs-6 text-success">${product.total_entregado.toLocaleString()}</strong>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="p-2 border rounded bg-body-tertiary text-center">
            <span class="text-muted fs-8 d-block text-uppercase fw-semibold">Pendiente</span>
            <strong class="fs-6 text-warning-emphasis">${product.total_pendiente.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <!-- Table of Clients and Orders -->
      <h6 class="fw-bold mb-2 text-secondary"><i class="bi bi-people me-1"></i> Clientes y Órdenes que Solicitan este Producto:</h6>
      <div class="table-responsive border rounded mb-2">
        <table class="table custom-table table-sm align-middle mb-0">
          <thead class="bg-body-tertiary">
            <tr>
              <th>Cliente / Razón Social</th>
              <th>N° Pedido / Orden</th>
              <th>Fecha Pedido</th>
              <th>Establecimiento</th>
              <th class="text-center">Solicitado</th>
              <th class="text-center">Entregado</th>
              <th class="text-center">Estado Entrega</th>
            </tr>
          </thead>
          <tbody>
            ${product.clientes.map(c => {
              const sol = c.cantidad_solicitada || 0;
              const ent = c.cantidad_entregada || 0;
              const isDone = ent >= sol && sol > 0;
              const isOverdue = c.fecha_entrega && c.fecha_entrega < todayStr;

              let entregaBadge = '';
              if (isDone) {
                entregaBadge = '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-all me-1"></i> Completo</span>';
              } else if (isOverdue) {
                entregaBadge = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-exclamation-triangle-fill me-1"></i> Fuera del plazo</span>';
              } else if (ent > 0) {
                entregaBadge = '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-clock-history me-1"></i> Parcial</span>';
              } else {
                entregaBadge = '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle"><i class="bi bi-clock me-1"></i> Pendiente</span>';
              }

              return `
                <tr>
                  <td>
                    <div class="fw-bold text-body">${escapeHtml(c.nombre_cliente)}</div>
                    ${c.nro_documento ? `<span class="small text-muted">RUC: ${escapeHtml(c.nro_documento)}</span>` : ''}
                  </td>
                  <td>
                    <div class="fw-semibold text-primary">${escapeHtml(c.nro_pedido)}</div>
                    ${c.nro_orden ? `<div class="small text-muted">N° Orden: ${escapeHtml(c.nro_orden)}</div>` : '<div class="small text-muted fs-8">Sin N° Orden</div>'}
                  </td>
                  <td>
                    <div>F. Pedido: ${formatDate(c.fecha_pedido)}</div>
                    <div class="small text-muted">F. Entrega: ${formatDate(c.fecha_entrega)}</div>
                  </td>
                  <td><span class="small text-muted">${escapeHtml(c.establecimiento)}</span></td>
                  <td class="text-center fw-bold text-body">${sol.toLocaleString()}</td>
                  <td class="text-center fw-bold text-success">${ent.toLocaleString()}</td>
                  <td class="text-center">${entregaBadge}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  showBootstrapModal('produccionDetailModal');
}

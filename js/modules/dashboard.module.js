import { escapeHtml } from '../helpers.js';

export function renderDashboard(orders = [], shipments = [], clients = [], products = [], statusData = null) {
  const pendingOrders = orders.filter(o => o.estado === 'PENDIENTE');
  const completedOrders = orders.filter(o => o.estado === 'COMPLETADO');

  let totalProductsCount = (products && Array.isArray(products) && products.length > 0) ? products.length : 0;
  if (!totalProductsCount && statusData && statusData.counts && statusData.counts.productos) {
    totalProductsCount = statusData.counts.productos;
  }
  if (!totalProductsCount && window.app?.statusData?.counts?.productos) {
    totalProductsCount = window.app.statusData.counts.productos;
  }

  let totalClientsCount = (clients && Array.isArray(clients) && clients.length > 0) ? clients.length : 0;
  if (!totalClientsCount && statusData && statusData.counts && statusData.counts.clientes) {
    totalClientsCount = statusData.counts.clientes;
  }
  if (!totalClientsCount && window.app?.statusData?.counts?.clientes) {
    totalClientsCount = window.app.statusData.counts.clientes;
  }

  // Update 5 KPI Cards
  const sTotalO = document.getElementById('statTotalOrders');
  const sPendO = document.getElementById('statPendingOrders');
  const sCompO = document.getElementById('statCompletedOrders');
  const sTotalP = document.getElementById('statTotalProducts');
  const sTotalC = document.getElementById('statTotalClients');

  if (sTotalO) sTotalO.textContent = orders.length;
  if (sPendO) sPendO.textContent = pendingOrders.length;
  if (sCompO) sCompO.textContent = completedOrders.length;
  if (sTotalP) sTotalP.textContent = totalProductsCount;
  if (sTotalC) sTotalC.textContent = totalClientsCount;

  // Render Recent Orders Table
  const tbody = document.getElementById('dashOrdersTable');
  if (tbody) {
    tbody.innerHTML = '';
    const recent = orders.slice(0, 5);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colSpan="5" class="text-center text-muted py-4">No hay pedidos registrados en MySQL.</td></tr>`;
    } else {
      recent.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold text-primary">${o.nro_pedido || ('PED-' + o.id_pedido)}</td>
          <td class="fw-semibold text-truncate" style="max-width:180px;">${escapeHtml(o.nombre_cliente || 'Cliente')}</td>
          <td>${o.fecha_pedido || '-'}</td>
          <td><span class="status-badge ${o.estado || 'PENDIENTE'}">${o.estado || 'PENDIENTE'}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary" onclick="app.viewOrderDetail(${o.id_pedido})">Ver</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Render Charts safely
  renderTopClientsChart(orders);
  renderMonthlyOrdersChart(orders);
  renderTopProductsChart(orders);
}

function renderTopClientsChart(orders) {
  const canvas = document.getElementById('chartTopClients');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window.topClientsChartInstance) {
    window.topClientsChartInstance.destroy();
  }

  const clientCounts = {};
  orders.forEach(o => {
    const name = o.nombre_cliente || 'Cliente General';
    clientCounts[name] = (clientCounts[name] || 0) + 1;
  });

  const labels = Object.keys(clientCounts).slice(0, 5);
  const data = Object.values(clientCounts).slice(0, 5);

  if (labels.length === 0) {
    labels.push('Sin Datos Registrados');
    data.push(0);
  }

  window.topClientsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'N° Pedidos',
        data: data,
        backgroundColor: '#3b82f6',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderMonthlyOrdersChart(orders) {
  const canvas = document.getElementById('chartMonthlyOrders');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window.monthlyOrdersChartInstance) {
    window.monthlyOrdersChartInstance.destroy();
  }

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlyCounts = new Array(12).fill(0);

  orders.forEach(o => {
    if (o.fecha_pedido) {
      const parts = o.fecha_pedido.split('-');
      if (parts.length >= 2) {
        const monthIdx = parseInt(parts[1], 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthlyCounts[monthIdx]++;
        }
      }
    }
  });

  window.monthlyOrdersChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Pedidos',
        data: monthlyCounts,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderTopProductsChart(orders) {
  const canvas = document.getElementById('chartTopProducts');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window.topProductsChartInstance) {
    window.topProductsChartInstance.destroy();
  }

  const prodCounts = {};
  orders.forEach(o => {
    if (o.detalles && Array.isArray(o.detalles)) {
      o.detalles.forEach(d => {
        const name = d.nombre_producto || 'Producto Insumo';
        prodCounts[name] = (prodCounts[name] || 0) + (d.cantidad || 1);
      });
    }
  });

  const labels = Object.keys(prodCounts).slice(0, 5);
  const data = Object.values(prodCounts).slice(0, 5);

  if (labels.length === 0) {
    labels.push('Sin Pedidos Registrados');
    data.push(0);
  }

  window.topProductsChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

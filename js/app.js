class ModularSpaApp {
  constructor() {
    this.currentRoute = 'dashboard';
    this.currentTheme = 'light';
    this.searchQuery = '';
    this.viewCache = {};

    this.orders = [];
    this.shipments = [];
    this.clients = [];
    this.products = [];

    this.orderModal = null;
    this.shipmentModal = null;
    this.clientModal = null;
    this.productModal = null;
    this.orderDetailModal = null;

    this.editingOrderId = null;
    this.editingShipmentId = null;

    this.init();
  }

  async init() {
    this.initBootstrapModals();
    this.bindGlobalEvents();

    // Restore saved theme or default to light
    const savedTheme = localStorage.getItem('inplabel_theme') || 'light';
    this.setTheme(savedTheme);

    // Check initial hash route
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'pedidos', 'envios', 'clientes', 'productos', 'bd'].includes(hash)) {
      this.currentRoute = hash;
    }

    await this.navigateTo(this.currentRoute);
    await this.refreshData();
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('inplabel_theme', theme);

    const logoImg = document.getElementById('brandLogoImg');
    const themeIcon = document.getElementById('themeToggleIcon');
    const themeLabel = document.getElementById('themeToggleLabel');
    const configIcon = document.getElementById('configThemeIcon');
    const configText = document.getElementById('configThemeText');

    if (theme === 'dark') {
      if (logoImg) logoImg.src = 'img/inplabel-logo-dark.png';
      if (themeIcon) {
        themeIcon.className = 'bi bi-sun-fill icon';
        themeIcon.style.color = '#f59e0b';
      }
      if (themeLabel) themeLabel.textContent = 'Modo Claro';

      if (configIcon) {
        configIcon.className = 'bi bi-sun-fill text-warning';
      }
      if (configText) configText.textContent = 'Modo Claro';
    } else {
      if (logoImg) logoImg.src = 'img/inplabel-logo.png';
      if (themeIcon) {
        themeIcon.className = 'bi bi-moon-stars-fill icon';
        themeIcon.style.color = '#10b981';
      }
      if (themeLabel) themeLabel.textContent = 'Modo Oscuro';

      if (configIcon) {
        configIcon.className = 'bi bi-moon-stars-fill text-success';
      }
      if (configText) configText.textContent = 'Modo Oscuro';
    }
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  initBootstrapModals() {
    const oElem = document.getElementById('orderModal');
    const sElem = document.getElementById('shipmentModal');
    const cElem = document.getElementById('clientModal');
    const pElem = document.getElementById('productModal');
    const dElem = document.getElementById('orderDetailModal');

    if (oElem) this.orderModal = new bootstrap.Modal(oElem);
    if (sElem) this.shipmentModal = new bootstrap.Modal(sElem);
    if (cElem) this.clientModal = new bootstrap.Modal(cElem);
    if (pElem) this.productModal = new bootstrap.Modal(pElem);
    if (dElem) this.orderDetailModal = new bootstrap.Modal(dElem);
  }

  bindGlobalEvents() {
    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Sidebar toggle
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        const icon = toggleBtn.querySelector('i');
        if (sidebar.classList.contains('collapsed')) {
          icon.className = 'bi bi-chevron-right';
        } else {
          icon.className = 'bi bi-chevron-left';
        }
      });
    }

    // Navigation routes
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const route = btn.getAttribute('data-route');
        if (route) this.navigateTo(route);
      });
    });

    // Hash change event listener
    window.addEventListener('hashchange', () => {
      const route = window.location.hash.replace('#', '');
      if (route && route !== this.currentRoute) {
        this.navigateTo(route);
      }
    });

    // Global search input
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderCurrentView();
      });
    }

    // Modal Form Submissions
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
      orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveOrder();
      });
    }

    const shipmentForm = document.getElementById('shipmentForm');
    if (shipmentForm) {
      shipmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveShipment();
      });
    }

    const clientForm = document.getElementById('clientForm');
    if (clientForm) {
      clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveClient();
      });
    }

    const productForm = document.getElementById('productForm');
    if (productForm) {
      productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveProduct();
      });
    }
  }

  async navigateTo(route) {
    this.currentRoute = route;
    window.location.hash = `#${route}`;

    // Active link highlighting
    document.querySelectorAll('.nav-item').forEach(btn => {
      if (btn.getAttribute('data-route') === route) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Header Titles
    const titles = {
      dashboard: '<i class="bi bi-speedometer2 text-primary"></i> Panel General de Control',
      pedidos: '<i class="bi bi-cart-check text-primary"></i> Gestión de Pedidos',
      envios: '<i class="bi bi-truck text-primary"></i> Guías y Envíos',
      clientes: '<i class="bi bi-people text-primary"></i> Directorio de Clientes',
      productos: '<i class="bi bi-box-seam text-primary"></i> Catálogo de Productos',
      config: '<i class="bi bi-gear-fill text-primary"></i> Configuración del Sistema',
      bd: '<i class="bi bi-database-check text-primary"></i> Estado Base de Datos'
    };
    const titleElem = document.getElementById('pageTitle');
    if (titleElem) titleElem.innerHTML = titles[route] || 'INPLABEL Pedidos';

    // Asynchronously fetch HTML template view partial
    const container = document.getElementById('viewContainer');
    if (!container) return;

    if (!this.viewCache[route]) {
      try {
        const res = await fetch(`views/${route}.html`);
        if (res.ok) {
          this.viewCache[route] = await res.text();
        } else {
          this.viewCache[route] = `<div class="alert alert-danger">No se pudo cargar la plantilla views/${route}.html</div>`;
        }
      } catch (e) {
        this.viewCache[route] = `<div class="alert alert-danger">Error de red al cargar views/${route}.html</div>`;
      }
    }

    container.innerHTML = this.viewCache[route];
    this.bindViewSpecificEvents();
    this.renderCurrentView();
  }

  bindViewSpecificEvents() {
    const statusFilter = document.getElementById('filterOrderStatus');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.renderCurrentView());
    }
  }

  async refreshData() {
    let statusData = { connected: false };
    let clients = [];
    let products = [];
    let orders = [];
    let shipments = [];

    try {
      [statusData, clients, products, orders, shipments] = await Promise.all([
        api.getStatus(),
        api.getClientes(),
        api.getProductos(),
        api.getPedidos(),
        api.getGuias()
      ]);
    } catch (err) {
      console.warn("Backend Spring Boot offline or unreachable:", err);
    }

    this.clients = clients || [];
    this.products = products || [];
    this.orders = orders || [];
    this.shipments = shipments || [];

    const indicator = document.getElementById('backendStatusIndicator');
    if (indicator) {
      if (statusData && statusData.connected) {
        indicator.className = 'status-badge ACTIVA py-2 px-3 fs-7';
        indicator.style.background = '#f0fdf4';
        indicator.style.color = '#16a34a';
        indicator.style.border = '1px solid #bbf7d0';
        indicator.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Spring Boot: Conectado a MySQL';
      } else {
        indicator.className = 'status-badge CANCELADO py-2 px-3 fs-7';
        indicator.style.background = '#fff1f2';
        indicator.style.color = '#e11d48';
        indicator.style.border = '1px solid #ffe4e6';
        indicator.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Spring Boot: Desconectado';
      }
    }

    this.updateBadges();
    this.renderCurrentView();
  }

  updateBadges() {
    const pendingOrders = this.orders.filter(o => o.estado === 'PENDIENTE');
    const activeShipments = this.shipments.filter(s => s.estado === 'EN_TRANSITO' || s.estado === 'ACTIVA');

    const badgeP = document.getElementById('badgePedidos');
    const badgeE = document.getElementById('badgeEnvios');
    if (badgeP) {
      badgeP.textContent = pendingOrders.length;
      badgeP.classList.toggle('d-none', pendingOrders.length === 0);
    }
    if (badgeE) {
      badgeE.textContent = activeShipments.length;
      badgeE.classList.toggle('d-none', activeShipments.length === 0);
    }
  }

  renderCurrentView() {
    this.updateBadges();
    this.setTheme(this.currentTheme);
    const route = this.currentRoute;

    if (route === 'dashboard') {
      const pendingOrders = this.orders.filter(o => o.estado === 'PENDIENTE');
      const activeShipments = this.shipments.filter(s => s.estado === 'EN_TRANSITO' || s.estado === 'ACTIVA');

      const sTotalO = document.getElementById('statTotalOrders');
      const sPendO = document.getElementById('statPendingOrders');
      const sActS = document.getElementById('statActiveShipments');
      const sTotalC = document.getElementById('statTotalClients');

      if (sTotalO) sTotalO.textContent = this.orders.length;
      if (sPendO) sPendO.textContent = pendingOrders.length;
      if (sActS) sActS.textContent = activeShipments.length;
      if (sTotalC) sTotalC.textContent = this.clients.length;

      this.renderDashboardTable();
    } else if (route === 'pedidos') {
      this.renderPedidosTable();
    } else if (route === 'envios') {
      this.renderEnviosTable();
    } else if (route === 'clientes') {
      this.renderClientesTable();
    } else if (route === 'productos') {
      this.renderProductosTable();
    } else if (route === 'bd') {
      const bdClients = document.getElementById('bdClientsCount');
      const bdProducts = document.getElementById('bdProductsCount');
      if (bdClients) bdClients.textContent = `${this.clients.length} Clientes`;
      if (bdProducts) bdProducts.textContent = `${this.products.length} Productos`;
    }
  }

  renderDashboardTable() {
    const tbody = document.getElementById('dashOrdersTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    const recent = this.orders.slice(0, 5);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colSpan="5" class="text-center text-muted py-4">No hay pedidos registrados en MySQL.</td></tr>`;
    } else {
      recent.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold text-primary">${o.nro_pedido || ('PED-' + o.id_pedido)}</td>
          <td class="fw-semibold text-truncate" style="max-width:200px;">${this.escape(o.nombre_cliente || 'Cliente')}</td>
          <td>${o.fecha_pedido || '-'}</td>
          <td><span class="status-badge ${o.estado || 'PENDIENTE'}">${o.estado || 'PENDIENTE'}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-secondary" onclick="app.viewOrderDetail(${o.id_pedido})">Ver</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    const shipList = document.getElementById('dashShipmentsList');
    if (shipList) {
      shipList.innerHTML = '';
      const recentS = this.shipments.slice(0, 4);
      if (recentS.length === 0) {
        shipList.innerHTML = `<div class="text-muted small">No hay guías activas.</div>`;
      } else {
        recentS.forEach(s => {
          shipList.innerHTML += `
            <div class="p-3 border rounded bg-light">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <strong class="text-primary">${s.nro_guia}</strong>
                <span class="status-badge ${s.estado || 'ACTIVA'}">${s.estado || 'ACTIVA'}</span>
              </div>
              <div class="small fw-semibold text-dark">${this.escape(s.nombre_cliente || 'Cliente')}</div>
            </div>
          `;
        });
      }
    }
  }

  renderPedidosTable() {
    const tbody = document.getElementById('pedidosTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filterVal = document.getElementById('filterOrderStatus')?.value || 'ALL';

    const filtered = this.orders.filter(o => {
      const matchStatus = filterVal === 'ALL' || o.estado === filterVal;
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || 
        (o.nro_pedido && o.nro_pedido.toLowerCase().includes(q)) || 
        (o.nombre_cliente && o.nombre_cliente.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });

    const badge = document.getElementById('ordersCountBadge');
    if (badge) badge.textContent = `${filtered.length} registros`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colSpan="5" class="text-center text-muted py-4">No se encontraron pedidos.</td></tr>`;
      return;
    }

    filtered.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold text-primary">${o.nro_pedido || ('PED-' + o.id_pedido)}</td>
        <td class="fw-semibold">${this.escape(o.nombre_cliente || 'Cliente')}</td>
        <td>${o.fecha_pedido || '-'}</td>
        <td><span class="status-badge ${o.estado || 'PENDIENTE'}">${o.estado || 'PENDIENTE'}</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-secondary me-1" onclick="app.viewOrderDetail(${o.id_pedido})">Detalle</button>
          <button class="btn btn-sm btn-outline-primary" onclick="app.openEditOrderModal(${o.id_pedido})">Modificar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderEnviosTable() {
    const tbody = document.getElementById('enviosTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.shipments.filter(s => {
      const q = this.searchQuery.toLowerCase();
      return !q || 
        (s.nro_guia && s.nro_guia.toLowerCase().includes(q)) || 
        (s.nombre_cliente && s.nombre_cliente.toLowerCase().includes(q));
    });

    const badge = document.getElementById('shipmentsCountBadge');
    if (badge) badge.textContent = `${filtered.length} guías`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colSpan="5" class="text-center text-muted py-4">No se encontraron guías.</td></tr>`;
      return;
    }

    filtered.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold text-primary">${s.nro_guia}</td>
        <td>
          <div class="fw-semibold">${this.escape(s.nombre_cliente || 'Cliente')}</div>
          <div class="small text-muted">📍 ${this.escape(s.direccion_destino || 'Dirección fiscal')}</div>
        </td>
        <td>${s.fecha_guia || '-'}</td>
        <td><span class="status-badge ${s.estado || 'ACTIVA'}">${s.estado || 'ACTIVA'}</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary" onclick="app.openEditShipmentModal(${s.id_guia})">Modificar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderClientesTable() {
    const tbody = document.getElementById('clientesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.clients.filter(c => {
      const q = this.searchQuery.toLowerCase();
      return !q || 
        (c.nombre_cliente && c.nombre_cliente.toLowerCase().includes(q)) || 
        (c.nro_documento && c.nro_documento.includes(q));
    });

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold"><span class="small text-muted d-block">${c.tipo_documento || 'RUC'}</span>${c.nro_documento}</td>
        <td class="fw-semibold">${this.escape(c.nombre_cliente || '-')}</td>
        <td class="small text-muted">${this.escape(c.direccion || 'No especificada')}</td>
        <td><span class="status-badge COMPLETADO">ACTIVO</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderProductosTable() {
    const tbody = document.getElementById('productosTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = this.products.filter(p => {
      const q = this.searchQuery.toLowerCase();
      return !q || (p.nombre_producto && p.nombre_producto.toLowerCase().includes(q));
    });

    filtered.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-bold text-muted">#${p.id_producto}</td>
        <td class="fw-semibold">${this.escape(p.nombre_producto)}</td>
        <td><span class="badge bg-light text-dark border">${p.categoria || 'Etiquetas & Insumos'}</span></td>
        <td><span class="status-badge COMPLETADO">ACTIVO</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  openNewOrderModal() {
    this.editingOrderId = null;
    document.getElementById('orderModalTitle').textContent = 'Ingresar Nuevo Pedido';
    document.getElementById('orderDateField').value = new Date().toISOString().split('T')[0];
    document.getElementById('orderStatusSelect').value = 'PENDIENTE';

    this.populateClientSelect('orderClientSelect');
    this.resetProductRows();
    if (this.orderModal) this.orderModal.show();
  }

  openEditOrderModal(id) {
    const ord = this.orders.find(o => o.id_pedido === id);
    if (!ord) return;
    this.editingOrderId = id;

    document.getElementById('orderModalTitle').textContent = `Modificar Pedido #${ord.nro_pedido}`;
    document.getElementById('orderDateField').value = ord.fecha_pedido || new Date().toISOString().split('T')[0];
    document.getElementById('orderStatusSelect').value = ord.estado || 'PENDIENTE';

    this.populateClientSelect('orderClientSelect', ord.id_cliente);
    this.resetProductRows(ord.detalles);
    if (this.orderModal) this.orderModal.show();
  }

  populateClientSelect(selectId, selectedId = null) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '';
    this.clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id_cliente;
      opt.textContent = `${c.nro_documento} - ${c.nombre_cliente}`;
      if (selectedId && String(c.id_cliente) === String(selectedId)) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  resetProductRows(detalles = null) {
    const container = document.getElementById('orderProductRowsContainer');
    if (!container) return;
    container.innerHTML = '';

    const items = detalles && detalles.length > 0 ? detalles : [{ id_producto: this.products[0]?.id_producto || '', cantidad: 1 }];
    items.forEach((item) => {
      this.addOrderProductRow(item.id_producto, item.cantidad);
    });
  }

  addOrderProductRow(selectedProdId = '', qty = 1) {
    const container = document.getElementById('orderProductRowsContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'd-flex gap-2 align-items-center product-row';

    let optionsHtml = '<option value="">Seleccione producto...</option>';
    this.products.forEach(p => {
      const sel = String(p.id_producto) === String(selectedProdId) ? 'selected' : '';
      optionsHtml += `<option value="${p.id_producto}" ${sel}>${this.escape(p.nombre_producto)}</option>`;
    });

    row.innerHTML = `
      <select class="form-select prod-select" required>${optionsHtml}</select>
      <input type="number" class="form-control prod-qty" style="width:100px;" min="1" value="${qty}" required>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()"><i class="bi bi-trash"></i></button>
    `;
    container.appendChild(row);
  }

  async handleSaveOrder() {
    const clientId = document.getElementById('orderClientSelect').value;
    const fecha = document.getElementById('orderDateField').value;
    const estado = document.getElementById('orderStatusSelect').value;

    const detalles = [];
    document.querySelectorAll('.product-row').forEach(row => {
      const pId = row.querySelector('.prod-select').value;
      const q = row.querySelector('.prod-qty').value;
      if (pId) detalles.push({ id_producto: Number(pId), cantidad: Number(q) || 1 });
    });

    const payload = {
      id_cliente: Number(clientId),
      fecha_pedido: fecha,
      estado: estado,
      detalles: detalles
    };

    if (this.editingOrderId) {
      await api.updatePedido(this.editingOrderId, payload);
    } else {
      await api.addPedido(payload);
    }

    if (this.orderModal) this.orderModal.hide();
    await this.refreshData();
    this.renderCurrentView();
  }

  openNewShipmentModal() {
    this.editingShipmentId = null;
    document.getElementById('shipmentModalTitle').textContent = 'Registrar Guía de Envío';
    document.getElementById('shipmentNroInput').value = '';
    document.getElementById('shipmentDateField').value = new Date().toISOString().split('T')[0];
    document.getElementById('shipmentStatusSelect').value = 'EN_TRANSITO';

    this.populateClientSelect('shipmentClientSelect');
    if (this.shipmentModal) this.shipmentModal.show();
  }

  openEditShipmentModal(id) {
    const s = this.shipments.find(ship => ship.id_guia === id);
    if (!s) return;
    this.editingShipmentId = id;

    document.getElementById('shipmentModalTitle').textContent = `Modificar Guía #${s.nro_guia}`;
    document.getElementById('shipmentNroInput').value = s.nro_guia || '';
    document.getElementById('shipmentDateField').value = s.fecha_guia || new Date().toISOString().split('T')[0];
    document.getElementById('shipmentStatusSelect').value = s.estado || 'EN_TRANSITO';

    this.populateClientSelect('shipmentClientSelect', s.id_cliente);
    if (this.shipmentModal) this.shipmentModal.show();
  }

  async handleSaveShipment() {
    const nroGuia = document.getElementById('shipmentNroInput').value;
    const clientId = document.getElementById('shipmentClientSelect').value;
    const fecha = document.getElementById('shipmentDateField').value;
    const estado = document.getElementById('shipmentStatusSelect').value;

    const payload = {
      nro_guia: nroGuia,
      id_cliente: Number(clientId),
      fecha_guia: fecha,
      estado: estado
    };

    if (this.editingShipmentId) {
      await api.updateGuia(this.editingShipmentId, payload);
    } else {
      await api.addGuia(payload);
    }

    if (this.shipmentModal) this.shipmentModal.hide();
    await this.refreshData();
    this.renderCurrentView();
  }

  openNewClientModal() {
    if (this.clientModal) this.clientModal.show();
  }

  async handleSaveClient() {
    const tipo = document.getElementById('clientDocType').value;
    const nro = document.getElementById('clientDocNumber').value;
    const nombre = document.getElementById('clientName').value;
    const dir = document.getElementById('clientAddress').value;

    await api.addCliente({
      tipo_documento: tipo,
      nro_documento: nro,
      nombre_cliente: nombre,
      direccion: dir
    });

    if (this.clientModal) this.clientModal.hide();
    await this.refreshData();
    this.renderCurrentView();
  }

  openNewProductModal() {
    if (this.productModal) this.productModal.show();
  }

  async handleSaveProduct() {
    const nombre = document.getElementById('productNameInput').value;
    const cat = document.getElementById('productCategoryInput').value;

    await api.addProducto({
      nombre_producto: nombre,
      categoria: cat
    });

    if (this.productModal) this.productModal.hide();
    await this.refreshData();
    this.renderCurrentView();
  }

  viewOrderDetail(id) {
    const ord = this.orders.find(o => o.id_pedido === id);
    if (!ord) return;

    document.getElementById('orderDetailTitle').textContent = `Detalle de Pedido #${ord.nro_pedido}`;
    const body = document.getElementById('orderDetailBody');

    let rowsHtml = '';
    if (ord.detalles && ord.detalles.length > 0) {
      ord.detalles.forEach((d, idx) => {
        rowsHtml += `
          <tr>
            <td>${idx + 1}</td>
            <td class="fw-semibold">${this.escape(d.nombre_producto || 'Producto')}</td>
            <td class="text-center fw-bold">${d.cantidad}</td>
          </tr>
        `;
      });
    } else {
      rowsHtml = `<tr><td colSpan="3" class="text-center text-muted">Sin ítems registrados.</td></tr>`;
    }

    body.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
        <div>
          <h5 class="fw-bold mb-1">${this.escape(ord.nombre_cliente || 'Cliente')}</h5>
          <div class="small text-muted">Documento: ${ord.nro_documento || 'N/A'}</div>
        </div>
        <div class="text-end">
          <span class="status-badge ${ord.estado || 'PENDIENTE'} mb-1">${ord.estado || 'PENDIENTE'}</span>
          <div class="small text-muted">Fecha: ${ord.fecha_pedido || '-'}</div>
        </div>
      </div>

      <h6 class="fw-bold mb-2">Productos Solicitados</h6>
      <table class="table table-bordered mb-0">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Producto / Insumo</th>
            <th class="text-center">Cantidad</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    if (this.orderDetailModal) this.orderDetailModal.show();
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

const app = new ModularSpaApp();

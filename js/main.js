import { api } from './api.js';
import { themeManager } from './theme.js';
import { Router } from './router.js';
import { escapeHtml } from './helpers.js';

import { renderDashboard } from './modules/dashboard.module.js';
import { 
  renderPedidosTable, 
  populateClientSelect, 
  resetProductRows, 
  addOrderProductRow,
  openFinalizarOrdenModal,
  toggleFinalizarFields,
  saveFinalizarOrden,
  openRegistrarEnvioModal,
  saveRegistrarEnvio,
  viewOrderDetail
} from './modules/pedidos.module.js';
import { 
  renderNuevoPedidoPage, 
  hasUnsavedChanges, 
  clearSelectedClient, 
  openAdelantoModal, 
  addAdelantoFromModal, 
  removeAdelanto, 
  onCondicionPagoChange, 
  submitNuevoPedido, 
  updateItemQty, 
  removeOrderItem,
  handleFilesAttached,
  removeAttachedFile
} from './modules/nuevo-pedido.module.js';
import { renderEnviosTable } from './modules/envios.module.js';
import { 
  renderClientesTable, 
  filterClientes, 
  openNewClientModal, 
  onTipoDocChange,
  onNroDocInput, 
  consultarSunatManual, 
  saveClientFromModal 
} from './modules/clientes.module.js';
import { 
  renderProductosTable, 
  filterProductos, 
  openNewProductModal, 
  openEditProductModal, 
  saveProductFromModal, 
  deleteProduct 
} from './modules/productos.module.js';
import { renderConfigView, saveStorageConfig } from './modules/config.module.js';

// Attach modules globally for inline HTML event handlers
window.nuevoPedidoModule = {
  clearSelectedClient,
  openAdelantoModal,
  addAdelantoFromModal,
  removeAdelanto,
  onCondicionPagoChange,
  submitNuevoPedido,
  updateItemQty,
  removeOrderItem,
  handleFilesAttached,
  removeAttachedFile
};

window.clientesModule = {
  filterClientes,
  openNewClientModal,
  onTipoDocChange,
  onNroDocInput,
  consultarSunatManual,
  saveClientFromModal
};

window.pedidosModule = {
  openFinalizarOrdenModal,
  toggleFinalizarFields,
  saveFinalizarOrden,
  openRegistrarEnvioModal,
  saveRegistrarEnvio,
  viewOrderDetail
};

window.productosModule = {
  filterProductos,
  openNewProductModal,
  openEditProductModal,
  saveProductFromModal,
  deleteProduct
};

window.configModule = {
  saveStorageConfig
};

class ModularSpaApp {
  constructor() {
    window.app = this;
    this.searchQuery = '';

    this.orders = [];
    this.shipments = [];
    this.clients = [];
    this.products = [];
    this.statusData = null;

    this.orderModal = null;
    this.shipmentModal = null;
    this.clientModal = null;
    this.productModal = null;
    this.orderDetailModal = null;

    this.editingOrderId = null;
    this.editingShipmentId = null;

    this.router = new Router((route) => {
      this.bindViewSpecificEvents();
      this.renderCurrentView();
    });

    this.init();
  }

  async init() {
    try {
      this.initBootstrapModals();
    } catch (e) {
      console.warn("Bootstrap modal init error:", e);
    }

    try {
      this.bindGlobalEvents();
    } catch (e) {
      console.warn("Global events bind error:", e);
    }

    try {
      themeManager.initTheme();
    } catch (e) {}

    const hash = window.location.hash.replace('#', '');
    const initialRoute = (hash && ['dashboard', 'pedidos', 'nuevo-pedido', 'envios', 'clientes', 'productos', 'config', 'bd'].includes(hash))
      ? hash
      : 'dashboard';

    // Navigate to initial route immediately for instant template rendering
    this.router.navigateTo(initialRoute);

    // Refresh backend data asynchronously
    this.refreshData();
  }

  get currentRoute() {
    return this.router.currentRoute;
  }

  navigateTo(route) {
    if (this.currentRoute === 'nuevo-pedido' && route !== 'nuevo-pedido' && typeof hasUnsavedChanges === 'function' && hasUnsavedChanges()) {
      if (!confirm('¿Está seguro de salir? Hay datos no guardados en el formulario de pedido.')) {
        return;
      }
    }
    this.router.navigateTo(route);
  }

  openNewOrderModal() {
    this.navigateTo('nuevo-pedido');
  }

  confirmLeaveNuevoPedido() {
    if (this.currentRoute === 'nuevo-pedido' && typeof hasUnsavedChanges === 'function' && hasUnsavedChanges()) {
      if (!confirm('¿Está seguro de salir? Hay datos no guardados en el formulario de pedido.')) {
        return;
      }
    }
    this.router.navigateTo('pedidos');
  }

  triggerPedidosSearch() {
    this.renderCurrentView();
  }

  setTheme(theme) {
    themeManager.setTheme(theme);
  }

  toggleTheme() {
    themeManager.toggleTheme();
  }

  initBootstrapModals() {
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) return;
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

    // Clean any orphaned modal backdrops automatically
    document.addEventListener('click', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('pointer-events');
      }
    });

    // Global double-click handler for date inputs to open native calendar picker
    document.addEventListener('dblclick', (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'date') {
        if (typeof e.target.showPicker === 'function') {
          try {
            e.target.showPicker();
          } catch (err) {}
        }
      }
    });

    // Sidebar toggle
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
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
      btn.addEventListener('click', () => {
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
  }

  bindViewSpecificEvents() {
    ['filterOrderStatus', 'filterEstablishment', 'filterDateFrom', 'filterDateTo'].forEach(id => {
      const elem = document.getElementById(id);
      if (elem && !elem.dataset.boundChange) {
        elem.dataset.boundChange = 'true';
        elem.addEventListener('change', () => this.renderCurrentView());
      }
    });

    const searchClientName = document.getElementById('searchClientNameInput');
    if (searchClientName && !searchClientName.dataset.boundEnter) {
      searchClientName.dataset.boundEnter = 'true';
      searchClientName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.renderCurrentView();
        }
      });
    }
  }

  async refreshData() {
    let statusData = { connected: false };
    let clients = [];
    let products = [];
    let orders = [];
    let shipments = [];

    try {
      const results = await Promise.allSettled([
        api.getStatus(),
        api.getClientes(),
        api.getProductos(),
        api.getPedidos(),
        api.getGuias()
      ]);

      if (results[0].status === 'fulfilled' && results[0].value) statusData = results[0].value;
      if (results[1].status === 'fulfilled' && results[1].value) clients = results[1].value;
      if (results[2].status === 'fulfilled' && results[2].value) products = results[2].value;
      if (results[3].status === 'fulfilled' && results[3].value) orders = results[3].value;
      if (results[4].status === 'fulfilled' && results[4].value) shipments = results[4].value;
    } catch (err) {
      console.warn("Backend Spring Boot offline or unreachable:", err);
    }

    this.statusData = statusData;
    this.clients = clients || [];
    this.products = products || [];
    this.orders = orders || [];
    this.shipments = shipments || [];

    const indicator = document.getElementById('backendStatusIndicator');
    if (indicator) {
      indicator.removeAttribute('style');
      if (statusData && statusData.connected) {
        indicator.className = 'status-badge ACTIVA py-2 px-3 fs-7';
        indicator.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Spring Boot: Conectado a MySQL';
      } else {
        indicator.className = 'status-badge CANCELADO py-2 px-3 fs-7';
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
    const route = this.currentRoute;

    try {
      if (route === 'dashboard') {
        renderDashboard(this.orders, this.shipments, this.clients, this.products, this.statusData);
      } else if (route === 'pedidos') {
        renderPedidosTable(this.orders, this.searchQuery);
      } else if (route === 'nuevo-pedido') {
        renderNuevoPedidoPage(this.clients, this.products);
      } else if (route === 'envios') {
        renderEnviosTable(this.shipments, this.searchQuery);
      } else if (route === 'clientes') {
        renderClientesTable(this.clients, this.searchQuery);
      } else if (route === 'productos') {
        renderProductosTable(this.products, this.searchQuery);
      } else if (route === 'config' || route === 'bd') {
        renderConfigView(this.clients.length, this.products.length);
      }
    } catch (err) {
      console.error("Error rendering view:", route, err);
    }
  }

  viewOrderDetail(idPedido) {
    viewOrderDetail(idPedido);
  }
}

export const app = new ModularSpaApp();
window.app = app;

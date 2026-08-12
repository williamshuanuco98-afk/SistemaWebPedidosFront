export class Router {
  constructor(onRouteRender) {
    this.currentRoute = 'dashboard';
    this.viewCache = {};
    this.onRouteRender = onRouteRender;
  }

  async navigateTo(route) {
    // Remove any leftover Bootstrap modal backdrops and restore body state
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('pointer-events');

    this.currentRoute = route;
    window.location.hash = `#${route}`;

    // Update active nav-item highlight
    document.querySelectorAll('.nav-item').forEach(btn => {
      if (btn.getAttribute('data-route') === route) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update header title
    const titles = {
      dashboard: '<i class="bi bi-speedometer2 text-primary"></i> Panel General de Control',
      pedidos: '<i class="bi bi-cart-check text-primary"></i> Pedidos',
      'nuevo-pedido': '<i class="bi bi-cart-plus text-primary"></i> Registrar Nuevo Pedido',
      envios: '<i class="bi bi-truck text-primary"></i> Guías ',
      clientes: '<i class="bi bi-people text-primary"></i> Clientes',
      productos: '<i class="bi bi-box-seam text-primary"></i> Productos',
      config: '<i class="bi bi-gear-fill text-primary"></i> Configuración del Sistema',
      bd: '<i class="bi bi-database-check text-primary"></i> Estado Base de Datos'
    };

    const titleElem = document.getElementById('pageTitle');
    if (titleElem) titleElem.innerHTML = titles[route] || 'INPLABEL Pedidos';

    // Fetch view partial asynchronously
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

    if (typeof this.onRouteRender === 'function') {
      try {
        this.onRouteRender(route);
      } catch (err) {
        console.error(`Error rendering route ${route}:`, err);
      }
    }
  }
}

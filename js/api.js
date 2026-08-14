const BASE_URL = 'http://localhost:8080/api';

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 1500, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Fallback Initial Data when Spring Boot Backend is Offline
const FALLBACK_CLIENTS = [
  { id: 1, nro_documento: '20601234567', nombre_cliente: 'INVERSIONES PLASTICAS S.A.C.', direccion: 'Av. Industrial 450, Comas, Lima', tipo_doc: 'RUC', estado: 'ACTIVO' },
  { id: 2, nro_documento: '20509876543', nombre_cliente: 'DISTRIBUIDORA Y PACKAGING PERU E.I.R.L.', direccion: 'Calle Los Cedros 128, Carabayllo, Lima', tipo_doc: 'RUC', estado: 'ACTIVO' },
  { id: 3, nro_documento: '10458796321', nombre_cliente: 'AGUIRRE ALVAREZ CARLOS EDUARDO', direccion: 'Jr. Comercio 880, Los Olivos, Lima', tipo_doc: 'DNI', estado: 'ACTIVO' }
];

const FALLBACK_PRODUCTS = [
  { id: 1, codigo_producto: 'PROD-438', nombre_producto: 'BALDE INDUSTRIAL 4 LT C/BLANCO', tipo_producto: 'GALONES', estado: 'ACTIVO' },
  { id: 2, codigo_producto: 'PROD-502', nombre_producto: 'FRASCO PET 500 ML TRANSPARENTE', tipo_producto: 'FRASCOS', estado: 'ACTIVO' },
  { id: 3, codigo_producto: 'PROD-109', nombre_producto: 'TAPA ROSCA 28 MM AZUL', tipo_producto: 'TAPAS', estado: 'ACTIVO' },
  { id: 4, codigo_producto: 'PROD-773', nombre_producto: 'GALONERO PLASTICO 5 LT HEAVY', tipo_producto: 'GALONES', estado: 'ACTIVO' },
  { id: 5, codigo_producto: 'PROD-210', nombre_producto: 'ASA PLASTICA REFORZADA 4L', tipo_producto: 'ASAS', estado: 'ACTIVO' }
];

const FALLBACK_ORDERS = [
  {
    id_pedido: 1,
    nro_pedido: 'PED-0001',
    nro_orden: 'OC-2026-089',
    nombre_cliente: 'INVERSIONES PLASTICAS S.A.C.',
    nro_documento_cliente: '20601234567',
    fecha_pedido: '2026-08-10',
    fecha_entrega: '2026-08-20',
    establecimiento: 'CARABAYLLO',
    condicion_pago: 'CONTADO',
    estado: 'PENDIENTE',
    detalles: [
      { id_detalle: 1, id_producto: 1, codigo_producto: 'PROD-438', nombre_producto: 'BALDE INDUSTRIAL 4 LT C/BLANCO', cantidad: 500, cantidad_entregada: 200 },
      { id_detalle: 2, id_producto: 3, codigo_producto: 'PROD-109', nombre_producto: 'TAPA ROSCA 28 MM AZUL', cantidad: 500, cantidad_entregada: 500 }
    ]
  },
  {
    id_pedido: 2,
    nro_pedido: 'PED-0002',
    nro_orden: 'OC-2026-104',
    nombre_cliente: 'DISTRIBUIDORA Y PACKAGING PERU E.I.R.L.',
    nro_documento_cliente: '20509876543',
    fecha_pedido: '2026-08-12',
    fecha_entrega: '2026-08-25',
    establecimiento: 'COMAS',
    condicion_pago: 'CREDITO',
    estado: 'PENDIENTE',
    detalles: [
      { id_detalle: 3, id_producto: 2, codigo_producto: 'PROD-502', nombre_producto: 'FRASCO PET 500 ML TRANSPARENTE', cantidad: 1000, cantidad_entregada: 0 }
    ]
  }
];

const FALLBACK_SHIPMENTS = [];

function getLocalData(key, fallback) {
  try {
    const raw = localStorage.getItem('inplabel_' + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (key === 'guias' && Array.isArray(parsed) && parsed.some(g => g.nro_guia === 'G001-000458')) {
        const cleaned = parsed.filter(g => g.nro_guia !== 'G001-000458');
        localStorage.setItem('inplabel_guias', JSON.stringify(cleaned));
        return cleaned;
      }
      return parsed;
    }
  } catch (e) {}
  localStorage.setItem('inplabel_' + key, JSON.stringify(fallback));
  return fallback;
}

function setLocalData(key, data) {
  try {
    localStorage.setItem('inplabel_' + key, JSON.stringify(data));
  } catch (e) {}
}

export const api = {
  getLocalClientes() {
    return getLocalData('clientes', FALLBACK_CLIENTS);
  },
  getLocalProductos() {
    return getLocalData('productos', FALLBACK_PRODUCTS);
  },
  getLocalPedidos() {
    return getLocalData('pedidos', FALLBACK_ORDERS);
  },
  getLocalGuias() {
    return getLocalData('guias', FALLBACK_SHIPMENTS);
  },

  async getStatus() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/status`, { timeout: 1500 });
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { connected: false, message: 'Spring Boot Backend Desconectado (Modo Local Activo)' };
  },

  async getClientes() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clientes`, { timeout: 1500 });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
    return getLocalData('clientes', FALLBACK_CLIENTS);
  },

  async addCliente(clienteData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData),
        timeout: 2000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const list = getLocalData('clientes', FALLBACK_CLIENTS);
    const newClient = { id: Date.now(), ...clienteData };
    list.unshift(newClient);
    setLocalData('clientes', list);
    return newClient;
  },

  async consultarSunatRuc(ruc) {
    if (!ruc || (ruc.length !== 11 && ruc.length !== 8)) {
      return { success: false };
    }
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clientes/sunat/${ruc}`, { timeout: 2000 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch (e) {}

    try {
      const res = await fetchWithTimeout(`https://api.apis.net.pe/v1/ruc?numero=${ruc}`, { timeout: 2000 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.nombre) {
          return {
            success: true,
            nro_documento: ruc,
            nombre_cliente: data.nombre,
            direccion: data.direccion || `${data.viaNombre || ''} ${data.distrito || ''} ${data.departamento || ''}`.trim(),
            estado: data.estado || 'ACTIVO',
            condicion: data.condicion || 'HABIDO'
          };
        }
      }
    } catch (e) {}

    return { success: false };
  },

  async consultarDni(dni) {
    if (!dni || dni.length !== 8) {
      return { success: false };
    }
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clientes/dni/${dni}`, { timeout: 2000 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch (e) {}

    try {
      const res = await fetchWithTimeout(`https://api.apis.net.pe/v1/dni?numero=${dni}`, { timeout: 2000 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.nombre) {
          return {
            success: true,
            nro_documento: dni,
            nombre_cliente: data.nombre,
            nombres: data.nombres,
            apellidoPaterno: data.apellidoPaterno,
            apellidoMaterno: data.apellidoMaterno
          };
        }
      }
    } catch (e) {}

    return { success: false };
  },

  async getProductos() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/productos`, { timeout: 1500 });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
    return getLocalData('productos', FALLBACK_PRODUCTS);
  },

  async addProducto(productoData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoData),
        timeout: 2000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const list = getLocalData('productos', FALLBACK_PRODUCTS);
    const newProd = { id: Date.now(), codigo_producto: 'PROD-' + Math.floor(100 + Math.random() * 900), ...productoData };
    list.unshift(newProd);
    setLocalData('productos', list);
    return newProd;
  },

  async updateProducto(id, productoData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoData),
        timeout: 2000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const list = getLocalData('productos', FALLBACK_PRODUCTS);
    const idx = list.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...productoData };
      setLocalData('productos', list);
      return list[idx];
    }
    return null;
  },

  async deleteProducto(id) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/productos/${id}`, {
        method: 'DELETE',
        timeout: 2000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    let list = getLocalData('productos', FALLBACK_PRODUCTS);
    list = list.filter(p => String(p.id) !== String(id));
    setLocalData('productos', list);
    return { success: true };
  },

  async getPedidos() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/pedidos`, { timeout: 1500 });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
    return getLocalData('pedidos', FALLBACK_ORDERS);
  },

  async addPedido(pedidoData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoData),
        timeout: 2500
      });
      if (res.ok) {
        const created = await res.json();
        const list = getLocalData('pedidos', FALLBACK_ORDERS);
        list.unshift(created);
        setLocalData('pedidos', list);
        return created;
      }
    } catch (e) {}
    const list = getLocalData('pedidos', FALLBACK_ORDERS);
    const newOrder = {
      id_pedido: Date.now(),
      nro_pedido: 'PED-' + String(list.length + 1).padStart(4, '0'),
      estado: 'PENDIENTE',
      fecha_pedido: pedidoData.fecha_pedido || new Date().toISOString().split('T')[0],
      fecha_entrega: pedidoData.fecha_entrega || pedidoData.fecha_pedido || new Date().toISOString().split('T')[0],
      nro_orden: pedidoData.nro_orden || pedidoData.nro_orden_compra || '',
      ...pedidoData
    };
    list.unshift(newOrder);
    setLocalData('pedidos', list);
    return newOrder;
  },

  async createPedido(pedidoData) {
    return this.addPedido(pedidoData);
  },

  async updatePedidoStatus(idPedido, payload) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/pedidos/${idPedido}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 2000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const list = getLocalData('pedidos', FALLBACK_ORDERS);
    const order = list.find(o => String(o.id_pedido) === String(idPedido));
    if (order) {
      if (payload.estado) order.estado = payload.estado;
      setLocalData('pedidos', list);
      return order;
    }
    return null;
  },

  async updatePedido(id, fields) {
    return this.updatePedidoStatus(id, fields);
  },

  async getGuias() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/guias`, { timeout: 1500 });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
    return getLocalData('guias', FALLBACK_SHIPMENTS);
  },

  async getNextGuiaNumber(serie = 'GR001') {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/guias/next-number?serie=${encodeURIComponent(serie)}`, { timeout: 1500 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.next_nro_guia) return data.next_nro_guia;
      }
    } catch (e) {}

    const list = getLocalData('guias', FALLBACK_SHIPMENTS);
    const prefix = serie.toUpperCase().startsWith('GR002') ? 'GR002' : 'GR001';
    let maxNum = 0;
    list.forEach(g => {
      if (g.nro_guia && g.nro_guia.startsWith(prefix + '-')) {
        const parts = g.nro_guia.split('-');
        if (parts[1]) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
    return `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
  },

  async addGuia(guiaData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/guias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guiaData),
        timeout: 2000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const list = getLocalData('guias', FALLBACK_SHIPMENTS);
    const newGuia = {
      id_guia: Date.now(),
      estado: 'EMITIDA',
      fecha_guia: guiaData.fecha_guia || new Date().toISOString().split('T')[0],
      ...guiaData
    };
    list.unshift(newGuia);
    setLocalData('guias', list);
    return newGuia;
  },

  async createGuia(guiaData) {
    return this.addGuia(guiaData);
  },

  async updateGuia(id, fields) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/guias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
        timeout: 2000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async anularGuia(id, motivo) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/guias/${id}/anular`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo_anulacion: motivo }),
        timeout: 2000
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const list = getLocalData('guias', FALLBACK_SHIPMENTS);
    const g = list.find(x => String(x.id_guia) === String(id));
    if (g) {
      g.estado = 'ANULADA';
      g.motivo_anulacion = motivo;
      setLocalData('guias', list);
      return g;
    }
    return null;
  }
};

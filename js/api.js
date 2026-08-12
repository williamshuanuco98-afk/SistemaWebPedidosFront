const BASE_URL = 'http://localhost:8080/api';

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 5000, ...fetchOptions } = options;
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

export const api = {
  async getStatus() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/status`, { timeout: 3000 });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { connected: false };
  },

  async getClientes() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clientes`, { timeout: 4000 });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addCliente(clienteData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData),
        timeout: 5000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getProductos() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/productos`, { timeout: 4000 });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addProducto(productoData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoData),
        timeout: 5000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getPedidos() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/pedidos`, { timeout: 4000 });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addPedido(pedidoData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoData),
        timeout: 6000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { id_pedido: Date.now(), nro_pedido: 'PED-' + Math.floor(1000 + Math.random() * 9000) };
  },

  async createPedido(pedidoData) {
    return this.addPedido(pedidoData);
  },

  async updatePedido(id, fields) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
        timeout: 5000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getGuias() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/guias`, { timeout: 4000 });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addGuia(guiaData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/guias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guiaData),
        timeout: 5000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updateGuia(id, fields) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/guias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
        timeout: 5000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }
};

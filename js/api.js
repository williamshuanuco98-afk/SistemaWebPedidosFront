const BASE_URL = 'http://localhost:8080/api';

const api = {
  async getStatus() {
    try {
      const res = await fetch(`${BASE_URL}/status`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { connected: false };
  },

  async getClientes() {
    try {
      const res = await fetch(`${BASE_URL}/clientes`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addCliente(clienteData) {
    try {
      const res = await fetch(`${BASE_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getProductos() {
    try {
      const res = await fetch(`${BASE_URL}/productos`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addProducto(productoData) {
    try {
      const res = await fetch(`${BASE_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getPedidos() {
    try {
      const res = await fetch(`${BASE_URL}/pedidos`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addPedido(pedidoData) {
    try {
      const res = await fetch(`${BASE_URL}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updatePedido(id, fields) {
    try {
      const res = await fetch(`${BASE_URL}/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getGuias() {
    try {
      const res = await fetch(`${BASE_URL}/guias`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addGuia(guiaData) {
    try {
      const res = await fetch(`${BASE_URL}/guias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guiaData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updateGuia(id, fields) {
    try {
      const res = await fetch(`${BASE_URL}/guias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }
};

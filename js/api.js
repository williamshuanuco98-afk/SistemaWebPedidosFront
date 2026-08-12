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

  async consultarSunatRuc(ruc) {
    if (!ruc || (ruc.length !== 11 && ruc.length !== 8)) {
      return { success: false };
    }

    // 1. Try Spring Boot backend SUNAT endpoint
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clientes/sunat/${ruc}`, { timeout: 4000 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch (e) {}

    // 2. Direct fallback to public SUNAT API
    try {
      const res = await fetchWithTimeout(`https://api.apis.net.pe/v1/ruc?numero=${ruc}`, { timeout: 4000 });
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

    // 1. Try Spring Boot backend DNI endpoint
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/clientes/dni/${dni}`, { timeout: 4000 });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch (e) {}

    // 2. Fallback to public DNI API
    try {
      const res = await fetchWithTimeout(`https://api.apis.net.pe/v1/dni?numero=${dni}`, { timeout: 4000 });
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

  async updateProducto(id, productoData) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoData),
        timeout: 5000
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async deleteProducto(id) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/productos/${id}`, {
        method: 'DELETE',
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

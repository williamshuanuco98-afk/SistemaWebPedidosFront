import { escapeHtml, filterAndRankItems } from '../helpers.js';
import { api } from '../api.js';

let currentClients = [];
let lastSunatQueryRuc = '';

export function renderClientesTable(clients = [], searchQuery = '') {
  currentClients = clients || [];
  const searchInput = document.getElementById('searchClientesInput');
  if (searchInput && searchQuery) searchInput.value = searchQuery;
  filterClientes(searchQuery || (searchInput ? searchInput.value : ''));
}

export function filterClientes(queryStr = '') {
  const tbody = document.getElementById('clientesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = filterAndRankItems(
    currentClients, 
    queryStr, 
    c => `${c.nro_documento || ''} ${c.nombre_cliente || ''} ${c.direccion || ''}`
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No se encontraron clientes coincidentes.</td></tr>`;
    return;
  }

  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-bold"><span class="small text-muted d-block">${c.tipo_documento || 'RUC'}</span>${c.nro_documento}</td>
      <td class="fw-semibold">${escapeHtml(c.nombre_cliente || '-')}</td>
      <td class="small text-muted">${escapeHtml(c.direccion || 'No especificada')}</td>
      <td><span class="status-badge COMPLETADO">ACTIVO</span></td>
    `;
    tbody.appendChild(tr);
  });
}

export function openNewClientModal() {
  const modalElem = document.getElementById('modalCliente');
  if (!modalElem) return;

  const tipoSelect = document.getElementById('modalClienteTipoDoc');
  if (tipoSelect) tipoSelect.value = 'RUC';

  document.getElementById('modalClienteNroDoc').value = '';
  document.getElementById('modalClienteRazonSocial').value = '';
  document.getElementById('modalClienteDireccion').value = '';
  
  onTipoDocChange('RUC');

  lastSunatQueryRuc = '';
  const modal = new bootstrap.Modal(modalElem);
  modal.show();
}

export function onTipoDocChange(tipo) {
  const nroInput = document.getElementById('modalClienteNroDoc');
  const feedback = document.getElementById('sunatStatusFeedback');
  const btn = document.getElementById('btnConsultarSunat');

  if (tipo === 'DNI') {
    if (nroInput) {
      nroInput.placeholder = 'Ingrese 8 dígitos de DNI';
      nroInput.maxLength = 8;
    }
    if (btn) btn.innerHTML = '<i class="bi bi-search me-1"></i> DNI';
    if (feedback) {
      feedback.className = 'form-text mt-1 text-muted fs-8';
      feedback.innerHTML = 'Escriba 8 dígitos para consultar RENIEC / DNI automáticamente.';
    }
  } else {
    if (nroInput) {
      nroInput.placeholder = 'Ingrese 11 dígitos de RUC';
      nroInput.maxLength = 11;
    }
    if (btn) btn.innerHTML = '<i class="bi bi-search me-1"></i> SUNAT';
    if (feedback) {
      feedback.className = 'form-text mt-1 text-muted fs-8';
      feedback.innerHTML = 'Escriba 11 dígitos para consultar SUNAT automáticamente.';
    }
  }
}

export function onNroDocInput(val) {
  const cleanVal = (val || '').trim();
  const tipoDoc = document.getElementById('modalClienteTipoDoc')?.value || 'RUC';

  if (tipoDoc === 'RUC' && cleanVal.length === 11 && cleanVal !== lastSunatQueryRuc) {
    consultarSunat(cleanVal);
  } else if (tipoDoc === 'DNI' && cleanVal.length === 8 && cleanVal !== lastSunatQueryRuc) {
    consultarDni(cleanVal);
  }
}

export function consultarSunatManual() {
  const ruc = document.getElementById('modalClienteNroDoc')?.value.trim();
  const tipoDoc = document.getElementById('modalClienteTipoDoc')?.value || 'RUC';

  if (tipoDoc === 'DNI') {
    if (ruc && ruc.length === 8) {
      consultarDni(ruc);
    } else {
      alert('Ingrese un número de DNI válido de 8 dígitos.');
    }
  } else {
    if (ruc && ruc.length === 11) {
      consultarSunat(ruc);
    } else {
      alert('Ingrese un número de RUC válido de 11 dígitos.');
    }
  }
}

export async function consultarSunat(ruc) {
  lastSunatQueryRuc = ruc;
  const feedback = document.getElementById('sunatStatusFeedback');
  const btn = document.getElementById('btnConsultarSunat');

  if (feedback) {
    feedback.className = 'form-text mt-1 text-warning fw-semibold fs-8';
    feedback.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i> Consultando SUNAT en tiempo real...';
  }
  if (btn) btn.disabled = true;

  const res = await api.consultarSunatRuc(ruc);

  if (btn) btn.disabled = false;

  if (res && res.success) {
    const razonInput = document.getElementById('modalClienteRazonSocial');
    const dirInput = document.getElementById('modalClienteDireccion');

    if (razonInput && res.nombre_cliente) razonInput.value = res.nombre_cliente;
    if (dirInput && res.direccion) dirInput.value = res.direccion;

    if (feedback) {
      feedback.className = 'form-text mt-1 text-success fw-bold fs-8';
      feedback.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> SUNAT: ${escapeHtml(res.nombre_cliente)} (${res.estado || 'ACTIVO'} - ${res.condicion || 'HABIDO'})`;
    }
  } else {
    if (feedback) {
      feedback.className = 'form-text mt-1 text-danger fs-8';
      feedback.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> No se encontró respuesta de SUNAT. Ingrese los datos manualmente.';
    }
  }
}

export async function consultarDni(dni) {
  lastSunatQueryRuc = dni;
  const feedback = document.getElementById('sunatStatusFeedback');
  const btn = document.getElementById('btnConsultarSunat');

  if (feedback) {
    feedback.className = 'form-text mt-1 text-warning fw-semibold fs-8';
    feedback.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i> Consultando DNI en tiempo real...';
  }
  if (btn) btn.disabled = true;

  const res = await api.consultarDni(dni);

  if (btn) btn.disabled = false;

  if (res && res.success) {
    const razonInput = document.getElementById('modalClienteRazonSocial');
    if (razonInput && res.nombre_cliente) razonInput.value = res.nombre_cliente;

    if (feedback) {
      feedback.className = 'form-text mt-1 text-success fw-bold fs-8';
      feedback.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> RENIEC / DNI: ${escapeHtml(res.nombre_cliente)}`;
    }
  } else {
    if (feedback) {
      feedback.className = 'form-text mt-1 text-danger fs-8';
      feedback.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> No se encontró respuesta para el DNI ingresado.';
    }
  }
}

export async function saveClientFromModal() {
  const tipoDoc = document.getElementById('modalClienteTipoDoc')?.value || 'RUC';
  const nroDoc = document.getElementById('modalClienteNroDoc')?.value.trim();
  const nombre = document.getElementById('modalClienteRazonSocial')?.value.trim();
  const direccion = document.getElementById('modalClienteDireccion')?.value.trim() || 'No especificada';

  if (!nroDoc || !nombre) {
    alert('Por favor ingrese el N° de Documento y la Razón Social / Nombre.');
    return;
  }

  const payload = {
    tipo_documento: tipoDoc,
    nro_documento: nroDoc,
    nombre_cliente: nombre,
    direccion: direccion
  };

  const modalElem = document.getElementById('modalCliente');
  const modal = bootstrap.Modal.getInstance(modalElem);

  const res = await api.addCliente(payload);
  if (res) {
    currentClients.unshift({
      id_cliente: res.id_cliente || Date.now(),
      tipo_documento: tipoDoc,
      nro_documento: nroDoc,
      nombre_cliente: nombre,
      direccion: direccion
    });
  }

  if (modal) modal.hide();
  filterClientes();
}

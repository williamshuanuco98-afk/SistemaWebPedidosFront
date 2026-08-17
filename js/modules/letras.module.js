import { escapeHtml, filterAndRankItems } from '../helpers.js';
import { api } from '../api.js';

let rawLetrasList = [];
let groupedLetras = [];
let allClients = [];
let selectedClient = null;
let generatedInstallments = [];
let activeClientIndex = -1;

// =========================================================================
// 1. NÚMERO A LETRAS (CONVERSOR EN ESPAÑOL PARA SOLES PERUANOS)
// =========================================================================
export function numeroALetras(monto) {
  const num = Math.abs(parseFloat(monto) || 0);
  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  const centavosStr = String(centavos).padStart(2, '0');

  if (entero === 0) {
    return `CERO CON ${centavosStr} / 100 SOLES`;
  }

  function unidades(n) {
    switch (n) {
      case 1: return 'UN';
      case 2: return 'DOS';
      case 3: return 'TRES';
      case 4: return 'CUATRO';
      case 5: return 'CINCO';
      case 6: return 'SEIS';
      case 7: return 'SIETE';
      case 8: return 'OCHO';
      case 9: return 'NUEVE';
      default: return '';
    }
  }

  function decenasY(str, n) {
    if (n > 0) return str + ' Y ' + unidades(n);
    return str;
  }

  function decenas(n) {
    const dec = Math.floor(n / 10);
    const uni = n - dec * 10;
    switch (dec) {
      case 1:
        switch (uni) {
          case 0: return 'DIEZ';
          case 1: return 'ONCE';
          case 2: return 'DOCE';
          case 3: return 'TRECE';
          case 4: return 'CATORCE';
          case 5: return 'QUINCE';
          default: return 'DIECI' + unidades(uni);
        }
      case 2:
        if (uni === 0) return 'VEINTE';
        return 'VEINTI' + unidades(uni);
      case 3: return decenasY('TREINTA', uni);
      case 4: return decenasY('CUARENTA', uni);
      case 5: return decenasY('CINCUENTA', uni);
      case 6: return decenasY('SESENTA', uni);
      case 7: return decenasY('SETENTA', uni);
      case 8: return decenasY('OCHENTA', uni);
      case 9: return decenasY('NOVENTA', uni);
      case 0: return unidades(uni);
      default: return '';
    }
  }

  function centenas(n) {
    const cen = Math.floor(n / 100);
    const dec = n - cen * 100;
    switch (cen) {
      case 1:
        if (dec > 0) return 'CIENTO ' + decenas(dec);
        return 'CIEN';
      case 2: return 'DOSCIENTOS ' + decenas(dec);
      case 3: return 'TRESCIENTOS ' + decenas(dec);
      case 4: return 'CUATROCIENTOS ' + decenas(dec);
      case 5: return 'QUINIENTOS ' + decenas(dec);
      case 6: return 'SEISCIENTOS ' + decenas(dec);
      case 7: return 'SETECIENTOS ' + decenas(dec);
      case 8: return 'OCHOCIENTOS ' + decenas(dec);
      case 9: return 'NOVECIENTOS ' + decenas(dec);
      default: return decenas(dec);
    }
  }

  function seccion(n, divisor, strSingular, strPlural) {
    const cientos = Math.floor(n / divisor);
    const resto = n - cientos * divisor;
    let letras = '';

    if (cientos > 0) {
      if (cientos > 1) {
        letras = centenas(cientos) + ' ' + strPlural;
      } else {
        letras = strSingular;
      }
    }
    if (resto > 0) {
      letras += '';
    }
    return { letras, resto };
  }

  let totalLetras = '';
  let resto = entero;

  // Millones
  if (resto >= 1000000) {
    const resMillones = seccion(resto, 1000000, 'UN MILLON', 'MILLONES');
    totalLetras += resMillones.letras + ' ';
    resto = resMillones.resto;
  }

  // Miles
  if (resto >= 1000) {
    const resMiles = seccion(resto, 1000, 'UN MIL', 'MIL');
    totalLetras += resMiles.letras + ' ';
    resto = resMiles.resto;
  }

  // Cientos
  if (resto > 0) {
    totalLetras += centenas(resto);
  }

  totalLetras = totalLetras.trim().replace(/\s+/g, ' ');
  return `${totalLetras} CON ${centavosStr} / 100 SOLES`.toUpperCase();
}

// =========================================================================
// 2. INICIALIZACIÓN, AGRUPACIÓN Y RENDERIZADO DE LA VISTA
// =========================================================================
export async function initLetrasView() {
  try {
    const [letras, clients] = await Promise.all([
      api.getLetras(),
      api.getClientes()
    ]);
    rawLetrasList = letras || [];
    allClients = clients || [];

    groupedLetras = groupLetrasByBatch(rawLetrasList);
    renderLetrasTable(groupedLetras);
    updateMetrics(rawLetrasList, groupedLetras);
  } catch (err) {
    console.error('Error al inicializar vista de Letras:', err);
  }
}

export function groupLetrasByBatch(list = []) {
  const groupsMap = new Map();

  list.forEach(letra => {
    // Agrupar por id_lote o combinación Ref. Girador + Cliente + Fecha Giro
    const key = letra.id_lote ? letra.id_lote : `${letra.ref_girador || 'S-R'}_${letra.nombre_cliente || ''}_${letra.fecha_giro || ''}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        id_lote: letra.id_lote || key,
        ref_girador: letra.ref_girador || 'S/R',
        nombre_cliente: letra.nombre_cliente || 'SIN CLIENTE',
        nro_documento: letra.nro_documento || '',
        direccion_cliente: letra.direccion_cliente || '',
        lugar_giro: letra.lugar_giro || 'LIMA',
        fecha_giro: letra.fecha_giro || '',
        letras: []
      });
    }

    groupsMap.get(key).letras.push(letra);
  });

  const grouped = Array.from(groupsMap.values()).map(group => {
    // Ordenar letras del lote por correlativo o fecha
    group.letras.sort((a, b) => (a.numero_correlativo || 0) - (b.numero_correlativo || 0) || (a.id_letra || 0) - (b.id_letra || 0));

    const totalCuotas = group.letras.length;
    const montoTotal = group.letras.reduce((sum, l) => sum + (parseFloat(l.monto) || 0), 0);

    // Estado general
    const allAnuladas = group.letras.every(l => l.estado === 'ANULADA');
    const allCanceladas = group.letras.every(l => l.estado === 'CANCELADA' || l.estado === 'COBRADA');
    let estadoGeneral = 'PENDIENTE';
    if (allAnuladas) estadoGeneral = 'ANULADA';
    else if (allCanceladas) estadoGeneral = 'CANCELADA';

    const firstLetra = group.letras[0]?.nro_letra || '';
    const lastLetra = group.letras[group.letras.length - 1]?.nro_letra || '';
    const rangoLetras = totalCuotas > 1 ? `${firstLetra} al ${lastLetra}` : firstLetra;

    return {
      ...group,
      total_cuotas: totalCuotas,
      monto_total: montoTotal,
      estado: estadoGeneral,
      rango_letras: rangoLetras
    };
  });

  return grouped;
}

export function renderLetrasTable(groupedList = []) {
  const tbody = document.getElementById('letrasTableBody');
  const countBadge = document.getElementById('letrasCountBadge');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (countBadge) countBadge.textContent = `${groupedList.length} ${groupedList.length === 1 ? 'operación' : 'operaciones'}`;

  if (groupedList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <i class="bi bi-file-earmark-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
          No se encontraron Operaciones de Letras de Cambio registradas.
        </td>
      </tr>
    `;
    return;
  }

  groupedList.forEach(lote => {
    const tr = document.createElement('tr');
    const isAnulada = lote.estado === 'ANULADA';

    const montoFormatted = (parseFloat(lote.monto_total) || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    tr.innerHTML = `
      <td class="font-monospace fw-bold text-primary fs-7">${escapeHtml(lote.ref_girador || '-')}</td>
      <td>
        <div class="fw-bold text-white">${escapeHtml(lote.nombre_cliente || '-')}</div>
        <small class="text-muted font-monospace">${escapeHtml(lote.nro_documento || '')}</small>
      </td>
      <td class="small">${escapeHtml(lote.fecha_giro || '-')}</td>
      <td class="text-center">
        <span class="badge bg-primary fs-8 px-2 py-1">${lote.total_cuotas} ${lote.total_cuotas === 1 ? 'Letra' : 'Letras'}</span>
      </td>
      <td class="font-monospace fw-semibold text-info small">${escapeHtml(lote.rango_letras || '-')}</td>
      <td class="text-end fw-bold font-monospace text-white">S/ ${montoFormatted}</td>
      
      <!-- 1. Columna DETALLES -->
      <td class="text-center">
        <button class="btn-action-solid btn-view" title="Ver Detalle de Letras" onclick="letrasModule.openLoteDetailModal('${escapeHtml(lote.id_lote)}')">
          <i class="bi bi-eye-fill"></i>
        </button>
      </td>

      <!-- 2. Columna ANULAR -->
      <td class="text-center">
        ${isAnulada ? `
          <button class="btn-action-solid btn-cancel" style="opacity: 0.35; cursor: not-allowed;" title="Ya anulado" disabled>
            <i class="bi bi-slash-circle"></i>
          </button>
        ` : `
          <button class="btn-action-solid btn-cancel" title="Anular Operación" onclick="letrasModule.openAnularLoteModal('${escapeHtml(lote.id_lote)}', '${escapeHtml(lote.ref_girador)}', '${escapeHtml(lote.nombre_cliente)}')">
            <i class="bi bi-x-lg"></i>
          </button>
        `}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export function updateMetrics(rawList = [], groupedList = []) {
  const totalCountEl = document.getElementById('statLetrasTotalCount');
  const totalAmountEl = document.getElementById('statLetrasTotalAmount');
  const totalLetrasEl = document.getElementById('statLetrasTotalLetrasCount');
  const clientsEl = document.getElementById('statLetrasClientsCount');

  const totalOperaciones = groupedList.length;
  const totalLetras = rawList.length;
  const sumAmount = rawList.reduce((acc, curr) => curr.estado !== 'ANULADA' ? acc + (parseFloat(curr.monto) || 0) : acc, 0);

  const clientSet = new Set(rawList.map(l => l.nro_documento || l.nombre_cliente).filter(Boolean));

  if (totalCountEl) totalCountEl.textContent = totalOperaciones;
  if (totalAmountEl) totalAmountEl.textContent = `S/ ${sumAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (totalLetrasEl) totalLetrasEl.textContent = totalLetras;
  if (clientsEl) clientsEl.textContent = clientSet.size;

  const pendientes = rawList.filter(l => l.estado === 'PENDIENTE').length;
  const sidebarBadge = document.getElementById('badgeLetras');
  if (sidebarBadge) {
    if (pendientes > 0) {
      sidebarBadge.textContent = pendientes;
      sidebarBadge.classList.remove('d-none');
    } else {
      sidebarBadge.classList.add('d-none');
    }
  }
}

export async function triggerSearch() {
  const search = document.getElementById('searchLetraInput')?.value || '';
  const dateFrom = document.getElementById('filterLetraDateFrom')?.value || '';
  const dateTo = document.getElementById('filterLetraDateTo')?.value || '';
  const estado = document.getElementById('filterLetraStatus')?.value || 'ALL';

  const results = await api.getLetras({ search, dateFrom, dateTo, estado });
  rawLetrasList = results || [];
  groupedLetras = groupLetrasByBatch(rawLetrasList);
  renderLetrasTable(groupedLetras);
  updateMetrics(rawLetrasList, groupedLetras);
}

// =========================================================================
// 3. GENERACIÓN DE MULTI-LETRAS (BUSCADOR RUC, MODAL & CÁLCULOS)
// =========================================================================
export async function openGenerarLetrasModal() {
  const modalEl = document.getElementById('modalGenerarLetras');
  if (!modalEl) return;

  // Cargar clientes reales directamente de MySQL
  try {
    const clients = await api.getClientes();
    // Filter only clients with RUC (11 digits or tipo_documento RUC)
    allClients = (clients || []).filter(c => {
      const doc = String(c.nro_documento || '').trim();
      return doc.length === 11 || c.tipo_documento === 'RUC';
    });
  } catch (e) {
    allClients = [];
  }

  selectedClient = null;
  activeClientIndex = -1;

  // Reset inputs
  const searchInput = document.getElementById('searchClienteLetraInput');
  if (searchInput) searchInput.value = '';

  document.getElementById('letraClienteDoc').value = '';
  document.getElementById('letraClienteNombre').value = '';
  document.getElementById('letraClienteDireccion').value = '';
  document.getElementById('letraRefGirador').value = '';
  document.getElementById('letraLugarGiro').value = 'LIMA';

  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('letraFechaGiro').value = todayStr;
  document.getElementById('letraMontoTotal').value = '';
  document.getElementById('letraCantidadCuotas').value = '1';

  // Obtener sugerencia de correlativo inicial
  const corrData = await api.getNextLetraCorrelativo();
  document.getElementById('letraCorrelativoInput').value = corrData.nextCorrelativo || 1;
  document.getElementById('letraAnioInput').value = corrData.anio || new Date().getFullYear();

  setupClientSearchAutocomplete();
  recalcInstallments();

  const modal = new bootstrap.Modal(modalEl, {
    backdrop: 'static',
    keyboard: false
  });
  modal.show();
}

function setupClientSearchAutocomplete() {
  const input = document.getElementById('searchClienteLetraInput');
  const list = document.getElementById('clientSearchResultsLetraList');
  if (!input || !list) return;

  if (input.dataset.boundSearch === 'true') return;
  input.dataset.boundSearch = 'true';

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    activeClientIndex = -1;

    if (!val) {
      list.classList.add('d-none');
      list.innerHTML = '';
      return;
    }

    const matches = filterAndRankItems(
      allClients,
      val,
      c => `${c.nro_documento || ''} ${c.nombre_cliente || c.razon_social || ''} ${c.direccion || ''}`
    ).slice(0, 15);

    if (matches.length === 0) {
      list.innerHTML = `<li class="list-group-item text-muted py-2 fs-7">No se encontraron clientes para "${escapeHtml(val)}"</li>`;
      list.classList.remove('d-none');
      return;
    }

    list.innerHTML = matches.map((c, idx) => `
      <li class="list-group-item list-group-item-action py-2 px-3 client-opt-letra d-flex align-items-center gap-2 fs-7 text-white" data-index="${idx}">
        <span class="fw-bold text-white">${escapeHtml(c.nro_documento || 'S/D')}</span>
        <span class="fw-semibold text-white">- ${escapeHtml(c.nombre_cliente || c.razon_social)}</span>
      </li>
    `).join('');
    list.classList.remove('d-none');

    list.querySelectorAll('.client-opt-letra').forEach((item, idx) => {
      item.addEventListener('click', () => {
        selectClient(matches[idx]);
      });
    });
  });

  input.addEventListener('keydown', (e) => {
    const items = list.querySelectorAll('.client-opt-letra');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeClientIndex = Math.min(activeClientIndex + 1, items.length - 1);
      updateActiveItem(items, activeClientIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeClientIndex = Math.max(activeClientIndex - 1, 0);
      updateActiveItem(items, activeClientIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeClientIndex >= 0 && items[activeClientIndex]) {
        items[activeClientIndex].click();
      } else if (items.length > 0) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      list.classList.add('d-none');
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.classList.add('d-none');
    }
  });
}

function updateActiveItem(items, activeIndex) {
  items.forEach((item, idx) => {
    if (idx === activeIndex) {
      item.classList.add('active', 'bg-primary');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active', 'bg-primary');
    }
  });
}

function selectClient(c) {
  if (!c) return;
  selectedClient = c;
  const list = document.getElementById('clientSearchResultsLetraList');
  const searchInput = document.getElementById('searchClienteLetraInput');

  const nombre = c.nombre_cliente || c.razon_social || '';
  const doc = c.nro_documento || '';
  const dir = c.direccion || 'LIMA - LIMA';

  if (list) list.classList.add('d-none');
  if (searchInput) searchInput.value = `${doc} - ${nombre}`;

  document.getElementById('letraClienteDoc').value = doc;
  document.getElementById('letraClienteNombre').value = nombre;
  document.getElementById('letraClienteDireccion').value = dir;
}

export function clearSelectedClient() {
  selectedClient = null;
  const searchInput = document.getElementById('searchClienteLetraInput');
  const list = document.getElementById('clientSearchResultsLetraList');

  if (searchInput) searchInput.value = '';
  if (list) list.classList.add('d-none');

  document.getElementById('letraClienteDoc').value = '';
  document.getElementById('letraClienteNombre').value = '';
  document.getElementById('letraClienteDireccion').value = '';
}

export function hasUnsavedFormData() {
  const cliente = document.getElementById('letraClienteNombre')?.value?.trim();
  const ref = document.getElementById('letraRefGirador')?.value?.trim();
  const monto = parseFloat(document.getElementById('letraMontoTotal')?.value) || 0;
  return Boolean(cliente || ref || monto > 0);
}

export function attemptCloseGenerarModal() {
  if (hasUnsavedFormData()) {
    const discardModalEl = document.getElementById('modalConfirmDiscardLetra');
    if (discardModalEl) {
      const modal = new bootstrap.Modal(discardModalEl);
      modal.show();
      return;
    }
  }
  forceCloseGenerarModal();
}

export function forceCloseGenerarModal() {
  const discardModalEl = document.getElementById('modalConfirmDiscardLetra');
  if (discardModalEl) {
    const dModal = bootstrap.Modal.getInstance(discardModalEl);
    if (dModal) dModal.hide();
  }

  const modalEl = document.getElementById('modalGenerarLetras');
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }
  clearSelectedClient();
}

export function recalcInstallments() {
  const montoTotal = parseFloat(document.getElementById('letraMontoTotal')?.value) || 0;
  const count = parseInt(document.getElementById('letraCantidadCuotas')?.value) || 1;
  const correlativoBase = parseInt(document.getElementById('letraCorrelativoInput')?.value) || 1;
  const anio = parseInt(document.getElementById('letraAnioInput')?.value) || new Date().getFullYear();
  const fechaGiroStr = document.getElementById('letraFechaGiro')?.value || new Date().toISOString().split('T')[0];

  const tbody = document.getElementById('installmentRowsTbody');
  if (!tbody) return;

  if (count <= 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Ingrese una cantidad de letras válida.</td></tr>';
    return;
  }

  const previousDays = generatedInstallments.map(g => g.dias_credito);
  generatedInstallments = [];

  // REGLA DE DIVISIÓN: Asignar centavos restantes al final
  const baseMonto = Math.floor((montoTotal / count) * 100) / 100;
  let runningSum = 0;
  const fechaGiroDate = new Date(fechaGiroStr + 'T00:00:00');

  for (let i = 0; i < count; i++) {
    const isLast = (i === count - 1);
    let cuotaMonto = baseMonto;
    if (isLast) {
      cuotaMonto = Math.round((montoTotal - runningSum) * 100) / 100;
    }
    runningSum += cuotaMonto;

    const cuotaCorr = correlativoBase + i;
    const nroLetra = `${String(cuotaCorr).padStart(3, '0')}-${anio}`;
    const diasCredito = previousDays[i] !== undefined ? previousDays[i] : (i + 1) * 30;

    const vencDate = new Date(fechaGiroDate);
    vencDate.setDate(vencDate.getDate() + diasCredito);
    const vencStr = vencDate.toISOString().split('T')[0];

    const montoEnLetras = numeroALetras(cuotaMonto);

    generatedInstallments.push({
      indice: i + 1,
      numero_correlativo: cuotaCorr,
      anio: anio,
      nro_letra: nroLetra,
      dias_credito: diasCredito,
      fecha_vencimiento: vencStr,
      monto: cuotaMonto,
      monto_letras: montoEnLetras
    });
  }

  renderInstallmentRows();
}

function renderInstallmentRows() {
  const tbody = document.getElementById('installmentRowsTbody');
  const validationBadge = document.getElementById('letrasSumValidationBadge');
  if (!tbody) return;

  tbody.innerHTML = '';
  let sum = 0;

  generatedInstallments.forEach((inst, idx) => {
    sum += (parseFloat(inst.monto) || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center fw-bold text-muted">${inst.indice}</td>
      <td>
        <input type="text" class="form-control form-control-sm font-monospace fw-bold text-primary" value="${escapeHtml(inst.nro_letra)}" onchange="letrasModule.onInstallmentFieldChange(${idx}, 'nro_letra', this.value)">
      </td>
      <td class="text-center">
        <input type="number" class="form-control form-control-sm text-center fw-bold text-warning font-monospace" value="${inst.dias_credito}" min="1" oninput="letrasModule.onInstallmentDaysChange(${idx}, this.value)">
      </td>
      <td>
        <input type="date" class="form-control form-control-sm" value="${inst.fecha_vencimiento}" onchange="letrasModule.onInstallmentDueDateChange(${idx}, this.value)">
      </td>
      <td>
        <div class="input-group input-group-sm">
          <span class="input-group-text px-1 fw-bold">S/</span>
          <input type="number" step="0.01" class="form-control form-control-sm font-monospace fw-bold text-end px-1" style="font-size: 0.92rem; min-width: 95px;" value="${inst.monto.toFixed(2)}" onchange="letrasModule.onInstallmentAmountChange(${idx}, this.value)">
        </div>
      </td>
      <td>
        <div class="small fw-semibold font-monospace" style="color: #cbd5e1 !important;" id="inst_letras_${idx}">${escapeHtml(inst.monto_letras)}</div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const totalEsperado = parseFloat(document.getElementById('letraMontoTotal')?.value) || 0;
  const diff = Math.abs(sum - totalEsperado);

  if (validationBadge) {
    if (diff < 0.01 && totalEsperado > 0) {
      validationBadge.className = 'badge bg-success fs-7';
      validationBadge.innerHTML = `<i class="bi bi-check-circle me-1"></i> Suma Cuotas: S/ ${sum.toFixed(2)} (Exacto)`;
    } else {
      validationBadge.className = 'badge bg-warning text-dark fs-7';
      validationBadge.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> Suma: S/ ${sum.toFixed(2)} | Total Op: S/ ${totalEsperado.toFixed(2)}`;
    }
  }
}

export function onInstallmentFieldChange(idx, field, value) {
  if (generatedInstallments[idx]) {
    generatedInstallments[idx][field] = value;
  }
}

export function onInstallmentDaysChange(idx, daysVal) {
  const days = parseInt(daysVal) || 0;
  const fechaGiroStr = document.getElementById('letraFechaGiro')?.value || new Date().toISOString().split('T')[0];
  const date = new Date(fechaGiroStr + 'T00:00:00');
  date.setDate(date.getDate() + days);

  if (generatedInstallments[idx]) {
    generatedInstallments[idx].dias_credito = days;
    generatedInstallments[idx].fecha_vencimiento = date.toISOString().split('T')[0];

    const tr = document.getElementById('installmentRowsTbody')?.children[idx];
    if (tr) {
      const dateInput = tr.querySelector('input[type="date"]');
      if (dateInput) dateInput.value = generatedInstallments[idx].fecha_vencimiento;
    }
  }
}

export function onInstallmentDueDateChange(idx, dateVal) {
  const fechaGiroStr = document.getElementById('letraFechaGiro')?.value || new Date().toISOString().split('T')[0];
  const gDate = new Date(fechaGiroStr + 'T00:00:00');
  const vDate = new Date(dateVal + 'T00:00:00');

  const diffTime = vDate - gDate;
  const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  if (generatedInstallments[idx]) {
    generatedInstallments[idx].fecha_vencimiento = dateVal;
    generatedInstallments[idx].dias_credito = diffDays;

    const tr = document.getElementById('installmentRowsTbody')?.children[idx];
    if (tr) {
      const daysInput = tr.querySelector('input[type="number"]');
      if (daysInput) daysInput.value = diffDays;
    }
  }
}

export function onInstallmentAmountChange(idx, amountVal) {
  const m = parseFloat(amountVal) || 0;
  if (generatedInstallments[idx]) {
    generatedInstallments[idx].monto = m;
    generatedInstallments[idx].monto_letras = numeroALetras(m);
    const label = document.getElementById(`inst_letras_${idx}`);
    if (label) label.textContent = generatedInstallments[idx].monto_letras;

    let sum = generatedInstallments.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);
    const totalEsperado = parseFloat(document.getElementById('letraMontoTotal')?.value) || 0;
    const diff = Math.abs(sum - totalEsperado);
    const validationBadge = document.getElementById('letrasSumValidationBadge');
    if (validationBadge) {
      if (diff < 0.01 && totalEsperado > 0) {
        validationBadge.className = 'badge bg-success fs-7';
        validationBadge.innerHTML = `<i class="bi bi-check-circle me-1"></i> Suma Cuotas: S/ ${sum.toFixed(2)} (Exacto)`;
      } else {
        validationBadge.className = 'badge bg-warning text-dark fs-7';
        validationBadge.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> Suma: S/ ${sum.toFixed(2)} | Total Op: S/ ${totalEsperado.toFixed(2)}`;
      }
    }
  }
}

export async function submitBatchLetras() {
  const clienteNombre = document.getElementById('letraClienteNombre')?.value?.trim();
  const refGirador = document.getElementById('letraRefGirador')?.value?.trim();
  const lugarGiro = document.getElementById('letraLugarGiro')?.value?.trim() || 'LIMA';
  const fechaGiro = document.getElementById('letraFechaGiro')?.value;
  const docCliente = document.getElementById('letraClienteDoc')?.value?.trim();
  const dirCliente = document.getElementById('letraClienteDireccion')?.value?.trim();

  if (!clienteNombre || !docCliente) {
    alert('Por favor seleccione un cliente con RUC válido.');
    return;
  }

  if (!refGirador || !fechaGiro) {
    alert('Por favor complete todos los campos obligatorios (*).');
    return;
  }

  if (!generatedInstallments || generatedInstallments.length === 0) {
    alert('No hay cuotas desglosadas para registrar.');
    return;
  }

  const payloadArray = generatedInstallments.map(inst => ({
    id_cliente: selectedClient?.id_cliente || selectedClient?.id || null,
    nombre_cliente: clienteNombre,
    nro_documento: docCliente,
    direccion_cliente: dirCliente,
    nro_letra: inst.nro_letra,
    numero_correlativo: inst.numero_correlativo,
    anio: inst.anio,
    ref_girador: refGirador.toUpperCase(),
    lugar_giro: lugarGiro.toUpperCase(),
    fecha_giro: fechaGiro,
    dias_credito: inst.dias_credito,
    fecha_vencimiento: inst.fecha_vencimiento,
    moneda: 'SOLES',
    monto: inst.monto,
    monto_letras: inst.monto_letras
  }));

  try {
    const res = await api.createLetrasBatch(payloadArray);
    if (res && res.success) {
      alert(`¡Se emitieron ${res.total_generadas || payloadArray.length} Letras de Cambio exitosamente para la referencia ${refGirador.toUpperCase()}!`);
      forceCloseGenerarModal();
      await initLetrasView();
    } else {
      alert('Error al registrar letras: ' + (res?.error || 'Respuesta inválida'));
    }
  } catch (err) {
    console.error('Error enviando letras batch:', err);
    alert('Error al procesar la solicitud: ' + err.message);
  }
}

// =========================================================================
// 4. DETALLES DE OPERACIÓN / TODAS LAS LETRAS POR REFERENCIA
// =========================================================================
export function openLoteDetailModal(idLote) {
  const lote = groupedLetras.find(g => String(g.id_lote) === String(idLote));
  if (!lote) return;

  const modalEl = document.getElementById('letraDetailModal');
  const bodyEl = document.getElementById('letraDetailBody');
  const titleEl = document.getElementById('letraDetailTitle');
  if (!modalEl || !bodyEl) return;

  if (titleEl) {
    titleEl.innerHTML = `<i class="bi bi-collection-fill me-2"></i> Operación: ${escapeHtml(lote.ref_girador)} - ${escapeHtml(lote.nombre_cliente)}`;
  }

  const montoFormatted = (parseFloat(lote.monto_total) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  bodyEl.innerHTML = `
    <!-- Ficha Resumen de la Operación -->
    <div class="p-3 bg-body-tertiary rounded border mb-4">
      <div class="row g-3">
        <div class="col-md-4">
          <label class="small text-muted d-block font-monospace">REF. DEL GIRADOR</label>
          <span class="fs-5 fw-bold text-primary font-monospace">${escapeHtml(lote.ref_girador)}</span>
        </div>
        <div class="col-md-5">
          <label class="small text-muted d-block font-monospace">GIRADO A (CLIENTE)</label>
          <div class="fw-bold text-white fs-6">${escapeHtml(lote.nombre_cliente)}</div>
          <small class="text-warning font-monospace">RUC: ${escapeHtml(lote.nro_documento || '-')}</small>
        </div>
        <div class="col-md-3 text-end">
          <label class="small text-muted d-block font-monospace">MONTO TOTAL OPERACIÓN</label>
          <span class="badge bg-success fs-5 font-monospace">S/ ${montoFormatted}</span>
        </div>

        <div class="col-md-4">
          <label class="small text-muted d-block font-monospace">LUGAR Y FECHA DE GIRO</label>
          <div class="fw-semibold">${escapeHtml(lote.lugar_giro || 'LIMA')} - ${escapeHtml(lote.fecha_giro || '-')}</div>
        </div>
        <div class="col-md-5">
          <label class="small text-muted d-block font-monospace">DIRECCIÓN FISCAL</label>
          <div class="small">${escapeHtml(lote.direccion_cliente || '-')}</div>
        </div>
        <div class="col-md-3 text-end">
          <label class="small text-muted d-block font-monospace">TOTAL LETRAS</label>
          <span class="badge bg-primary fs-6">${lote.total_cuotas} ${lote.total_cuotas === 1 ? 'Letra' : 'Letras'}</span>
        </div>
      </div>
    </div>

    <!-- Tabla con Todas las Letras Desglosadas de la Referencia -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold text-white mb-0" style="color: #60a5fa !important;">
        <i class="bi bi-file-earmark-ruled me-1"></i> Letras de Cambio Emitidas para esta Referencia (${lote.total_cuotas})
      </h6>
      <button class="btn btn-sm btn-outline-success fw-bold font-monospace" onclick="letrasModule.downloadLoteExcel('${escapeHtml(lote.id_lote)}')">
        <i class="bi bi-file-earmark-excel-fill me-1"></i> Descargar Todo en Excel (.xlsx)
      </button>
    </div>
    <div class="table-responsive border rounded mb-2">
      <table class="table custom-table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th style="width: 35px;" class="text-center">#</th>
            <th style="width: 120px;">N° Letra</th>
            <th style="width: 100px;" class="text-center">Días Crédito</th>
            <th style="width: 120px;">F. Vencimiento</th>
            <th class="text-end" style="width: 130px;">Monto (S/)</th>
            <th>Monto en Letras</th>
            <th style="width: 90px;" class="text-center">Estado</th>
            <th class="text-center" style="width: 70px;">PDF</th>
            <th class="text-center" style="width: 70px;">EXCEL</th>
            <th class="text-center" style="width: 70px;">PRINT</th>
            <th class="text-center" style="width: 70px;">ANULAR</th>
          </tr>
        </thead>
        <tbody>
          ${lote.letras.map((l, idx) => {
    const isAnulada = l.estado === 'ANULADA';
    const mForm = (parseFloat(l.monto) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let badgeCls = 'bg-warning text-dark';
    if (isAnulada) badgeCls = 'bg-danger text-white';
    else if (l.estado === 'CANCELADA') badgeCls = 'bg-success text-white';

    return `
              <tr>
                <td class="text-center fw-bold text-muted">${idx + 1}</td>
                <td class="font-monospace fw-bold text-primary">${escapeHtml(l.nro_letra)}</td>
                <td class="text-center font-monospace fw-bold text-warning">${l.dias_credito || '-'} d</td>
                <td class="small fw-semibold text-danger">${escapeHtml(l.fecha_vencimiento || '-')}</td>
                <td class="text-end fw-bold font-monospace">S/ ${mForm}</td>
                <td><small class="font-monospace text-muted d-block text-truncate" style="max-width: 260px;" title="${escapeHtml(l.monto_letras || '')}">${escapeHtml(l.monto_letras || '-')}</small></td>
                <td class="text-center"><span class="badge ${badgeCls} fs-8">${escapeHtml(l.estado || 'PENDIENTE')}</span></td>
                <td class="text-center">
                  <button class="btn-action-solid btn-pdf" title="Descargar PDF Oficial" onclick="letrasModule.downloadPdf(${l.id_letra})">
                    <i class="bi bi-file-earmark-pdf-fill"></i>
                  </button>
                </td>
                <td class="text-center">
                  <button class="btn-action-solid btn-excel" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);" title="Descargar Letra en Excel (.xlsx)" onclick="letrasModule.downloadExcel(${l.id_letra})">
                    <i class="bi bi-file-earmark-excel-fill"></i>
                  </button>
                </td>
                <td class="text-center">
                  <button class="btn-action-solid btn-print" title="Imprimir Directamente" onclick="letrasModule.printLetraDirect(${l.id_letra})">
                    <i class="bi bi-printer-fill"></i>
                  </button>
                </td>
                <td class="text-center">
                  ${isAnulada ? `
                    <button class="btn-action-solid btn-cancel" style="opacity: 0.35; cursor: not-allowed;" title="Ya anulada" disabled>
                      <i class="bi bi-slash-circle"></i>
                    </button>
                  ` : `
                    <button class="btn-action-solid btn-cancel" title="Anular Letra Individual" onclick="letrasModule.openAnularLetraModal(${l.id_letra}, '${escapeHtml(l.nro_letra)}')">
                      <i class="bi bi-x-lg"></i>
                    </button>
                  `}
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

export function downloadPdf(idLetra) {
  const savedPath = localStorage.getItem('inplabel_letras_pdf_storage_path') || 'C:\\Inplabel\\Letras';
  const sub = localStorage.getItem('inplabel_pdf_subfolders') !== 'false';
  const url = `http://localhost:8080/api/letras/${idLetra}/pdf?storageDir=${encodeURIComponent(savedPath)}&useSubfolders=${sub}&_t=${Date.now()}`;
  window.open(url, '_blank');
}

export function downloadExcel(idLetra) {
  const savedPath = localStorage.getItem('inplabel_letras_pdf_storage_path') || 'C:\\Inplabel\\Letras_Excel';
  const sub = localStorage.getItem('inplabel_pdf_subfolders') !== 'false';
  const url = `http://localhost:8080/api/letras/${idLetra}/excel?storageDir=${encodeURIComponent(savedPath)}&useSubfolders=${sub}&_t=${Date.now()}`;
  window.open(url, '_blank');
}

export function downloadLoteExcel(idLote) {
  const url = `http://localhost:8080/api/letras/lote/${encodeURIComponent(idLote)}/excel?_t=${Date.now()}`;
  window.open(url, '_blank');
}

export function printLetraDirect(idLetra) {
  const letra = rawLetrasList.find(l => String(l.id_letra) === String(idLetra));
  if (!letra) return;

  const htmlContent = generateLetraPrintHTML(letra);

  let printFrame = document.getElementById('silentLetraPrintFrame');
  if (printFrame) {
    printFrame.remove();
  }

  printFrame = document.createElement('iframe');
  printFrame.id = 'silentLetraPrintFrame';
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(htmlContent);
  frameDoc.close();

  setTimeout(() => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
  }, 400);
}

export function generateLetraPrintHTML(letra) {
  const nroLetra = escapeHtml(letra.nro_letra || '261 - 2025');
  const refGirador = escapeHtml(letra.ref_girador || 'FF02 - 630');
  const lugarGiro = escapeHtml(letra.lugar_giro || 'LIMA');

  const fechaGiroParts = (letra.fecha_giro || '2025-08-12').split('-');
  const fgDia = fechaGiroParts[2] || '12';
  const fgMes = fechaGiroParts[1] || '08';
  const fgAnio = (fechaGiroParts[0] || '2025').slice(2);

  const fechaVencParts = (letra.fecha_vencimiento || '2025-09-21').split('-');
  const fvDia = fechaVencParts[2] || '21';
  const fvMes = fechaVencParts[1] || '09';
  const fvAnio = (fechaVencParts[0] || '2025').slice(2);

  const montoFormatted = (parseFloat(letra.monto) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoLetras = escapeHtml((letra.monto_letras || 'UN MIL SESENTA Y DOS CON 00 / 100 SOLES').toUpperCase());
  const cliente = escapeHtml(letra.nombre_cliente || 'INDUSTRIAS VISKOSIL S.A.C.');
  const ruc = escapeHtml(letra.nro_documento || '20600902971');
  const direccion = escapeHtml(letra.direccion_cliente || 'MZ. I LT. 03 LAS VEGAS 1RA ETAPA - LIMA - LIMA - PUENTE PIEDRA');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Letra de Cambio - ${nroLetra}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 4mm 6mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    color: #141414;
    font-size: 10px;
  }
  .sheet {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
    padding: 4px 6px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Estructura general de 2 columnas principales */
  .letra-layout {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* COLUMNA 1: CLÁUSULAS ESPECIALES (ALTURA EXACTA AL TOPE DEL CAJÓN VERDE) */
  .clauses-col {
    width: 95px;
    min-width: 95px;
    max-width: 95px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 282px;
    margin-bottom: 20px;
  }
  .clauses-content {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 5.8px;
    line-height: 1.25;
    letter-spacing: 0.05px;
    height: 100%;
    max-height: 282px;
    overflow: hidden;
    color: #111;
  }
  .clauses-title {
    font-weight: bold;
    font-size: 6.2px;
    margin-bottom: 2px;
  }
  .clause-p {
    margin-bottom: 2px;
    text-align: justify;
  }

  /* COLUMNA 2: CONTENIDO PRINCIPAL */
  .main-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* Encabezado */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 6px;
  }
  .logo-img {
    height: 48px;
    object-fit: contain;
  }
  .company-address {
    text-align: right;
    font-size: 8.8px;
    line-height: 1.35;
    border-top: 1.5px solid #333;
    padding-top: 3px;
    min-width: 330px;
  }

  /* Contenedor lateral de firma (Línea de tamaño idéntico y texto alineado) */
  .side-signature-container {
    width: 24px;
    min-width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .side-line {
    width: 1px;
    height: 62px;
    border-left: 1.2px dashed #141414;
  }
  .side-tag-text {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 8.5px;
    font-weight: bold;
    white-space: nowrap;
    text-align: center;
  }

  /* Sección Superior */
  .upper-section {
    display: flex;
    align-items: stretch;
    gap: 6px;
    margin-bottom: 4px;
  }

  /* Tabla Superior de Giro & Vencimiento */
  .top-table {
    flex: 1;
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
  }
  .top-table th, .top-table td {
    border: 1.5px solid #141414;
    text-align: center;
    padding: 1px 2px;
  }
  .top-table th {
    font-size: 7.6px;
    font-weight: bold;
    background: #E2EFDA !important;
    line-height: 1.15;
    height: 16px;
  }
  .top-table .subhead {
    font-size: 7.2px;
    font-weight: bold;
    background: #E2EFDA !important;
    padding: 1px;
    height: 14px;
  }
  .top-table td.val {
    font-size: 12.5px;
    font-weight: bold;
    height: 30px;
    padding: 2px;
  }
  .top-table td.val.amount {
    font-size: 14.5px;
  }

  /* Frase de pago */
  .pay-phrase {
    padding: 4px 0 3px 30px;
    font-size: 10.5px;
  }
  .pay-phrase .beneficiary {
    color: #00AF50;
    font-weight: bold;
    font-style: italic;
  }

  /* Monto en letras */
  .amount-row-container {
    display: flex;
    gap: 6px;
    margin-bottom: 3px;
  }
  .amount-spacer {
    width: 24px;
    min-width: 24px;
  }
  .amount-box {
    flex: 1;
    border: 1.5px solid #141414;
    padding: 5px 8px;
    font-size: 11px;
    font-weight: bold;
    background: #fff;
  }

  /* Nota lugar de pago */
  .payplace-note {
    padding: 1px 0 4px 30px;
    font-size: 9.2px;
  }

  /* Sección Inferior: Linea Firma + Por Aval + Cuadro Principal Inferior */
  .lower-section {
    display: flex;
    align-items: stretch;
    gap: 6px;
  }
  .lower-box {
    flex: 1;
    display: flex;
    border: 1.5px solid #141414;
  }

  /* Cuadro Izquierdo (Girado / Avalista): SIN NEGRITA, 1PT MENOR */
  .lower-left {
    width: 55%;
    border-right: 1.5px solid #141414;
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 8.5px;
    font-weight: normal;
  }
  .girado-row {
    margin-bottom: 4px;
    line-height: 1.35;
    font-weight: normal;
  }
  .girado-row span.lbl {
    display: inline-block;
    min-width: 70px;
    font-weight: normal;
  }
  .girado-divider {
    border-top: 1px solid #333;
    margin: 6px 0;
  }
  .aval-row {
    margin-bottom: 4px;
    display: flex;
    align-items: flex-end;
    font-weight: normal;
  }
  .aval-row span.lbl {
    min-width: 70px;
    flex-shrink: 0;
    font-weight: normal;
  }
  .aval-dots {
    border-bottom: 1px dotted #333;
    flex: 1;
    height: 11px;
    margin-left: 2px;
  }

  .lower-right {
    width: 45%;
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    text-align: center;
  }
  .debit-line {
    font-size: 8px;
    text-align: left;
    margin-bottom: 4px;
  }
  .bank-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  .bank-table th, .bank-table td {
    border: 1.5px solid #141414;
    padding: 2px;
    font-size: 7.5px;
  }
  .bank-table th {
    background: #E2EFDA !important;
    font-weight: bold;
  }
  .bank-table td {
    height: 18px;
  }
  .company-title {
    color: #00AF50;
    font-weight: bold;
    font-style: italic;
    font-size: 11px;
    margin-top: 4px;
  }
  .company-ruc {
    font-weight: bold;
    font-size: 9.5px;
    margin-bottom: 6px;
  }
  .firma-block {
    margin-top: auto;
    text-align: center;
  }
  .sign-line {
    border-bottom: 1px dotted #333;
    width: 75%;
    margin: 8px auto 2px auto;
  }
  .sign-text {
    font-size: 9px;
    font-weight: bold;
  }
  .rep-text {
    font-size: 8px;
    color: #333;
  }
  .doi-text {
    font-size: 8.5px;
    font-weight: bold;
    text-align: left;
    margin-top: 2px;
  }

  /* Pie de página */
  .footer-line {
    border-top: 1.5px solid #141414;
    margin-top: 6px;
    padding-top: 3px;
    font-size: 8.5px;
    text-align: left;
  }
</style>
</head>
<body>

<div class="sheet">
  <div class="letra-layout">
    <!-- COLUMNA CLÁUSULAS (SEPARADAS PUNTO POR PUNTO) -->
    <div class="clauses-col">
      <div class="clauses-content">
        <div class="clauses-title">CLÁUSULAS ESPECIALES:</div>
        <div class="clause-p">(1) En caso de mora , esta letra de cambio generará las tasas de interés compensatorio y moratorio más altas que la ley permita a su último Tenedor.</div>
        <div class="clause-p">(2) El plazo de su vencimiento podrá ser prorrogado por el tenedor, por el plazo que este señale, sin que sea necesario la intervención del obligado principal ni de los solidarios.</div>
        <div class="clause-p">(3) Las partes acuerdan consignar la cláusula "sin protesto" y por tanto no se requerirá de esta diligencia para el ejercicio de las acciones cambiarias.</div>
        <div class="clause-p">(4) Las partes se someten a la competencia de los jueces del Distrito Judicial de Lima.</div>
      </div>
    </div>

    <!-- COLUMNA PRINCIPAL -->
    <div class="main-col">
      <!-- ENCABEZADO (LOGO DIRECTAMENTE SOBRE LAS TABLAS) -->
      <div class="header">
        <img src="img/inplabel-logo.png" alt="Inplabel" class="logo-img" onerror="this.style.display='none'">
        <div class="company-address">
          <b>Av. María Parado de Bellido Lte. 5</b><br>
          Lotización Chacra Cerro - Comas - Lima - Lima<br>
          Telf.: (01)557-1526 Claro: 975 564 460 / 983 518 504
        </div>
      </div>

      <!-- 1. SECCION SUPERIOR CON LÍNEA DE FIRMA DELGADA Y ACEPTANTE -->
      <div class="upper-section">
        <div class="side-signature-container">
          <div class="side-line" title="Línea de firma Aceptante"></div>
          <span class="side-tag-text">Aceptante(s)</span>
        </div>
        <table class="top-table">
          <colgroup>
            <col style="width: 17%;">
            <col style="width: 16%;">
            <col style="width: 13%;">
            <col style="width: 6%;"><col style="width: 6%;"><col style="width: 6%;">
            <col style="width: 6%;"><col style="width: 6%;"><col style="width: 6%;">
            <col style="width: 18%;">
          </colgroup>
          <tr>
            <th rowspan="2">NUMERO DE LETRA</th>
            <th rowspan="2">REF. DEL GIRADOR</th>
            <th rowspan="2">LUGAR DE GIRO</th>
            <th colspan="3">FECHA DE GIRO</th>
            <th colspan="3">FECHA DE VENCIMIENTO</th>
            <th rowspan="2">MONEDA E IMPORTE</th>
          </tr>
          <tr>
            <th class="subhead">DIA</th><th class="subhead">MES</th><th class="subhead">AÑO</th>
            <th class="subhead">DIA</th><th class="subhead">MES</th><th class="subhead">AÑO</th>
          </tr>
          <tr>
            <td class="val">${nroLetra}</td>
            <td class="val">${refGirador}</td>
            <td class="val">${lugarGiro}</td>
            <td class="val">${fgDia}</td><td class="val">${fgMes}</td><td class="val">${fgAnio}</td>
            <td class="val">${fvDia}</td><td class="val">${fvMes}</td><td class="val">${fvAnio}</td>
            <td class="val amount">S/ ${montoFormatted}</td>
          </tr>
        </table>
      </div>

      <!-- 2. FRASE DE PAGO -->
      <div class="pay-phrase">
        Por esta <b>LETRA DE CAMBIO</b>, se servirá(n) pagar a la orden de <span class="beneficiary">INDUSTRIAS PLASTICOS BELSA S.A.C.</span> la cantidad de:
      </div>

      <!-- 3. MONTO EN LETRAS (ALINEADO CON EL CUADRO INFERIOR) -->
      <div class="amount-row-container">
        <div class="amount-spacer"></div>
        <div class="amount-box">
          ${montoLetras}
        </div>
      </div>

      <!-- 4. LUGAR DE PAGO -->
      <div class="payplace-note">
        Valor que sentará(n) en cuenta según aviso de sus Ss. Ss. en el siguiente lugar de pago:
      </div>

      <!-- 5. SECCION INFERIOR CON LÍNEA DE FIRMA DELGADA Y POR AVAL -->
      <div class="lower-section">
        <div class="side-signature-container">
          <div class="side-line" title="Línea de firma Por Aval"></div>
          <span class="side-tag-text">Por Aval</span>
        </div>
        <div class="lower-box">
          <!-- Lado Izquierdo: Girado y Aval (SIN NEGRITA, 1PT MENOR) -->
          <div class="lower-left">
            <div>
              <div class="girado-row"><span class="lbl">GIRADO A:</span> ${cliente}</div>
              <div class="girado-row"><span class="lbl">RUC:</span> ${ruc}</div>
              <div class="girado-row"><span class="lbl">DIRECCION:</span> ${direccion}</div>
            </div>

            <div class="girado-divider"></div>

            <div>
              <div class="aval-row"><span class="lbl">AVALISTA:</span> <span class="aval-dots"></span></div>
              <div class="aval-row">
                <span class="lbl" style="min-width:55px;">D.I/R.U.C:</span> <span class="aval-dots" style="max-width:110px;"></span>
                <span class="lbl" style="min-width:65px; margin-left:10px;">TELEFONO:</span> <span class="aval-dots"></span>
              </div>
              <div class="aval-row"><span class="lbl">DIRECCION:</span> <span class="aval-dots"></span></div>
            </div>
          </div>

          <!-- Lado Derecho: Banco y Firma -->
          <div class="lower-right">
            <div class="debit-line">Importe a debitar en cuenta del Aceptante del Banco: ..............................</div>
            <table class="bank-table">
              <tr><th>BANCO</th><th>OFICINA</th><th>NUMERO DE CUENTA</th><th>D.C.</th></tr>
              <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
            </table>

            <div class="company-title">INDUSTRIAS PLASTICOS BELSA S.A.C.</div>
            <div class="company-ruc">RUC: 20544368827</div>

            <div class="firma-block">
              <div class="sign-line"></div>
              <div class="sign-text">FIRMA</div>
              <div class="rep-text">Nombre del representante(S)</div>
            </div>
            <div class="doi-text">D.O.I</div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer-line">No escribir ni firmar debajo de esta linea</div>
    </div>
  </div>
</div>

</body>
</html>
  `;
}

// =========================================================================
// 5. ANULACIÓN DE LETRAS (INDIVIDUAL Y POR LOTE)
// =========================================================================
export function openAnularLoteModal(idLote, refGirador, cliente) {
  document.getElementById('anularLoteIdInput').value = idLote;
  document.getElementById('anularNroLetraLabel').textContent = refGirador;
  document.getElementById('anularLetraClienteLabel').textContent = cliente;

  const modalEl = document.getElementById('modalAnularLetra');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

export async function confirmAnularLote() {
  const idLote = document.getElementById('anularLoteIdInput')?.value;
  if (!idLote) return;

  try {
    const res = await api.anularLoteLetras(idLote);
    if (res && res.success) {
      const modalEl = document.getElementById('modalAnularLetra');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      await initLetrasView();
    } else {
      alert('Error al anular la operación: ' + (res?.error || ''));
    }
  } catch (err) {
    console.error('Error anulando lote:', err);
  }
}

export async function openAnularLetraModal(idLetra, nroLetra) {
  if (!confirm(`¿Está seguro de anular la Letra de Cambio individual N° ${nroLetra}?`)) {
    return;
  }

  try {
    const res = await api.anularLetra(idLetra);
    if (res && res.success) {
      // Refresh current lote details and main view
      const detailModalEl = document.getElementById('letraDetailModal');
      if (detailModalEl) {
        const dModal = bootstrap.Modal.getInstance(detailModalEl);
        if (dModal) dModal.hide();
      }
      await initLetrasView();
    } else {
      alert('Error al anular la letra individual');
    }
  } catch (err) {
    console.error('Error anulando letra:', err);
  }
}

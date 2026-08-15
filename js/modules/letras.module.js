import { escapeHtml, filterAndRankItems } from '../helpers.js';
import { api } from '../api.js';

let currentLetras = [];
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
// 2. INICIALIZACIÓN Y RENDERIZADO DE LA VISTA
// =========================================================================
export async function initLetrasView() {
  try {
    const [letras, clients] = await Promise.all([
      api.getLetras(),
      api.getLocalClientes()
    ]);
    currentLetras = letras || [];
    allClients = clients || [];

    renderLetrasTable(currentLetras);
    updateMetrics(currentLetras);
  } catch (err) {
    console.error('Error al inicializar vista de Letras:', err);
  }
}

export function renderLetrasTable(list = []) {
  const tbody = document.getElementById('letrasTableBody');
  const countBadge = document.getElementById('letrasCountBadge');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (countBadge) countBadge.textContent = `${list.length} ${list.length === 1 ? 'letra' : 'letras'}`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center py-5 text-muted">
          <i class="bi bi-file-earmark-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
          No se encontraron Letras de Cambio registradas.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(letra => {
    const tr = document.createElement('tr');
    const isAnulada = letra.estado === 'ANULADA';
    const isCancelada = letra.estado === 'CANCELADA' || letra.estado === 'COBRADA';
    
    let badgeClass = 'bg-warning text-dark';
    if (isAnulada) badgeClass = 'bg-danger text-white';
    else if (isCancelada) badgeClass = 'bg-success text-white';

    const montoFormatted = (parseFloat(letra.monto) || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    tr.innerHTML = `
      <td class="font-monospace fw-bold text-primary">${escapeHtml(letra.nro_letra || '-')}</td>
      <td class="font-monospace fw-semibold">${escapeHtml(letra.ref_girador || '-')}</td>
      <td>
        <div class="fw-bold">${escapeHtml(letra.nombre_cliente || '-')}</div>
        <small class="text-muted font-monospace">${escapeHtml(letra.nro_documento || '')}</small>
      </td>
      <td class="small">${escapeHtml(letra.fecha_giro || '-')}</td>
      <td class="small fw-semibold text-danger">${escapeHtml(letra.fecha_vencimiento || '-')}</td>
      <td class="text-end fw-bold font-monospace">S/ ${montoFormatted}</td>
      <td><span class="badge ${badgeClass} fs-8">${escapeHtml(letra.estado || 'PENDIENTE')}</span></td>
      
      <!-- 1. Columna DETALLES -->
      <td class="text-center">
        <button class="btn-action-solid btn-view" title="Ver Detalle" onclick="letrasModule.openDetailModal(${letra.id_letra})">
          <i class="bi bi-eye-fill"></i>
        </button>
      </td>

      <!-- 2. Columna PDF -->
      <td class="text-center">
        <button class="btn-action-solid btn-pdf" title="Descargar PDF Oficial" onclick="letrasModule.downloadPdf(${letra.id_letra})">
          <i class="bi bi-file-earmark-pdf-fill"></i>
        </button>
      </td>

      <!-- 3. Columna PRINT -->
      <td class="text-center">
        <button class="btn-action-solid btn-print" title="Imprimir Directamente" onclick="letrasModule.printLetraDirect(${letra.id_letra})">
          <i class="bi bi-printer-fill"></i>
        </button>
      </td>

      <!-- 4. Columna ANULAR -->
      <td class="text-center">
        ${isAnulada ? `
          <button class="btn-action-solid btn-cancel" style="opacity: 0.35; cursor: not-allowed;" title="Ya anulada" disabled>
            <i class="bi bi-slash-circle"></i>
          </button>
        ` : `
          <button class="btn-action-solid btn-cancel" title="Anular Letra" onclick="letrasModule.openAnularModal(${letra.id_letra}, '${escapeHtml(letra.nro_letra)}', '${escapeHtml(letra.nombre_cliente)}')">
            <i class="bi bi-x-lg"></i>
          </button>
        `}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export function updateMetrics(list = []) {
  const totalCountEl = document.getElementById('statLetrasTotalCount');
  const totalAmountEl = document.getElementById('statLetrasTotalAmount');
  const pendientesEl = document.getElementById('statLetrasPendientesCount');
  const clientsEl = document.getElementById('statLetrasClientsCount');

  const total = list.length;
  const pendientes = list.filter(l => l.estado === 'PENDIENTE').length;
  const sumAmount = list.reduce((acc, curr) => curr.estado !== 'ANULADA' ? acc + (parseFloat(curr.monto) || 0) : acc, 0);
  
  const clientSet = new Set(list.map(l => l.nro_documento || l.nombre_cliente).filter(Boolean));

  if (totalCountEl) totalCountEl.textContent = total;
  if (totalAmountEl) totalAmountEl.textContent = `S/ ${sumAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (pendientesEl) pendientesEl.textContent = pendientes;
  if (clientsEl) clientsEl.textContent = clientSet.size;

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
  currentLetras = results || [];
  renderLetrasTable(currentLetras);
  updateMetrics(currentLetras);
}

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

  // Preserve any custom days entered previously if count matches
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
    
    // Default days: 30, 60, 90... or previous custom days entered
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
    
    // Update due date input directly without destroying focus
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
      alert(`¡Se emitieron ${res.total_generadas || payloadArray.length} Letras de Cambio exitosamente!`);
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
// 4. DETALLE, PDF E IMPRESIÓN DIRECTA
// =========================================================================
export function openDetailModal(idLetra) {
  const letra = currentLetras.find(l => String(l.id_letra) === String(idLetra));
  if (!letra) return;

  const modalEl = document.getElementById('letraDetailModal');
  const bodyEl = document.getElementById('letraDetailBody');
  const titleEl = document.getElementById('letraDetailTitle');
  if (!modalEl || !bodyEl) return;

  if (titleEl) titleEl.innerHTML = `<i class="bi bi-file-earmark-ruled me-2"></i> Letra de Cambio N° ${escapeHtml(letra.nro_letra)}`;

  const montoFormatted = (parseFloat(letra.monto) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  bodyEl.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small text-muted d-block font-monospace">N° DE LETRA</label>
        <span class="fs-5 fw-bold text-primary">${escapeHtml(letra.nro_letra)}</span>
      </div>
      <div class="col-md-6">
        <label class="small text-muted d-block font-monospace">REF. DEL GIRADOR</label>
        <span class="fs-5 fw-bold font-monospace">${escapeHtml(letra.ref_girador)}</span>
      </div>

      <div class="col-md-6">
        <label class="small text-muted d-block font-monospace">GIRADO A (CLIENTE)</label>
        <div class="fw-bold text-white">${escapeHtml(letra.nombre_cliente)}</div>
        <small class="text-warning font-monospace">RUC: ${escapeHtml(letra.nro_documento || '-')}</small>
      </div>
      <div class="col-md-6">
        <label class="small text-muted d-block font-monospace">DIRECCIÓN FISCAL</label>
        <div class="small">${escapeHtml(letra.direccion_cliente || '-')}</div>
      </div>

      <div class="col-md-4">
        <label class="small text-muted d-block font-monospace">LUGAR DE GIRO</label>
        <div class="fw-semibold">${escapeHtml(letra.lugar_giro || 'LIMA')}</div>
      </div>
      <div class="col-md-4">
        <label class="small text-muted d-block font-monospace">FECHA DE GIRO</label>
        <div class="fw-semibold">${escapeHtml(letra.fecha_giro)}</div>
      </div>
      <div class="col-md-4">
        <label class="small text-muted d-block font-monospace">FECHA DE VENCIMIENTO</label>
        <div class="fw-bold text-danger">${escapeHtml(letra.fecha_vencimiento)} (${letra.dias_credito} días)</div>
      </div>

      <div class="col-12 p-3 bg-body-tertiary rounded border">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <label class="small text-muted font-monospace mb-0">MONEDA E IMPORTE</label>
          <span class="badge bg-success fs-6 font-monospace">S/ ${montoFormatted}</span>
        </div>
        <div class="fw-bold font-monospace mt-1" style="color: #60a5fa !important;">${escapeHtml(letra.monto_letras || '')}</div>
      </div>
    </div>
  `;

  document.getElementById('btnDetailOpenPdf').onclick = () => downloadPdf(letra.id_letra);
  document.getElementById('btnDetailPrintDirect').onclick = () => printLetraDirect(letra.id_letra);

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

export function downloadPdf(idLetra) {
  const savedPath = localStorage.getItem('inplabel_letras_pdf_storage_path') || 'C:\\Inplabel\\Letras';
  const sub = localStorage.getItem('inplabel_pdf_subfolders') !== 'false';
  const url = `http://localhost:8080/api/letras/${idLetra}/pdf?storageDir=${encodeURIComponent(savedPath)}&useSubfolders=${sub}`;
  window.open(url, '_blank');
}

export function printLetraDirect(idLetra) {
  const letra = currentLetras.find(l => String(l.id_letra) === String(idLetra));
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
  const nroLetra = escapeHtml(letra.nro_letra || '261-2026');
  const refGirador = escapeHtml(letra.ref_girador || 'FF02 - 630');
  const lugarGiro = escapeHtml(letra.lugar_giro || 'LIMA');

  const fechaGiroParts = (letra.fecha_giro || '2026-08-15').split('-');
  const fgDia = fechaGiroParts[2] || '15';
  const fgMes = fechaGiroParts[1] || '08';
  const fgAnio = (fechaGiroParts[0] || '2026').slice(2);

  const fechaVencParts = (letra.fecha_vencimiento || '2026-09-15').split('-');
  const fvDia = fechaVencParts[2] || '15';
  const fvMes = fechaVencParts[1] || '09';
  const fvAnio = (fechaVencParts[0] || '2026').slice(2);

  const montoFormatted = (parseFloat(letra.monto) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const montoLetras = escapeHtml((letra.monto_letras || '').toUpperCase());

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Letra de Cambio - ${nroLetra}</title>
      <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #000; font-size: 11px; }
        .letra-box { width: 100%; max-width: 980px; margin: 0 auto; box-sizing: border-box; }
        .top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .company-info { text-align: right; font-size: 10px; line-height: 1.3; }
        .main-container { display: flex; border: 1.5px solid #000; }
        .left-clauses { width: 15%; padding: 4px; border-right: 1.5px solid #000; font-size: 7px; line-height: 1.15; box-sizing: border-box; }
        .right-content { width: 85%; padding: 6px; box-sizing: border-box; }
        .grid-header { width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 6px; }
        .grid-header th, .grid-header td { border: 1px solid #000; padding: 4px; }
        .grid-header th { font-size: 9px; font-weight: bold; background: #f0f0f0; }
        .grid-header td { font-size: 12px; font-weight: bold; }
        .date-cell-table { width: 100%; border-collapse: collapse; }
        .date-cell-table td { border: none; padding: 2px; font-size: 11px; }
        .date-cell-table tr.date-val td { border-top: 1px solid #000; font-weight: bold; }
        .banner-text { font-size: 11px; margin: 6px 0; }
        .amount-box { border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 12px; margin-bottom: 6px; background: #fafafa; }
        .lower-grid { display: flex; border-top: 1px solid #000; }
        .lower-left { width: 55%; padding: 6px; border-right: 1px solid #000; font-size: 10px; line-height: 1.4; }
        .lower-right { width: 45%; padding: 6px; font-size: 10px; text-align: center; }
        .bank-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 9px; }
        .bank-table th, .bank-table td { border: 1px solid #000; padding: 2px; height: 16px; }
        .signature-line { margin-top: 24px; border-bottom: 1px dotted #000; width: 80%; margin-left: auto; margin-right: auto; }
        .footer-note { font-size: 9px; margin-top: 6px; }
      </style>
    </head>
    <body>
      <div class="letra-box">
        <div class="top-header">
          <img src="img/inplabel-logo.png" alt="Inplabel" style="height: 48px;" onerror="this.style.display='none'">
          <div class="company-info">
            <div><strong>Av. María Parado de Bellido Lte. 5</strong></div>
            <div>Lotización Chacra Cerro - Comas - Lima - Lima</div>
            <div>Telf.: (01)557-1526 Claro: 975 564 460 / 983 518 504</div>
          </div>
        </div>

        <div class="main-container">
          <div class="left-clauses">
            <strong>CLÁUSULAS ESPECIALES:</strong><br>
            (1) En caso de mora, esta letra de cambio generará las tasas de interés compensatorio y moratorio más altas que la ley permita a su último Tenedor.<br>
            (2) El plazo de su vencimiento podrá ser prorrogado por el tenedor, por el plazo que este señale, sin que sea necesaria la intervención del obligado principal ni de los solidarios.<br>
            (3) Las partes acuerdan consignar la cláusula "sin protesto" y por tanto no se requerirá de esta diligencia para el ejercicio de las acciones cambiarias.<br>
            (4) Las partes se someten a la competencia de los jueces del Distrito Judicial de Lima.
          </div>

          <div class="right-content">
            <table class="grid-header">
              <tr>
                <th style="width: 17%;">NUMERO DE LETRA</th>
                <th style="width: 17%;">REF. DEL GIRADOR</th>
                <th style="width: 14%;">LUGAR DE GIRO</th>
                <th style="width: 18%;">FECHA DE GIRO</th>
                <th style="width: 18%;">FECHA DE VENCIMIENTO</th>
                <th style="width: 16%;">MONEDA E IMPORTE</th>
              </tr>
              <tr>
                <td>${nroLetra}</td>
                <td>${refGirador}</td>
                <td>${lugarGiro}</td>
                <td style="padding:0;">
                  <table class="date-cell-table">
                    <tr><td>DIA</td><td>MES</td><td>AÑO</td></tr>
                    <tr class="date-val"><td>${fgDia}</td><td>${fgMes}</td><td>${fgAnio}</td></tr>
                  </table>
                </td>
                <td style="padding:0;">
                  <table class="date-cell-table">
                    <tr><td>DIA</td><td>MES</td><td>AÑO</td></tr>
                    <tr class="date-val"><td>${fvDia}</td><td>${fvMes}</td><td>${fvAnio}</td></tr>
                  </table>
                </td>
                <td>S/ ${montoFormatted}</td>
              </tr>
            </table>

            <div class="banner-text">
              Por esta <strong>LETRA DE CAMBIO</strong>, se servirá(n) pagar a la orden de <strong style="color: #059669;">INDUSTRIAS PLASTICOS BELSA S.A.C.</strong> la cantidad de:
            </div>

            <div class="amount-box">
              ${montoLetras}
            </div>

            <div class="banner-text" style="font-size: 10px;">
              Valor que sentará(n) en cuenta según aviso de sus Ss. Ss. en el siguiente lugar de pago:
            </div>

            <div class="lower-grid">
              <div class="lower-left">
                <div><strong>GIRADO A:</strong> ${escapeHtml(letra.nombre_cliente || '')}</div>
                <div><strong>RUC:</strong> ${escapeHtml(letra.nro_documento || '')}</div>
                <div><strong>DIRECCION:</strong> ${escapeHtml(letra.direccion_cliente || '')}</div>
                <hr style="border: 0; border-top: 1px dotted #ccc; margin: 4px 0;">
                <div><strong>AVALISTA:</strong> .....................................................................................</div>
                <div><strong>D.I/R.U.C:</strong> ................................ <strong>TELEFONO:</strong> ..........................</div>
                <div><strong>DIRECCION:</strong> ....................................................................................</div>
              </div>

              <div class="lower-right">
                <div style="font-size: 9px; text-align: left;">Importe a debitar en cuenta del Aceptante del Banco:..................</div>
                <table class="bank-table">
                  <tr><th>BANCO</th><th>OFICINA</th><th>NUMERO DE CUENTA</th><th>D.C.</th></tr>
                  <tr><td></td><td></td><td></td><td></td></tr>
                </table>
                <div style="font-weight: bold; color: #059669; margin-top: 4px;">INDUSTRIAS PLASTICOS BELSA S.A.C.</div>
                <div style="font-weight: bold;">RUC: 20544368827</div>
                <div class="signature-line"></div>
                <div style="font-size: 9px; font-weight: bold; margin-top: 2px;">FIRMA</div>
                <div style="font-size: 8px; color: #555;">Nombre del representante(S) / D.O.I</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-note">No escribir ni firmar debajo de esta línea</div>
      </div>
    </body>
    </html>
  `;
}

// =========================================================================
// 5. ANULACIÓN DE LETRA
// =========================================================================
export function openAnularModal(idLetra, nroLetra, cliente) {
  document.getElementById('anularLetraIdInput').value = idLetra;
  document.getElementById('anularNroLetraLabel').textContent = nroLetra;
  document.getElementById('anularLetraClienteLabel').textContent = cliente;

  const modalEl = document.getElementById('modalAnularLetra');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

export async function confirmAnularLetra() {
  const idLetra = document.getElementById('anularLetraIdInput')?.value;
  if (!idLetra) return;

  try {
    const res = await api.anularLetra(idLetra);
    if (res && res.success) {
      const modalEl = document.getElementById('modalAnularLetra');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      await initLetrasView();
    } else {
      alert('Error al anular la letra');
    }
  } catch (err) {
    console.error('Error anulando letra:', err);
  }
}

import { api } from '../api.js';
import { escapeHtml, formatDate, showBootstrapModal, hideBootstrapModal } from '../helpers.js';

let currentShipments = [];
let currentSearchQuery = '';

export function renderEnviosTable(shipments = [], searchQuery = '') {
  currentShipments = shipments || [];
  if (searchQuery !== undefined) currentSearchQuery = searchQuery;

  const countBadge = document.getElementById('guiasCountBadge');
  if (countBadge) countBadge.textContent = `${currentShipments.length} guías`;

  const tbody = document.getElementById('guiasTableBody');
  if (!tbody) return;

  const query = (currentSearchQuery || '').toLowerCase().trim();
  const filtered = currentShipments.filter(s => {
    if (!query) return true;
    const nro = (s.nro_guia || '').toLowerCase();
    const cliente = (s.nombre_cliente || '').toLowerCase();
    const docRef = (s.doc_referencia || '').toLowerCase();
    const ruc = (s.nro_documento || '').toLowerCase();
    return nro.includes(query) || cliente.includes(query) || docRef.includes(query) || ruc.includes(query);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No se encontraron guías de remisión registradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const isAnulada = (s.estado === 'ANULADA');
    const badgeClass = isAnulada ? 'CANCELADO' : 'COMPLETADO';
    const statusText = isAnulada ? 'ANULADA' : (s.estado || 'EMITIDA');

    return `
      <tr>
        <td class="fw-bold font-monospace text-primary">${escapeHtml(s.nro_guia || ('GR-' + s.id_guia))}</td>
        <td>
          <div class="fw-bold text-body">${escapeHtml(s.nombre_cliente || 'Cliente General')}</div>
          ${s.nro_documento ? `<span class="small text-muted">RUC: ${escapeHtml(s.nro_documento)}</span>` : ''}
        </td>
        <td>${formatDate(s.fecha_guia || s.fecha_emision)}</td>
        <td>
          <span class="badge bg-secondary-subtle text-body border">${escapeHtml(s.punto_partida ? (s.punto_partida.includes('COMAS') ? 'Comas' : 'Carabayllo') : 'Carabayllo')}</span>
        </td>
        <td>
          <span class="small text-muted">${escapeHtml(s.doc_referencia || '-')}</span>
        </td>
        <td>
          <span class="status-badge ${badgeClass}">${statusText}</span>
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary" title="Ver Detalle" onclick="enviosModule.viewGuiaDetail('${s.id_guia}')">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-success" title="Ver PDF" onclick="enviosModule.openPDF('${s.id_guia}')">
              <i class="bi bi-file-earmark-pdf"></i>
            </button>
            <button class="btn btn-outline-secondary" title="Imprimir Guía" onclick="enviosModule.printPDF('${s.id_guia}')">
              <i class="bi bi-printer"></i>
            </button>
            ${!isAnulada ? `
              <button class="btn btn-outline-danger" title="Anular Guía" onclick="enviosModule.anularGuia('${s.id_guia}')">
                <i class="bi bi-x-circle"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

export function onSearchInput(val) {
  renderEnviosTable(currentShipments, val);
}

export function viewGuiaDetail(idGuia) {
  const guia = currentShipments.find(s => String(s.id_guia) === String(idGuia));
  if (!guia) {
    alert('No se encontró la información de la guía seleccionada.');
    return;
  }

  const modalTitle = document.getElementById('guiaDetailTitle');
  const modalBody = document.getElementById('guiaDetailBody');

  if (modalTitle) {
    modalTitle.innerHTML = `<i class="bi bi-truck text-primary me-2"></i> Guía de Remisión ${escapeHtml(guia.nro_guia || '')}`;
  }

  if (modalBody) {
    const isAnulada = (guia.estado === 'ANULADA');
    const badgeClass = isAnulada ? 'bg-danger' : 'bg-success';
    const statusText = isAnulada ? 'ANULADA' : 'EMITIDA';

    modalBody.innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <div class="p-3 border rounded bg-body-tertiary">
            <span class="text-muted fs-8 d-block text-uppercase fw-semibold">Cliente Destinatario</span>
            <strong class="fs-6 text-primary">${escapeHtml(guia.nombre_cliente || 'Cliente')}</strong>
            <div class="small text-muted mt-1">RUC/DNI: <strong>${escapeHtml(guia.nro_documento || '-')}</strong></div>
            <div class="small text-muted">Punto Llegada: <strong>${escapeHtml(guia.punto_llegada || guia.direccion_destino || '-')}</strong></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 border rounded bg-body-tertiary">
            <span class="text-muted fs-8 d-block text-uppercase fw-semibold">Datos de Emisión</span>
            <div>N° Guía: <strong class="text-primary font-monospace">${escapeHtml(guia.nro_guia || '')}</strong></div>
            <div>Fecha Emisión: <strong>${formatDate(guia.fecha_guia || guia.fecha_emision)}</strong></div>
            <div>Punto Partida: <strong>${escapeHtml(guia.punto_partida || 'Carabayllo')}</strong></div>
            <div class="mt-1">Estado: <span class="badge ${badgeClass}">${statusText}</span></div>
          </div>
        </div>
      </div>

      <h6 class="fw-bold mb-2 text-secondary"><i class="bi bi-box-seam me-1"></i> Productos Despachados:</h6>
      <div class="table-responsive border rounded mb-3">
        <table class="table custom-table table-sm align-middle mb-0">
          <thead class="bg-body-tertiary">
            <tr>
              <th style="width: 50px;">#</th>
              <th style="width: 120px;">Código</th>
              <th>Descripción del Producto</th>
              <th class="text-center" style="width: 120px;">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${(guia.detalles || []).map((d, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="font-monospace text-secondary fw-semibold">${escapeHtml(d.codigo_producto || '#' + d.id_producto)}</td>
                <td class="fw-bold">${escapeHtml(d.nombre_producto || 'Producto')}</td>
                <td class="text-center fw-bold text-success fs-6">${Number(d.cantidad || 0).toLocaleString()} UND</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${guia.observaciones ? `
        <div class="p-2 border rounded bg-body-tertiary small">
          <strong>Observaciones:</strong> ${escapeHtml(guia.observaciones)}
        </div>
      ` : ''}
    `;
  }

  const printBtn = document.getElementById('btnPrintGuiaModal');
  if (printBtn) {
    printBtn.onclick = () => printGuiaPDF(guia);
  }

  showBootstrapModal('guiaDetailModal');
}

export function openPDF(idGuia) {
  const guia = currentShipments.find(s => String(s.id_guia) === String(idGuia));
  if (guia) {
    openGuiaPDFInNewTab(guia);
  } else {
    alert('No se encontró la información de la guía seleccionada.');
  }
}

export function printPDF(idGuia) {
  const guia = currentShipments.find(s => String(s.id_guia) === String(idGuia));
  if (guia) {
    printGuiaPDF(guia);
  } else {
    alert('No se encontró la información de la guía seleccionada.');
  }
}

export async function anularGuia(idGuia) {
  if (!confirm('¿Está seguro de que desea anular esta Guía de Remisión? Esta acción registrará la guía como ANULADA.')) {
    return;
  }

  try {
    const updated = await api.anularGuia(idGuia);
    const idx = currentShipments.findIndex(s => String(s.id_guia) === String(idGuia));
    if (idx !== -1) {
      currentShipments[idx].estado = 'ANULADA';
    }
    renderEnviosTable(currentShipments, currentSearchQuery);
    alert('Guía de Remisión anulada exitosamente.');
  } catch (err) {
    console.error("Error anulando guía:", err);
    alert('Error al anular la guía: ' + (err.message || 'Error de servidor'));
  }
}

function renderGuiaHalfHTML(guia, copiaNombre) {
  const detalles = guia.detalles || [];
  const nroGuia = guia.nro_guia || 'GR001-0001';
  const fechaStr = formatDate(guia.fecha_guia);
  const clienteNombre = escapeHtml(guia.nombre_cliente || 'Cliente General');
  const clienteRuc = escapeHtml(guia.nro_documento || '-');
  const docRef = escapeHtml(guia.doc_referencia || '-');
  const puntoPartida = escapeHtml(guia.punto_partida || 'Planta Inplabel');
  const puntoLlegada = escapeHtml(guia.punto_llegada || guia.direccion_destino || 'Dirección del cliente');
  const observaciones = escapeHtml(guia.observaciones || '-');
  const isAnulada = (guia.estado === 'ANULADA');

  const rowsHTML = detalles.map((item, idx) => `
    <tr>
      <td style="text-align: center; font-weight: bold; border: 1px solid #222; padding: 4px;">${idx + 1}</td>
      <td style="text-align: center; border: 1px solid #222; padding: 4px; font-family: monospace;">${escapeHtml(item.codigo_producto || '#' + item.id_producto)}</td>
      <td style="border: 1px solid #222; padding: 4px; font-weight: 600;">${escapeHtml(item.nombre_producto || 'Producto')}</td>
      <td style="text-align: center; font-weight: bold; border: 1px solid #222; padding: 4px;">${item.cantidad || 1}</td>
      <td style="text-align: center; border: 1px solid #222; padding: 4px;">UND</td>
    </tr>
  `).join('');

  const emptyStateHTML = `
    <tr>
      <td colspan="5" style="text-align: center; border: 1px solid #222; padding: 8px; color: #666;">Sin productos especificados</td>
    </tr>
  `;

  return `
    <div style="width: 48.5%; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; position: relative;">
      ${isAnulada ? `<div style="position: absolute; top: 40%; left: 15%; transform: rotate(-30deg); font-size: 38px; font-weight: bold; color: rgba(220, 53, 69, 0.35); border: 4px solid rgba(220, 53, 69, 0.35); padding: 10px 20px; border-radius: 8px; z-index: 100;">GUÍA ANULADA</div>` : ''}

      <!-- Encabezado con Membrete y Recuadro RUC -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        <tr>
          <td style="width: 20%; vertical-align: middle;">
            <div style="font-weight: 900; font-size: 16px; color: #10b981; font-family: sans-serif; letter-spacing: -0.5px;">INPLABEL</div>
            <div style="font-size: 7px; color: #666;">Envases Plásticos</div>
          </td>
          <td style="width: 55%; vertical-align: middle; padding-left: 6px; font-size: 8px; line-height: 1.25;">
            <strong style="font-size: 10.5px; color: #004085; display: block; margin-bottom: 1px;">INDUSTRIAS PLASTICOS BELSA S.A.C</strong>
            <div style="font-weight: bold; color: #333; font-size: 7px; margin-bottom: 2px;">DISEÑO, FABRICACIÓN Y COMERCIALIZACIÓN DE ENVASES PLÁSTICOS</div>
            <div>Contacto: 983 518 504 - 975 564 460 | ventas@inplabel.com.pe</div>
            <div style="font-size: 7px; color: #444; margin-top: 2px;">
              <strong>Principal:</strong> Av. Maria Parado de Bellido Lt. 5 Lotizacion Chacra Cerro - Comas<br>
              <strong>Sucursal:</strong> C.P. Las Piedritas Av. Las Piedritas Mz D Lt 9 - Carabayllo
            </div>
          </td>
          <td style="width: 25%; text-align: center; vertical-align: middle;">
            <div style="border: 1.5px solid #000; border-radius: 4px; padding: 4px; background: #fff;">
              <div style="font-size: 8.5px; font-weight: bold;">RUC: 20544368827</div>
              <div style="font-size: 9px; font-weight: bold; margin: 2px 0;">GUÍA DE REMISIÓN</div>
              <div style="font-size: 10.5px; font-weight: bold; color: #c00;">${nroGuia}</div>
            </div>
            <div style="font-size: 7px; font-weight: bold; margin-top: 2px; text-transform: uppercase;">[ ${copiaNombre} ]</div>
          </td>
        </tr>
      </table>

      <!-- Datos del Cliente y Traslado -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #222; margin-bottom: 8px; font-size: 8.5px;">
        <tr>
          <td style="border: 1px solid #222; padding: 3px 5px; width: 55%; background: #f4f4f4;">
            <strong>Señor(es):</strong> ${clienteNombre}
          </td>
          <td style="border: 1px solid #222; padding: 3px 5px; width: 45%; background: #f4f4f4;">
            <strong>RUC / DNI:</strong> ${clienteRuc}
          </td>
        </tr>
        <tr>
          <td style="border: 1px solid #222; padding: 3px 5px;">
            <strong>Fecha Emisión:</strong> ${fechaStr}
          </td>
          <td style="border: 1px solid #222; padding: 3px 5px;">
            <strong>Doc. Referencia:</strong> ${docRef}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border: 1px solid #222; padding: 3px 5px;">
            <strong>Punto de Partida:</strong> ${puntoPartida}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border: 1px solid #222; padding: 3px 5px;">
            <strong>Punto de Llegada:</strong> ${puntoLlegada}
          </td>
        </tr>
      </table>

      <!-- Tabla de Productos enviada -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #222; margin-bottom: 6px; font-size: 8px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="border: 1px solid #222; padding: 3px; width: 6%;">N°</th>
            <th style="border: 1px solid #222; padding: 3px; width: 18%;">Código</th>
            <th style="border: 1px solid #222; padding: 3px; width: 52%;">Descripción del Producto</th>
            <th style="border: 1px solid #222; padding: 3px; width: 14%;">Cantidad</th>
            <th style="border: 1px solid #222; padding: 3px; width: 10%;">U.M.</th>
          </tr>
        </thead>
        <tbody>
          ${detalles.length > 0 ? rowsHTML : emptyStateHTML}
        </tbody>
      </table>

      <!-- Cuadro Inferior de Observaciones -->
      <div style="border: 1px solid #222; padding: 4px; font-size: 7.5px; background: #fff; min-height: 24px;">
        <strong>Observaciones:</strong> ${observaciones}
      </div>
    </div>
  `;
}

export function generateGuiaInnerSheetHTML(guia) {
  return `
    <div style="display: flex; justify-content: space-between; width: 100%; box-sizing: border-box; background: #ffffff; padding: 6px; color: #111;">
      ${renderGuiaHalfHTML(guia, 'COPIA REMITENTE')}
      <div style="width: 1px; border-left: 1px dashed #777; min-height: 380px; margin: 0 4px;"></div>
      ${renderGuiaHalfHTML(guia, 'COPIA CLIENTE')}
    </div>
  `;
}

export function generateGuiaHTML(guia) {
  const nroGuia = guia.nro_guia || 'GR001-0001';
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Guía de Remisión ${nroGuia}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 6mm;
        }
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      ${generateGuiaInnerSheetHTML(guia)}
export function openGuiaPDFInNewTab(guia) {
  const htmlContent = generateGuiaHTML(guia);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export function printGuiaPDF(guia) {
  const htmlContent = generateGuiaHTML(guia);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {}
    }, 400);
  }
}

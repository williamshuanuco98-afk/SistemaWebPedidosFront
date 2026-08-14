import { api } from '../api.js';
import { escapeHtml, formatDate } from '../helpers.js';

let currentAnularGuiaId = null;

export function setupDefaultGuiaDateFilters() {
  const dateFrom = document.getElementById('filterGuiaDateFrom');
  const dateTo = document.getElementById('filterGuiaDateTo');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  if (dateFrom && !dateFrom.value) {
    dateFrom.value = `${year}-${month}-01`;
  }
  if (dateTo && !dateTo.value) {
    dateTo.value = `${year}-${month}-${day}`;
  }
}

export function renderEnviosTable(shipments = []) {
  setupDefaultGuiaDateFilters();

  const tbody = document.getElementById('enviosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchQuery = (document.getElementById('searchGuiaInput')?.value || '').trim().toLowerCase();
  const dateFrom = document.getElementById('filterGuiaDateFrom')?.value;
  const dateTo = document.getElementById('filterGuiaDateTo')?.value;
  const establishment = document.getElementById('filterGuiaEstablishment')?.value || 'ALL';

  const filtered = shipments.filter(s => {
    const matchQuery = !searchQuery ||
      (s.nro_guia && s.nro_guia.toLowerCase().includes(searchQuery)) ||
      (s.nombre_cliente && s.nombre_cliente.toLowerCase().includes(searchQuery)) ||
      (s.nro_documento && String(s.nro_documento).toLowerCase().includes(searchQuery));

    let matchDate = true;
    if (s.fecha_guia) {
      if (dateFrom && s.fecha_guia < dateFrom) matchDate = false;
      if (dateTo && s.fecha_guia > dateTo) matchDate = false;
    }

    let matchEstab = true;
    if (establishment && establishment !== 'ALL') {
      const estab = (s.establecimiento || (s.nro_guia && s.nro_guia.startsWith('GR002') ? 'COMAS' : 'CARABAYLLO')).toUpperCase();
      matchEstab = estab.includes(establishment);
    }

    return matchQuery && matchDate && matchEstab;
  });

  const badge = document.getElementById('shipmentsCountBadge');
  if (badge) badge.textContent = `${filtered.length} guías`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No se encontraron guías registradas.</td></tr>`;
    return;
  }

  filtered.forEach(s => {
    const isAnulada = (s.estado === 'ANULADA');
    const estadoBadge = isAnulada
      ? `<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-x-circle me-1"></i> ANULADA</span>`
      : `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle me-1"></i> EMITIDA</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-bold text-primary">${escapeHtml(s.nro_guia || 'GR001-0000')}</td>
      <td>${formatDate(s.fecha_guia)}</td>
      <td>
        <div class="fw-semibold">${escapeHtml(s.nombre_cliente || 'Cliente')}</div>
        <div class="small text-muted">📍 ${escapeHtml(s.punto_llegada || s.direccion_destino || 'Sin dirección')}</div>
      </td>
      <td><span class="font-monospace fs-7">${escapeHtml(s.nro_documento || 'No registrado')}</span></td>
      <td>${estadoBadge}</td>
      <td class="text-center">
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" title="Visualizar en PDF" onclick="enviosModule.openPDF('${s.id_guia}')">
            <i class="bi bi-file-earmark-pdf"></i> Ver PDF
          </button>
          <button class="btn btn-outline-secondary" title="Imprimir Guía" onclick="enviosModule.printPDF('${s.id_guia}')">
            <i class="bi bi-printer"></i>
          </button>
          ${!isAnulada ? `
            <button class="btn btn-outline-danger" title="Dar de Baja / Anular Guía" onclick="enviosModule.openAnularModal('${s.id_guia}')">
              <i class="bi bi-slash-circle"></i> Anular
            </button>
          ` : `
            <button class="btn btn-outline-secondary" disabled title="Guía Anulada">
              <i class="bi bi-slash-circle"></i> Anulada
            </button>
          `}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export function openAnularModal(idGuia) {
  const shipments = window.app?.shipments || [];
  const guia = shipments.find(g => String(g.id_guia) === String(idGuia));
  if (!guia) return;

  currentAnularGuiaId = idGuia;

  const idInput = document.getElementById('anularGuiaIdInput');
  const nroLabel = document.getElementById('anularNroGuiaLabel');
  const motivoInput = document.getElementById('motivoAnulacionInput');

  if (idInput) idInput.value = idGuia;
  if (nroLabel) nroLabel.textContent = guia.nro_guia || '';
  if (motivoInput) motivoInput.value = '';

  const modalEl = document.getElementById('modalAnularGuia');
  if (modalEl) {
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  }
}

export async function confirmAnularGuia() {
  const idInput = document.getElementById('anularGuiaIdInput');
  const motivoInput = document.getElementById('motivoAnulacionInput');

  const idGuia = idInput?.value || currentAnularGuiaId;
  const motivo = (motivoInput?.value || '').trim();

  if (!motivo) {
    alert('Por favor ingrese detalladamente el motivo de anulación.');
    motivoInput?.focus();
    return;
  }

  try {
    const updated = await api.anularGuia(idGuia, motivo);
    if (window.app && Array.isArray(window.app.shipments)) {
      const idx = window.app.shipments.findIndex(g => String(g.id_guia) === String(idGuia));
      if (idx !== -1) {
        window.app.shipments[idx].estado = 'ANULADA';
        window.app.shipments[idx].motivo_anulacion = motivo;
      }
    }

    const modalEl = document.getElementById('modalAnularGuia');
    if (modalEl) {
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    }

    renderEnviosTable(window.app?.shipments || []);
    alert('La guía de remisión ha sido dada de baja correctamente.');

  } catch (err) {
    console.error("Error al anular guía:", err);
    alert('Ocurrió un error al procesar la baja de la guía.');
  }
}

export function openPDF(idGuia) {
  const shipments = window.app?.shipments || [];
  const guia = shipments.find(g => String(g.id_guia) === String(idGuia));
  if (guia) {
    openGuiaPDFInNewTab(guia);
  } else {
    alert('No se encontró la información de la guía seleccionada.');
  }
}

export function printPDF(idGuia) {
  const shipments = window.app?.shipments || [];
  const guia = shipments.find(g => String(g.id_guia) === String(idGuia));
  if (guia) {
    printGuiaPDF(guia);
  } else {
    alert('No se encontró la información de la guía seleccionada.');
  }
}

export function generateGuiaHTML(guia) {
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
      <td style="text-align: center; font-weight: bold; border: 1px solid #333; padding: 4px;">${idx + 1}</td>
      <td style="text-align: center; border: 1px solid #333; padding: 4px;">${escapeHtml(item.codigo_producto || '#'+item.id_producto)}</td>
      <td style="border: 1px solid #333; padding: 4px; font-weight: 500;">${escapeHtml(item.nombre_producto || 'Producto')}</td>
      <td style="text-align: center; font-weight: bold; border: 1px solid #333; padding: 4px;">${item.cantidad || 1}</td>
      <td style="text-align: center; border: 1px solid #333; padding: 4px;">UND</td>
    </tr>
  `).join('');

  const emptyStateHTML = `
    <tr>
      <td colspan="5" style="text-align: center; border: 1px solid #333; padding: 8px; color: #666;">Sin productos especificados</td>
    </tr>
  `;

  function renderHalf(copiaNombre) {
    return `
      <div class="guia-half" style="width: 48.5%; box-sizing: border-box; font-family: Arial, sans-serif; font-size: 10px; color: #111; position: relative;">
        ${isAnulada ? `<div style="position: absolute; top: 40%; left: 15%; transform: rotate(-30deg); font-size: 42px; font-weight: bold; color: rgba(220, 53, 69, 0.35); border: 4px solid rgba(220, 53, 69, 0.35); padding: 10px 20px; border-radius: 8px; z-index: 100;">GUÍA ANULADA</div>` : ''}

        <!-- Encabezado con Logo, Membrete y Recuadro RUC -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <tr>
            <td style="width: 20%; vertical-align: middle;">
              <img src="img/inplabel-logo.png" style="max-width: 100%; max-height: 48px;" alt="Inplabel Logo">
            </td>
            <td style="width: 55%; vertical-align: middle; padding-left: 6px; font-size: 8.5px; line-height: 1.2;">
              <strong style="font-size: 11px; color: #004085; display: block; margin-bottom: 1px;">INDUSTRIAS PLASTICOS BELSA S.A.C</strong>
              <div style="font-weight: bold; color: #333; font-size: 7.5px; margin-bottom: 2px;">DISEÑO, FABRICACIÓN Y COMERCIALIZACIÓN DE ENVASES PLÁSTICOS</div>
              <div>Contacto: 983 518 504 - 975 564 460</div>
              <div>www.inplabel.com.pe - ventas@inplabel.com.pe</div>
              <div style="font-size: 7.5px; color: #444; margin-top: 2px;">
                <strong>Principal:</strong> Av. Maria Parado de Belllido Lt. 5 Lotizacion Chacra Cerro - Comas - Lima - Lima<br>
                <strong>Sucursal:</strong> C.P. Las Piedritas Av. Las Piedritas Mz D Lt 9 - Carabayllo - Lima - Lima
              </div>
            </td>
            <td style="width: 25%; text-align: center; vertical-align: middle;">
              <div style="border: 2px solid #000; border-radius: 4px; padding: 6px 4px; background: #fff;">
                <div style="font-size: 9px; font-weight: bold;">RUC: 20544368827</div>
                <div style="font-size: 10px; font-weight: bold; margin: 2px 0;">GUÍA DE REMISIÓN ELECTRÓNICA</div>
                <div style="font-size: 11px; font-weight: bold; color: #c00;">${nroGuia}</div>
              </div>
              <div style="font-size: 7.5px; font-weight: bold; margin-top: 2px; text-transform: uppercase;">[ ${copiaNombre} ]</div>
            </td>
          </tr>
        </table>

        <!-- Datos del Cliente y Traslado -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; margin-bottom: 8px; font-size: 8.5px;">
          <tr>
            <td style="border: 1px solid #333; padding: 4px; width: 50%; background: #f9f9f9;">
              <strong>Señor(es):</strong> ${clienteNombre}
            </td>
            <td style="border: 1px solid #333; padding: 4px; width: 50%; background: #f9f9f9;">
              <strong>RUC / DNI:</strong> ${clienteRuc}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #333; padding: 4px;">
              <strong>Fecha Emisión:</strong> ${fechaStr}
            </td>
            <td style="border: 1px solid #333; padding: 4px;">
              <strong>Doc. Referencia:</strong> ${docRef}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border: 1px solid #333; padding: 4px;">
              <strong>Punto de Partida:</strong> ${puntoPartida}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border: 1px solid #333; padding: 4px;">
              <strong>Punto de Llegada:</strong> ${puntoLlegada}
            </td>
          </tr>
        </table>

        <!-- Tabla de Productos enviada: EXACTAMENTE el número de renglones agregados -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; margin-bottom: 6px; font-size: 8.5px;">
          <thead>
            <tr style="background: #e9ecef;">
              <th style="border: 1px solid #333; padding: 4px; width: 6%;">N°</th>
              <th style="border: 1px solid #333; padding: 4px; width: 18%;">Código</th>
              <th style="border: 1px solid #333; padding: 4px; width: 52%;">Descripción del Producto</th>
              <th style="border: 1px solid #333; padding: 4px; width: 14%;">Cantidad</th>
              <th style="border: 1px solid #333; padding: 4px; width: 10%;">U.M.</th>
            </tr>
          </thead>
          <tbody>
            ${detalles.length > 0 ? rowsHTML : emptyStateHTML}
          </tbody>
        </table>

        <!-- Cuadro Inferior de Observaciones -->
        <div style="border: 1px solid #333; padding: 4px; font-size: 8px; background: #fff; min-height: 28px;">
          <strong>Observaciones:</strong> ${observaciones}
        </div>
      </div>
    `;
  }

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
        .page-container {
          display: flex;
          justify-content: space-between;
          width: 100%;
          box-sizing: border-box;
        }
        .divider {
          width: 1px;
          border-left: 1px dashed #aaa;
          height: 100vh;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        ${renderHalf('COPIA REMITENTE')}
        <div class="divider"></div>
        ${renderHalf('COPIA CLIENTE')}
      </div>
    </body>
    </html>
  `;
}

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
      printWindow.print();
    }, 400);
  }
}

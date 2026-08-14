// Synchronous Embedded View Templates for 100% Offline / Local / Fetch-Proof Instant Rendering

const EMBEDDED_VIEWS = {
  dashboard: `
<!-- Top Metrics 5 KPI Grid -->
<div class="metrics-grid mb-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
  <div class="metric-card">
    <div class="metric-info">
      <h4>Total Pedidos</h4>
      <div id="statTotalOrders" class="metric-value">0</div>
    </div>
    <div class="metric-icon-box metric-blue">
      <i class="bi bi-cart3 fs-3"></i>
    </div>
  </div>

  <div class="metric-card">
    <div class="metric-info">
      <h4>Pedidos Pendientes</h4>
      <div id="statPendingOrders" class="metric-value">0</div>
    </div>
    <div class="metric-icon-box metric-amber">
      <i class="bi bi-clock-history fs-3"></i>
    </div>
  </div>

  <div class="metric-card">
    <div class="metric-info">
      <h4>Pedidos Entregados</h4>
      <div id="statCompletedOrders" class="metric-value">0</div>
    </div>
    <div class="metric-icon-box metric-emerald">
      <i class="bi bi-check2-circle fs-3"></i>
    </div>
  </div>

  <div class="metric-card">
    <div class="metric-info">
      <h4>Clientes Registrados</h4>
      <div id="statTotalClients" class="metric-value">0</div>
    </div>
    <div class="metric-icon-box metric-emerald">
      <i class="bi bi-people fs-3"></i>
    </div>
  </div>

  <div class="metric-card">
    <div class="metric-info">
      <h4>Productos Totales</h4>
      <div id="statTotalProducts" class="metric-value">0</div>
    </div>
    <div class="metric-icon-box metric-indigo">
      <i class="bi bi-box-seam fs-3"></i>
    </div>
  </div>
</div>

<!-- Charts Section Row 1 -->
<div class="row g-4 mb-4">
  <div class="col-lg-6">
    <div class="content-card p-3 h-100">
      <div class="card-header border-0 pb-0 bg-transparent">
        <h3 class="card-title d-flex align-items-center">
          <i class="bi bi-bar-chart-line-fill text-primary"></i>
          <span>Clientes Mayores Solicitantes (Ingresos S/)</span>
        </h3>
      </div>
      <div class="p-3" style="height: 280px; position: relative;">
        <canvas id="chartTopClients"></canvas>
      </div>
    </div>
  </div>

  <div class="col-lg-6">
    <div class="content-card p-3 h-100">
      <div class="card-header border-0 pb-0 bg-transparent">
        <h3 class="card-title d-flex align-items-center">
          <i class="bi bi-bar-chart-steps text-success"></i>
          <span>Cantidad de Pedidos al Mes</span>
        </h3>
      </div>
      <div class="p-3" style="height: 280px; position: relative;">
        <canvas id="chartMonthlyOrders"></canvas>
      </div>
    </div>
  </div>
</div>

<!-- Charts Section Row 2 & Recent Orders -->
<div class="row g-4">
  <div class="col-lg-5">
    <div class="content-card p-3 h-100">
      <div class="card-header border-0 pb-0 bg-transparent">
        <h3 class="card-title d-flex align-items-center">
          <i class="bi bi-award-fill text-warning"></i>
          <span>Productos Más Pedidos</span>
        </h3>
      </div>
      <div class="p-3" style="height: 280px; position: relative;">
        <canvas id="chartTopProducts"></canvas>
      </div>
    </div>
  </div>

  <div class="col-lg-7">
    <div class="content-card h-100">
      <div class="card-header bg-transparent">
        <h3 class="card-title d-flex align-items-center">
          <i class="bi bi-cart3 text-primary"></i>
          <span>Últimos Pedidos Registrados</span>
        </h3>
        <button class="btn btn-sm btn-outline-secondary" onclick="app.navigateTo('pedidos')">Ver Todos</button>
      </div>
      <div class="table-responsive">
        <table class="table custom-table mb-0">
          <thead>
            <tr>
              <th>N° Pedido</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody id="dashOrdersTable"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>
`,

  pedidos: `
<div class="content-card">
  <!-- Cabecera de la Vista -->
  <div class="card-header flex-wrap gap-2">
    <div class="d-flex align-items-center gap-2">
      <h3 class="card-title mb-0"><i class="bi bi-cart-check text-primary"></i> Listado de Pedidos</h3>
      <span id="ordersCountBadge" class="badge bg-secondary">0 pedidos</span>
    </div>
    <div class="d-flex align-items-center gap-2">
      <button class="btn btn-primary" onclick="app.navigateTo('nuevo-pedido')">
        <i class="bi bi-plus-lg me-1"></i> Ingresar Pedido
      </button>
    </div>
  </div>

  <!-- Barra de Búsqueda y Filtros de Pedidos -->
  <div class="p-3 bg-body-tertiary border-bottom">
    <form id="formSearchPedidos" onsubmit="event.preventDefault(); app.triggerPedidosSearch();">
      <div class="row g-2 align-items-end">
        <!-- Buscador por Nombre del Cliente o N° Orden -->
        <div class="col-md-4">
          <label for="searchClientNameInput" class="form-label small fw-bold mb-1">Cliente o N° de Orden</label>
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="text" id="searchClientNameInput" class="form-control"
              placeholder="Buscar cliente o N° orden (Enter)...">
          </div>
        </div>

        <!-- Fecha Desde -->
        <div class="col-md-2">
          <label for="filterDateFrom" class="form-label small fw-bold mb-1">Desde</label>
          <input type="date" id="filterDateFrom" class="form-control form-control-sm">
        </div>

        <!-- Fecha Hasta -->
        <div class="col-md-2">
          <label for="filterDateTo" class="form-label small fw-bold mb-1">Hasta</label>
          <input type="date" id="filterDateTo" class="form-control form-control-sm">
        </div>

        <!-- Seleccionador de Establecimiento (2 opciones) -->
        <div class="col-md-2">
          <label for="filterEstablishment" class="form-label small fw-bold mb-1">Establecimiento</label>
          <select id="filterEstablishment" class="form-select form-select-sm">
            <option value="ALL">Todos los locales</option>
            <option value="COMAS">Planta Principal - Comas</option>
            <option value="CARABAYLLO">Sucursal - Carabayllo</option>
          </select>
        </div>

        <!-- Botón de Búsqueda -->
        <div class="col-md-2">
          <button type="submit" class="btn btn-primary btn-sm w-100">
            <i class="bi bi-search me-1"></i> Buscar
          </button>
        </div>
      </div>
    </form>
  </div>

  <!-- Tabla de Pedidos -->
  <div class="table-responsive">
    <table class="table custom-table mb-0">
      <thead>
        <tr>
          <th>N° Pedido</th>
          <th>N° Orden</th>
          <th>Cliente / Razón Social</th>
          <th>Fecha Pedido</th>
          <th>Establecimiento</th>
          <th>Estado</th>
          <th class="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody id="pedidosTableBody"></tbody>
    </table>
  </div>
</div>

<!-- Modal Finalizar Orden -->
<div class="modal fade" id="modalFinalizarOrden" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0 shadow">
      <div class="modal-header bg-body-tertiary">
        <h5 class="modal-title fw-bold text-primary">
          <i class="bi bi-flag-fill me-2"></i>Finalizar Orden <span id="finalizarOrderNroBadge" class="badge bg-secondary ms-1"></span>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-4">
        <form id="formFinalizarOrden" onsubmit="event.preventDefault(); pedidosModule.saveFinalizarOrden();">
          <input type="hidden" id="finalizarOrderId">
          
          <div class="alert alert-warning d-flex align-items-center mb-3">
            <i class="bi bi-exclamation-triangle-fill fs-4 me-3 text-warning"></i>
            <div>
              <strong>¿Está seguro de finalizar esta orden?</strong><br>
              Seleccione la resolución final del pedido:
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold mb-2">Resolución de la Orden *</label>
            <div class="d-flex gap-4">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="finalizarStatusOption" id="optCompletado" value="ENTREGADO" checked onchange="pedidosModule.toggleFinalizarFields('ENTREGADO')">
                <label class="form-check-label fw-semibold text-success" for="optCompletado">
                  <i class="bi bi-check-circle-fill me-1"></i> Orden Entregada (COMPLETADA)
                </label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="finalizarStatusOption" id="optCancelado" value="CANCELADO" onchange="pedidosModule.toggleFinalizarFields('CANCELADO')">
                <label class="form-check-label fw-semibold text-danger" for="optCancelado">
                  <i class="bi bi-x-circle-fill me-1"></i> Orden Cancelada (CANCELADO)
                </label>
              </div>
            </div>
          </div>

          <div id="finalizarDeliveryFields" class="card card-body bg-body-tertiary border-0 mb-3">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label fw-semibold fs-7">N° de Guía de Remisión *</label>
                <input type="text" id="finalizarNroGuia" class="form-control form-control-sm" placeholder="Ej: GUI-001-0458">
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold fs-7">Fecha de Entrega *</label>
                <input type="date" id="finalizarFechaEntrega" class="form-control form-control-sm">
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm px-3">
              <i class="bi bi-save me-1"></i> Confirmar y Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<!-- Modal Registrar Envío -->
<div class="modal fade" id="modalRegistrarEnvio" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content border-0 shadow">
      <div class="modal-header bg-body-tertiary">
        <h5 class="modal-title fw-bold text-primary">
          <i class="bi bi-truck me-2"></i>Registrar Envío de Pedido <span id="envioOrderNroBadge" class="badge bg-secondary ms-1"></span>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-4">
        <form id="formRegistrarEnvio" onsubmit="event.preventDefault(); pedidosModule.saveRegistrarEnvio();">
          <input type="hidden" id="envioOrderId">
          <input type="hidden" id="envioClientId">

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">N° de Guía de Remisión *</label>
              <input type="text" id="envioNroGuia" class="form-control" placeholder="Ej: G001-000458" required>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Fecha del Envío *</label>
              <input type="date" id="envioFechaGuia" class="form-control" required>
            </div>
          </div>

          <h6 class="fw-bold mt-4 mb-2 text-secondary"><i class="bi bi-box-seam me-1"></i> Cantidad de Productos Enviados en esta Entrega:</h6>
          <div class="table-responsive border rounded mb-3">
            <table class="table custom-table table-sm align-middle mb-0">
              <thead class="bg-body-tertiary">
                <tr>
                  <th>Código / Producto</th>
                  <th class="text-center">Cant. Solicitada</th>
                  <th class="text-center">Entregado Previo</th>
                  <th class="text-center" style="width: 150px;">Cant. a Enviar Ahora *</th>
                </tr>
              </thead>
              <tbody id="envioProductsTableBody"></tbody>
            </table>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-warning btn-sm text-dark fw-bold px-3">
              <i class="bi bi-truck me-1"></i> Guardar Envío
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
`,

  'nuevo-pedido': `
<div class="content-card">
  <div class="card-header d-flex justify-content-between align-items-center">
    <div class="d-flex align-items-center gap-3">
      <button class="btn btn-outline-secondary btn-sm" onclick="app.confirmLeaveNuevoPedido()">
        <i class="bi bi-arrow-left"></i> Volver a Pedidos
      </button>
      <h3 class="card-title mb-0">
        <i class="bi bi-cart-plus text-primary"></i> Registrar Nuevo Pedido
      </h3>
    </div>
    <div>
      <span class="badge bg-primary fs-7">Operaciones Inplabel</span>
    </div>
  </div>

  <div class="p-4">
    <form id="formNuevoPedido" onsubmit="event.preventDefault();">
      <div class="row g-4">
        <div class="col-12">
          <div class="card shadow-sm border">
            <div class="card-header bg-body-tertiary">
              <h5 class="card-title text-primary mb-0 fs-6">
                <i class="bi bi-person-vcard me-2"></i>1. Datos del Cliente y Orden
              </h5>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-12 position-relative">
                  <label for="searchClientInput" class="form-label fw-bold">
                    Cliente / Razón Social o RUC <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" id="searchClientInput" class="form-control form-control-lg fs-6"
                      placeholder="Escriba RUC o Razón Social (mínimo 3 caracteres)..." autocomplete="off">
                  </div>
                  <ul id="clientSearchResultsList" class="list-group position-absolute w-100 shadow mt-1 d-none"
                    style="z-index: 1050; max-height: 600px; overflow-y: auto;"></ul>
                </div>

                <div class="col-md-2">
                  <label for="establecimientoSelect" class="form-label fw-bold fs-7">
                    Establecimiento <span class="text-danger">*</span>
                  </label>
                  <select id="establecimientoSelect" class="form-select fs-7 px-2">
                    <option value="CARABAYLLO" selected>Sucursal - Carabayllo</option>
                    <option value="COMAS">Planta Principal - Comas</option>
                  </select>
                </div>

                <div class="col-md-2">
                  <label for="nroOrdenCompraInput" class="form-label fw-bold fs-7">N° Orden de Compra</label>
                  <input type="text" id="nroOrdenCompraInput" class="form-control fs-7" placeholder="Ej: OC-2026-089">
                </div>

                <div class="col-md-2">
                  <label for="condicionPagoSelect" class="form-label fw-bold fs-7">
                    Condición de Pago <span class="text-danger">*</span>
                  </label>
                  <select id="condicionPagoSelect" class="form-select fs-7"
                    onchange="nuevoPedidoModule.onCondicionPagoChange(this.value)">
                    <option value="CONTADO" selected>Contado</option>
                    <option value="CREDITO">Crédito</option>
                    <option value="FACTURA_NEGOCIABLE">Factura Negociable</option>
                    <option value="LETRAS">Letras</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>

                <div class="col-md-2" id="diasCreditoContainer">
                  <label for="diasCreditoInput" class="form-label fw-bold fs-7">
                    Días de Crédito <span class="text-danger">*</span>
                  </label>
                  <input type="number" id="diasCreditoInput" class="form-control fs-7" placeholder="0" min="0" value="0" disabled>
                </div>

                <div class="col-md-2">
                  <label for="fechaIngresoInput" class="form-label fw-bold fs-7">Fecha de Ingreso</label>
                  <input type="date" id="fechaIngresoInput" class="form-control fs-7 px-1">
                </div>

                <div class="col-md-2">
                  <label for="fechaEntregaInput" class="form-label fw-bold fs-7">Fecha de Entrega</label>
                  <input type="date" id="fechaEntregaInput" class="form-control fs-7 px-1">
                </div>

                <div class="col-12 pt-3 border-top mt-3">
                  <div class="d-flex justify-content-between align-items-center bg-body-tertiary p-3 rounded border">
                    <div class="d-flex align-items-center gap-2">
                      <i class="bi bi-wallet2 text-primary fs-5"></i>
                      <div>
                        <strong class="d-block text-primary fs-7">Adelantos de Pago</strong>
                        <span class="text-muted small">(Opcional - Presione el botón para registrar abonos o pagos por adelantado)</span>
                      </div>
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-sm px-3"
                      onclick="nuevoPedidoModule.openAdelantoModal()">
                      <i class="bi bi-plus-circle me-1"></i> Agregar Adelanto
                    </button>
                  </div>

                  <div id="containerAdelantosTabla" class="table-responsive mt-3 d-none">
                    <table class="table table-sm custom-table mb-0 border">
                      <thead>
                        <tr>
                          <th>Fecha Pago</th>
                          <th>Banco</th>
                          <th>N° Operación / Voucher</th>
                          <th class="text-end">Monto (S/)</th>
                          <th class="text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody id="tableAdelantosBody"></tbody>
                      <tfoot>
                        <tr class="table-active">
                          <td colspan="3" class="text-end fw-bold">Total Adelantado:</td>
                          <td class="text-end fw-bold text-success" id="totalAdelantoCell">S/ 0.00</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="card shadow-sm border">
            <div class="card-header bg-body-tertiary">
              <h5 class="card-title text-primary mb-0 fs-6">
                <i class="bi bi-box-seam me-2"></i>2. Búsqueda y Selección de Productos
              </h5>
            </div>
            <div class="card-body">
              <div class="position-relative mb-3">
                <label for="searchProductInput" class="form-label fw-bold">
                  Buscar Producto / Insumo <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-search"></i></span>
                  <input type="text" id="searchProductInput" class="form-control"
                    placeholder="Escriba nombre o código del producto (mínimo 3 caracteres)..." autocomplete="off">
                </div>
                <ul id="productSearchResultsList" class="list-group position-absolute w-100 shadow mt-1 d-none"
                  style="z-index: 1050; max-height: 600px; overflow-y: auto;"></ul>
              </div>

              <div class="table-responsive border rounded mt-3">
                <table class="table custom-table mb-0">
                  <thead>
                    <tr>
                      <th style="width: 110px;">Código</th>
                      <th>Producto / Insumo Solicitado</th>
                      <th style="width: 140px;">Cantidad</th>
                      <th class="text-center" style="width: 90px;">Acción</th>
                    </tr>
                  </thead>
                  <tbody id="tableProductosBody">
                    <tr>
                      <td colspan="4" class="text-center text-muted py-4">No se han agregado productos a la tabla.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="card shadow-sm border">
            <div class="card-header bg-body-tertiary">
              <h5 class="card-title text-primary mb-0 fs-6">
                <i class="bi bi-journal-text me-2"></i>3. Observaciones y Documentos Adjuntos
              </h5>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label for="observacionesInput" class="form-label fw-bold">Observaciones del Pedido</label>
                  <textarea id="observacionesInput" class="form-control" rows="4"
                    placeholder="Escriba aquí cualquier comentario u observación relevante..."></textarea>
                </div>

                <div class="col-md-6">
                  <label for="archivosAdjuntosInput" class="form-label fw-bold">
                    <i class="bi bi-paperclip me-1"></i>Agregar Documentos Adjuntos
                  </label>
                  <input type="file" id="archivosAdjuntosInput" class="form-control" multiple
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx"
                    onchange="nuevoPedidoModule.handleFilesAttached(this.files)">
                  <span class="form-text fs-7 text-muted d-block mt-1">
                    Adjunte archivos relevantes como Orden de Compra en PDF, bocetos o fichas técnicas.
                  </span>
                  <div id="listaArchivosAdjuntos" class="mt-3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 d-flex justify-content-end gap-3 pt-2">
          <button type="button" class="btn btn-outline-secondary px-4" onclick="app.confirmLeaveNuevoPedido()">
            <i class="bi bi-x-circle me-1"></i> Cancelar
          </button>
          <button type="button" id="btnGuardarPedido" class="btn btn-primary px-4"
            onclick="nuevoPedidoModule.submitNuevoPedido()">
            <i class="bi bi-check-circle me-1"></i> Guardar Pedido
          </button>
        </div>
      </div>
    </form>
  </div>
</div>
`,

  envios: `
<div class="content-card">
  <div class="card-header flex-wrap gap-2">
    <div class="d-flex align-items-center gap-2">
      <h3 class="card-title mb-0"><i class="bi bi-truck text-primary"></i> Guías y Envíos</h3>
      <span id="shipmentsCountBadge" class="badge bg-secondary">0</span>
    </div>
  </div>

  <div class="table-responsive">
    <table class="table custom-table mb-0">
      <thead>
        <tr>
          <th>N° Guía</th>
          <th>Cliente y Destino</th>
          <th>Fecha Guía</th>
          <th>Estado</th>
          <th class="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody id="enviosTableBody"></tbody>
    </table>
  </div>
</div>
`,

  clientes: `
<div class="content-card">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h3 class="card-title mb-0"><i class="bi bi-people text-primary me-1"></i> Directorio de Clientes (MySQL)</h3>
    <button class="btn btn-primary btn-sm" onclick="clientesModule.openNewClientModal()">
      <i class="bi bi-person-plus me-1"></i> Registrar Cliente
    </button>
  </div>

  <div class="p-3 bg-body-tertiary border-bottom">
    <div class="input-group">
      <span class="input-group-text"><i class="bi bi-search"></i></span>
      <input type="text" id="searchClientesInput" class="form-control"
        placeholder="Buscar por RUC/DNI, Razón Social o Dirección..."
        oninput="clientesModule.filterClientes(this.value)">
    </div>
  </div>
  <div class="table-responsive">
    <table class="table custom-table mb-0">
      <thead>
        <tr>
          <th>Documento</th>
          <th>Razón Social / Nombre</th>
          <th>Dirección Fiscal</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody id="clientesTableBody"></tbody>
    </table>
  </div>
</div>

<div class="modal fade" id="modalCliente" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title fw-bold"><i class="bi bi-person-plus me-2 text-primary"></i>Registrar Cliente</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <form id="formCliente" onsubmit="event.preventDefault(); clientesModule.saveClientFromModal();">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label fw-semibold">Tipo Doc. *</label>
              <select id="modalClienteTipoDoc" class="form-select" onchange="clientesModule.onTipoDocChange(this.value)">
                <option value="RUC" selected>RUC (11 dígitos)</option>
                <option value="DNI">DNI (8 dígitos)</option>
              </select>
            </div>
            <div class="col-md-8">
              <label class="form-label fw-semibold">N° Documento *</label>
              <div class="input-group">
                <input type="text" id="modalClienteNroDoc" class="form-control" placeholder="Ingrese 11 dígitos de RUC"
                  maxlength="11" required oninput="clientesModule.onNroDocInput(this.value)">
                <button type="button" class="btn btn-outline-primary" id="btnConsultarSunat" onclick="clientesModule.consultarSunatManual()">
                  <i class="bi bi-search me-1"></i> SUNAT
                </button>
              </div>
              <div id="sunatStatusFeedback" class="form-text mt-1 text-muted fs-8">
                Escriba 11 dígitos para consultar SUNAT automáticamente.
              </div>
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold">Razón Social / Nombre Completo *</label>
              <input type="text" id="modalClienteRazonSocial" class="form-control" placeholder="Razón social del cliente" required>
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold">Dirección Fiscal</label>
              <input type="text" id="modalClienteDireccion" class="form-control" placeholder="Dirección fiscal devuelta por SUNAT">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="bi bi-save me-1"></i> Guardar Cliente</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
`,

  productos: `
<div class="content-card">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h3 class="card-title mb-0"><i class="bi bi-box-seam text-primary me-1"></i> Catálogo de Productos (MySQL)</h3>
    <button class="btn btn-primary btn-sm" onclick="productosModule.openNewProductModal()">
      <i class="bi bi-plus-lg me-1"></i> Registrar Producto
    </button>
  </div>

  <div class="p-3 bg-body-tertiary border-bottom">
    <div class="input-group">
      <span class="input-group-text"><i class="bi bi-search"></i></span>
      <input type="text" id="searchProductosInput" class="form-control"
        placeholder="Buscar por ID (#438), Nombre de producto o Tipo/Categoría..."
        oninput="productosModule.filterProductos(this.value)">
    </div>
  </div>

  <div class="table-responsive">
    <table class="table custom-table mb-0">
      <thead>
        <tr>
          <th style="width: 90px;">ID</th>
          <th>Nombre del Producto / Insumo</th>
          <th>Tipo de Producto</th>
          <th style="width: 100px;">Estado</th>
          <th style="width: 130px;" class="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody id="productosTableBody"></tbody>
    </table>
  </div>
</div>

<div class="modal fade" id="modalProducto" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title fw-bold" id="modalProductoTitle"><i class="bi bi-box-seam me-2"></i>Registrar Producto</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <form id="formProducto" onsubmit="event.preventDefault(); productosModule.saveProductFromModal();">
          <input type="hidden" id="modalProductoId">
          <div class="mb-3">
            <label class="form-label fw-semibold">Nombre del Producto / Insumo *</label>
            <input type="text" id="modalProductoNombre" class="form-control" placeholder="Ej. BALDE INDUSTRIAL 4 LT C/BLANCO" required>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Tipo / Categoría de Producto *</label>
            <select id="modalProductoTipo" class="form-select" required>
              <option value="" disabled selected>-- Seleccione una categoría --</option>
              <option value="FRASCOS">FRASCOS</option>
              <option value="GALONES">GALONES</option>
              <option value="TAPAS">TAPAS</option>
              <option value="ASAS">ASAS</option>
              <option value="PRODUCTOS COMPLEMENTARIOS">PRODUCTOS COMPLEMENTARIOS</option>
            </select>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="bi bi-save me-1"></i> Guardar Producto</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
`,

  produccion: `
<div class="content-card">
  <div class="card-header flex-wrap gap-2">
    <div class="d-flex align-items-center gap-2">
      <h3 class="card-title mb-0"><i class="bi bi-gear-wide-connected text-primary"></i> Control de Producción</h3>
      <span id="produccionCountBadge" class="badge bg-secondary">0 productos</span>
    </div>
  </div>

  <div class="p-3">
    <div class="metrics-grid mb-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
      <div class="metric-card">
        <div class="metric-info">
          <h4>Ítems Distintos</h4>
          <div id="statProdItemsCount" class="metric-value text-primary">0</div>
        </div>
        <div class="metric-icon-box metric-blue">
          <i class="bi bi-box-seam fs-3"></i>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <h4>Unidades Solicitadas</h4>
          <div id="statProdTotalSolicitado" class="metric-value">0</div>
        </div>
        <div class="metric-icon-box metric-indigo">
          <i class="bi bi-cart-check fs-3"></i>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <h4>Unidades Entregadas</h4>
          <div id="statProdTotalEntregado" class="metric-value text-success">0</div>
        </div>
        <div class="metric-icon-box metric-emerald">
          <i class="bi bi-check2-circle fs-3"></i>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <h4>Unidades Pendientes</h4>
          <div id="statProdTotalPendiente" class="metric-value text-warning">0</div>
        </div>
        <div class="metric-icon-box metric-amber">
          <i class="bi bi-clock-history fs-3"></i>
        </div>
      </div>
    </div>

    <div class="row g-2 align-items-center mb-3">
      <div class="col-md-6 col-12">
        <div class="input-group input-group-sm">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="text" id="searchProduccionInput" class="form-control"
            placeholder="Buscar por código o nombre de producto en pedidos..." oninput="produccionModule.onSearchInput(this.value)">
        </div>
      </div>
      <div class="col-md-6 col-12 text-md-end text-muted small">
        <i class="bi bi-info-circle me-1"></i> Muestra el acumulado de productos solicitados en las órdenes registradas.
      </div>
    </div>

    <div class="table-responsive border rounded">
      <table class="table custom-table align-middle mb-0">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre del Producto</th>
            <th class="text-center">Total Solicitado</th>
            <th class="text-center">Total Entregado</th>
            <th class="text-center">Total Pendiente</th>
            <th class="text-center">Clientes</th>
            <th class="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody id="produccionTableBody"></tbody>
      </table>
    </div>
  </div>
</div>
`,

  config: `
<div class="row g-4 mb-4">
  <div class="col-md-6">
    <div class="content-card p-4 h-100">
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="p-3 rounded-circle bg-success bg-opacity-10 text-success">
          <i class="bi bi-palette-fill fs-3"></i>
        </div>
        <div>
          <h2 class="h5 fw-bold mb-1">Apariencia del Sistema</h2>
          <p class="text-muted small mb-0">Personaliza la interfaz del sistema Inplabel</p>
        </div>
      </div>
      <hr>
      <div class="d-flex align-items-center justify-content-between p-3 rounded border">
        <div>
          <strong class="d-block mb-1">Tema de Color</strong>
          <span class="text-muted small">Alterna entre Modo Claro minimalista y Modo Oscuro Carbon</span>
        </div>
        <button id="configThemeToggleBtn" class="btn btn-outline-success d-flex align-items-center gap-2" onclick="app.toggleTheme()">
          <i id="configThemeIcon" class="bi bi-moon-stars-fill"></i>
          <span id="configThemeText">Cambiar Tema</span>
        </button>
      </div>
    </div>
  </div>

  <div class="col-md-6">
    <div class="content-card p-4 h-100">
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="p-3 rounded-circle bg-warning bg-opacity-10 text-warning-emphasis">
          <i class="bi bi-folder-symlink-fill fs-3"></i>
        </div>
        <div>
          <h2 class="h5 fw-bold mb-1">Ruta de Almacenamiento de Archivos PDF</h2>
          <p class="text-muted small mb-0">Especifica en qué carpeta local o de servidor se guardarán los documentos</p>
        </div>
      </div>
      <hr>
      <form onsubmit="event.preventDefault(); configModule.saveStorageConfig();">
        <div class="mb-3">
          <label for="pdfFolderPathInput" class="form-label fw-semibold fs-7">Ruta de Carpeta de Destino (Path Local / Servidor) *</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-folder2-open"></i></span>
            <input type="text" id="pdfFolderPathInput" class="form-control" placeholder="Ej: C:\\Users\\User\\OneDrive\\Escritorio\\OrdenesI" required>
          </div>
          <div class="form-text fs-8">Ruta absoluta en el disco local o servidor donde se guardarán copias de los PDF adjuntos.</div>
        </div>

        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="pdfSubfolderCheckbox">
          <label class="form-check-label fw-semibold fs-7" for="pdfSubfolderCheckbox">
            Organizar automáticamente en subcarpetas por N° de Pedido (ej. <code>/PED-0001/</code>)
          </label>
        </div>

        <div id="storageConfigFeedback" class="mb-3 d-none"></div>

        <div class="d-flex justify-content-end">
          <button type="submit" class="btn btn-primary btn-sm px-3">
            <i class="bi bi-save me-1"></i> Guardar Ruta de Almacenamiento
          </button>
        </div>
      </form>
    </div>
  </div>

  <div class="col-md-12">
    <div class="content-card p-4">
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="p-3 rounded-circle bg-primary bg-opacity-10 text-primary">
          <i class="bi bi-server fs-3"></i>
        </div>
        <div>
          <h2 class="h5 fw-bold mb-1">Estado del Servidor & Base de Datos</h2>
          <p class="text-muted small mb-0">API REST Spring Boot 3.2.5 + MySQL 8.0</p>
        </div>
      </div>
      <hr>
      <div class="row g-3">
        <div class="col-md-3">
          <div class="p-3 bg-light rounded border">
            <span class="small text-muted d-block font-monospace">ESTADO CONEXIÓN</span>
            <span class="badge bg-success mt-1">MySQL CONECTADO</span>
          </div>
        </div>
        <div class="col-md-3">
          <div class="p-3 bg-light rounded border">
            <span class="small text-muted d-block font-monospace">ENDPOINT API</span>
            <span class="small fw-semibold text-primary">http://localhost:8080/api</span>
          </div>
        </div>
        <div class="col-md-3">
          <div class="p-3 bg-light rounded border">
            <span class="small text-muted d-block font-monospace">CLIENTES REGISTRADOS</span>
            <strong id="bdClientsCount" class="fs-6 text-primary">342 Clientes</strong>
          </div>
        </div>
        <div class="col-md-3">
          <div class="p-3 bg-light rounded border">
            <span class="small text-muted d-block font-monospace">CATÁLOGO PRODUCTOS</span>
            <strong id="bdProductsCount" class="fs-6 text-success">804 Productos</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`,

  bd: `
<div class="content-card p-4 mb-4">
  <div class="d-flex align-items-center justify-content-between mb-3">
    <div class="d-flex align-items-center gap-3">
      <i class="bi bi-database-check text-primary fs-1"></i>
      <div>
        <h2 class="h4 fw-bold mb-1">Backend Spring Boot 3.2.5: Base de Datos 'inplabel'</h2>
        <p class="text-muted small mb-0">API REST disponible en http://localhost:8080/api</p>
      </div>
    </div>
    <span class="badge bg-success py-2 px-3">CONECTADO A MYSQL 8.0</span>
  </div>

  <div class="row g-3">
    <div class="col-md-4">
      <div class="p-3 bg-light rounded border">
        <span class="small text-muted d-block font-monospace">MOTOR BACKEND</span>
        <strong class="fs-6">Spring Boot + Spring Web + HikariCP</strong>
      </div>
    </div>
    <div class="col-md-4">
      <div class="p-3 bg-light rounded border">
        <span class="small text-muted d-block font-monospace">CLIENTES MYSQL</span>
        <strong id="bdClientsCount" class="fs-6 text-primary">341 Clientes</strong>
      </div>
    </div>
    <div class="col-md-4">
      <div class="p-3 bg-light rounded border">
        <span class="small text-muted d-block font-monospace">PRODUCTOS MYSQL</span>
        <strong id="bdProductsCount" class="fs-6 text-success">706 Productos</strong>
      </div>
    </div>
  </div>
</div>
`
};

export class Router {
  constructor(onRouteRender) {
    this.currentRoute = 'dashboard';
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
      produccion: '<i class="bi bi-gear-wide-connected text-primary"></i> Control de Producción',
      config: '<i class="bi bi-gear-fill text-primary"></i> Configuración del Sistema',
      bd: '<i class="bi bi-database-check text-primary"></i> Estado Base de Datos'
    };

    const titleElem = document.getElementById('pageTitle');
    if (titleElem) titleElem.innerHTML = titles[route] || 'INPLABEL Pedidos';

    const container = document.getElementById('viewContainer');
    if (!container) return;

    // Use synchronous embedded views for 100% reliability with zero fetch delay or CORS errors
    if (EMBEDDED_VIEWS[route]) {
      container.innerHTML = EMBEDDED_VIEWS[route];
    } else {
      try {
        const res = await fetch(`views/${route}.html`);
        if (res.ok) {
          container.innerHTML = await res.text();
        }
      } catch (e) {
        console.warn("Fetch route error:", e);
      }
    }

    if (typeof this.onRouteRender === 'function') {
      try {
        this.onRouteRender(route);
      } catch (err) {
        console.error(`Error rendering route ${route}:`, err);
      }
    }
  }
}

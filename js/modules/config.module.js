const DEFAULT_STORAGE_PATH = 'C:\\Users\\User\\OneDrive\\Escritorio\\OrdenesI';

export function renderConfigView(clientsCount = 0, productsCount = 0) {
  const bdClients = document.getElementById('bdClientsCount');
  const bdProducts = document.getElementById('bdProductsCount');

  if (bdClients) bdClients.textContent = `${clientsCount} Clientes`;
  if (bdProducts) bdProducts.textContent = `${productsCount} Productos`;

  // Load saved storage path configuration
  const savedPath = localStorage.getItem('inplabel_pdf_storage_path') || DEFAULT_STORAGE_PATH;
  const savedSubfolders = localStorage.getItem('inplabel_pdf_subfolders') === 'true';

  const pathInput = document.getElementById('pdfFolderPathInput');
  const subfolderCheck = document.getElementById('pdfSubfolderCheckbox');

  if (pathInput) pathInput.value = savedPath;
  if (subfolderCheck) subfolderCheck.checked = savedSubfolders;
}

export function saveStorageConfig() {
  const pathInput = document.getElementById('pdfFolderPathInput');
  const subfolderCheck = document.getElementById('pdfSubfolderCheckbox');
  const feedback = document.getElementById('storageConfigFeedback');

  const newPath = (pathInput?.value || '').trim();
  if (!newPath) {
    alert('Por favor ingrese una ruta de carpeta válida.');
    return;
  }

  const useSubfolders = subfolderCheck ? subfolderCheck.checked : true;

  localStorage.setItem('inplabel_pdf_storage_path', newPath);
  localStorage.setItem('inplabel_pdf_subfolders', useSubfolders);

  if (feedback) {
    feedback.className = 'alert alert-success d-flex align-items-center py-2 px-3 fs-7 mb-3';
    feedback.innerHTML = `<i class="bi bi-check-circle-fill me-2 fs-5"></i><div><strong>¡Ruta guardada exitosamente!</strong><br>Los archivos PDF se organizarán en: <code>${newPath}</code></div>`;
    feedback.classList.remove('d-none');

    setTimeout(() => {
      feedback.classList.add('d-none');
    }, 5000);
  }
}
